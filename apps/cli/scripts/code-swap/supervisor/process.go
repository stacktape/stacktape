package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type processInfo struct {
	pid, parent, group int
	start              string
	zombie             bool
}

func processAt(pid int) (processInfo, bool) {
	b, err := os.ReadFile(filepath.Join("/proc", strconv.Itoa(pid), "stat"))
	if err != nil {
		return processInfo{}, false
	}
	end := strings.LastIndex(string(b), ")")
	if end < 0 {
		return processInfo{}, false
	}
	f := strings.Fields(string(b)[end+1:])
	if len(f) < 20 {
		return processInfo{}, false
	}
	parent, _ := strconv.Atoi(f[1])
	group, _ := strconv.Atoi(f[2])
	return processInfo{pid, parent, group, f[19], f[0] == "Z"}, true
}

func isProcessLeader(pid int) bool {
	b, err := os.ReadFile(filepath.Join("/proc", strconv.Itoa(pid), "status"))
	if err != nil {
		return false
	}
	for _, line := range strings.Split(string(b), "\n") {
		f := strings.Fields(line)
		if len(f) == 2 && f[0] == "Tgid:" {
			return f[1] == strconv.Itoa(pid)
		}
	}
	return false
}

func score(pid, value int) error {
	path := fmt.Sprintf("/proc/%d/oom_score_adj", pid)
	if err := os.WriteFile(path, []byte(strconv.Itoa(value)), 0600); err != nil {
		return err
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if strings.TrimSpace(string(b)) != strconv.Itoa(value) {
		return fmt.Errorf("OOM score verification failed")
	}
	return nil
}

func (u *generation) members() (map[int]processInfo, error) {
	u.treeMu.Lock()
	defer u.treeMu.Unlock()
	// Membership is registered at kernel fork events before either process can
	// run on. Do not infer ownership from a reusable pgid or from orphan adoption.

	if !u.traced.Load() {
		// While idle, track the live process group and descendants. Exact start
		// times prevent PID reuse; candidates use kernel fork-event ownership.
		known := map[int]processInfo{}
		for pid, start := range u.membership {
			if p, ok := processAt(pid); ok && p.start == start {
				known[pid] = p
			}
		}
		groupAlive := false
		for _, p := range known {
			if p.group == u.pid {
				groupAlive = true
			}
		}
		entries, _ := os.ReadDir("/proc")
		all := map[int]processInfo{}
		for _, entry := range entries {
			pid, err := strconv.Atoi(entry.Name())
			if err != nil {
				continue
			}
			if p, ok := processAt(pid); ok {
				all[pid] = p
			}
		}
		for changed := true; changed; {
			changed = false
			for pid, p := range all {
				if _, ok := known[pid]; ok {
					continue
				}
				if _, parent := known[p.parent]; parent || (groupAlive && p.group == u.pid) {
					known[pid] = p
					u.membership[pid] = p.start
					changed = true
				}
			}
		}
	}
	out := map[int]processInfo{}
	var err error
	for pid, start := range u.membership {
		if p, ok := processAt(pid); ok && p.start == start {
			if p.group != u.pid {
				err = fmt.Errorf("unsupported detached process tree")
			}
			// The tracer observes exits; the subreaper still owns the final wait for
			// adopted orphans once ptrace has released their exit event.
			if p.zombie && p.parent == os.Getpid() && pid != u.pid {
				var status syscall.WaitStatus
				if reaped, _ := syscall.Wait4(pid, &status, syscall.WNOHANG, nil); reaped == pid {
					delete(u.membership, pid)
					continue
				}
			}
			out[pid] = p
		} else {
			// A missing or reused PID can never become this member again. Keep
			// zombies until their final wait, but bound work by live membership.
			delete(u.membership, pid)
		}
	}
	return out, err
}
// The serving tree is the last OOM victim; a candidate or a lingering previous tree goes first.
var protectedScore, expendableScore = -998, 500

func (u *generation) protect() error { return u.setScore(protectedScore) }

// setScore applies one OOM score to the whole tree, including processes it forks meanwhile.
func (u *generation) setScore(value int) error {
	want := strconv.Itoa(value)
	for tries := 0; tries < 20; tries++ {
		members, err := u.members()
		if err != nil {
			return err
		}
		if len(members) == 0 || u.exited.Load() {
			return fmt.Errorf("application exited")
		}
		for pid, p := range members {
			if !p.zombie {
				if err := score(pid, value); err != nil && !os.IsNotExist(err) {
					return err
				}
			}
		}
		check, err := u.members()
		if err != nil {
			return err
		}
		ready := true
		for pid, p := range check {
			if p.zombie {
				continue
			}
			b, err := os.ReadFile(fmt.Sprintf("/proc/%d/oom_score_adj", pid))
			if err == nil && strings.TrimSpace(string(b)) != want {
				ready = false
			}
		}
		if ready {
			return nil
		}
	}
	return fmt.Errorf("could not score concurrently forking tree")
}
func (u *generation) signal(sig syscall.Signal) {
	// Signal group plus known descendants: a detected setsid escape must also be cleaned up.
	members, _ := u.members()
	for _, p := range members {
		if p.group == u.pid {
			syscall.Kill(-u.pid, sig)
			break
		}
	}
	for pid, p := range members {
		if !p.zombie {
			syscall.Kill(pid, sig)
		}
	}
}
func (u *generation) reap(deadline time.Time) error {
	for {
		members, _ := u.members()
		if len(members) == 0 && u.exited.Load() {
			if u.traceFailure.Load() {
				return fmt.Errorf("process exit observation failed; cleanup unverified")
			}
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("process tree not reaped")
		}
		time.Sleep(5 * time.Millisecond)
	}
}
func (u *generation) terminate() error {
	if u == nil {
		return nil
	}
	u.limitGrace(grace)
	u.terminateMu.Lock()
	defer u.terminateMu.Unlock()
	u.treeMu.Lock()
	first := u.termAt.IsZero()
	if first {
		u.termAt = time.Now()
	}
	u.treeMu.Unlock()
	if first {
		u.signal(syscall.SIGTERM)
	}
	for time.Now().Before(u.killDeadline()) {
		members, _ := u.members()
		if len(members) == 0 && u.exited.Load() {
			return u.reap(time.Now())
		}
		time.Sleep(5 * time.Millisecond)
	}
	u.signal(syscall.SIGKILL)
	return u.reap(time.Now().Add(2 * time.Second))
}

// limitGrace moves the tree's SIGKILL to at most d from now, also during a termination already in progress. It never
// postpones an earlier deadline.
func (u *generation) limitGrace(d time.Duration) {
	u.treeMu.Lock()
	defer u.treeMu.Unlock()
	if at := time.Now().Add(d); u.killAt.IsZero() || at.Before(u.killAt) {
		u.killAt = at
	}
}
func (u *generation) killDeadline() time.Time {
	u.treeMu.Lock()
	defer u.treeMu.Unlock()
	return u.killAt
}
func (u *generation) remove() {
	if u != nil && u.cmd.Dir != baseline {
		must(os.RemoveAll(u.cmd.Dir))
	}
}

func (u *generation) terminating() bool {
	u.treeMu.Lock()
	defer u.treeMu.Unlock()
	return !u.termAt.IsZero()
}
