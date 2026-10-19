package main

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
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

func processes() map[int]processInfo {
	entries, _ := os.ReadDir("/proc")
	out := map[int]processInfo{}
	for _, e := range entries {
		pid, err := strconv.Atoi(e.Name())
		if err != nil {
			continue
		}
		b, err := os.ReadFile(filepath.Join("/proc", e.Name(), "stat"))
		if err != nil {
			continue
		}
		end := strings.LastIndex(string(b), ")")
		if end < 0 {
			continue
		}
		f := strings.Fields(string(b)[end+1:])
		if len(f) < 20 {
			continue
		}
		parent, _ := strconv.Atoi(f[1])
		group, _ := strconv.Atoi(f[2])
		out[pid] = processInfo{pid, parent, group, f[19], f[0] == "Z"}
	}
	return out
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

// A launcher changes its own score before exec; application code cannot fork before inheritance is established.
func launch() {
	// Keep exec on the leader seized by the parent, including across the blocking gate read.
	runtime.LockOSThread()
	if syscall.Gettid() != os.Getpid() {
		panic("launcher must run on its leader thread")
	}

	fd, err := strconv.Atoi(os.Getenv("STP_BENCH_TRACE_FD"))
	must(err)
	gate := os.NewFile(uintptr(fd), "trace-start")
	var start [1]byte
	_, err = io.ReadFull(gate, start[:])
	must(err)
	gate.Close()
	os.Unsetenv("STP_BENCH_TRACE_FD")

	value, err := strconv.Atoi(os.Args[2])
	must(err)
	must(score(os.Getpid(), value))
	binary, err := exec.LookPath(os.Args[3])
	must(err)
	must(syscall.Exec(binary, os.Args[3:], os.Environ()))
}
func (u *generation) members() (map[int]processInfo, error) {
	all := processes()
	u.treeMu.Lock()
	defer u.treeMu.Unlock()
	for pid, p := range all {
		if p.group == u.pid {
			u.membership[pid] = p.start
		}
	}
	// A double-fork/setsid child can be adopted before its original parent is sampled.
	// In this single-app harness, adopted children outside another tracked generation are unsupported escapes.
	for pid, p := range all {
		if p.parent != os.Getpid() || p.group == u.pid {
			continue
		}
		otherGroup := false
		for _, other := range []*generation{current.Load(), candidate.Load(), oldGeneration.Load()} {
			if other != nil && other != u && p.group == other.pid {
				otherGroup = true
			}
		}
		if !otherGroup {
			u.membership[pid] = p.start
		}
	}
	for changed := true; changed; {
		changed = false
		for pid, p := range all {
			if _, exists := u.membership[pid]; exists {
				continue
			}
			if start, ok := u.membership[p.parent]; ok && all[p.parent].start == start {
				u.membership[pid] = p.start
				changed = true
			}
		}
	}
	out := map[int]processInfo{}
	var err error
	for pid, start := range u.membership {
		if p, ok := all[pid]; ok && p.start == start {
			if p.group != u.pid {
				err = fmt.Errorf("unsupported detached process tree")
			}
			// The tracer observes exits; the subreaper still owns the final wait for
			// adopted orphans once ptrace has released their exit event.
			if p.zombie && p.parent == os.Getpid() && pid != u.pid {
				var status syscall.WaitStatus
				if reaped, _ := syscall.Wait4(pid, &status, syscall.WNOHANG, nil); reaped == pid {
					continue
				}
			}
			out[pid] = p
		}
	}
	return out, err
}
func (u *generation) protect() error {
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
				if err := score(pid, -998); err != nil && !os.IsNotExist(err) {
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
			if err == nil && strings.TrimSpace(string(b)) != "-998" {
				ready = false
			}
		}
		if ready {
			return nil
		}
	}
	return fmt.Errorf("could not protect concurrently forking tree")
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
	u.terminateMu.Lock()
	defer u.terminateMu.Unlock()
	u.treeMu.Lock()
	first := u.termAt.IsZero()
	if first {
		u.termAt = time.Now()
	}
	deadline := u.termAt.Add(grace)
	u.treeMu.Unlock()
	if first {
		u.signal(syscall.SIGTERM)
	}
	for time.Now().Before(deadline) {
		members, _ := u.members()
		if len(members) == 0 && u.exited.Load() {
			return nil
		}
		time.Sleep(5 * time.Millisecond)
	}
	u.signal(syscall.SIGKILL)
	return u.reap(time.Now().Add(2 * time.Second))
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
