package main

import (
	"fmt"
	"os"
	"os/exec"
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
		if p.group == u.cmd.Process.Pid {
			u.membership[pid] = p.start
		}
	}
	// A double-fork/setsid child can be adopted before its original parent is sampled.
	// In this single-app harness, adopted children outside another tracked generation are unsupported escapes.
	for pid, p := range all {
		if p.parent != os.Getpid() || p.group == u.cmd.Process.Pid {
			continue
		}
		otherGroup := false
		for _, other := range []*generation{current.Load(), candidate.Load(), oldGeneration} {
			if other != nil && other != u && p.group == other.cmd.Process.Pid {
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
		if p, ok := all[pid]; !ok || p.start != start {
			if pid != u.cmd.Process.Pid {
				u.treeFailure = true
			}
		}
	}
	for pid, start := range u.membership {
		if p, ok := all[pid]; ok && p.start == start {
			if p.group != u.cmd.Process.Pid {
				err = fmt.Errorf("unsupported detached process tree")
			}
			// Adopted grandchildren belong to us as a subreaper. Cmd.Wait owns only the leader.
			if p.zombie && p.parent == os.Getpid() && pid != u.cmd.Process.Pid {
				var status syscall.WaitStatus
				reaped, waitErr := syscall.Wait4(pid, &status, syscall.WNOHANG, nil)
				if reaped == pid {
					continue
				}
				if waitErr != nil {
					fmt.Printf("{\"benchmarkEvent\":\"reapError\",\"pid\":%d,\"error\":%q}\n", pid, waitErr.Error())
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
	syscall.Kill(-u.cmd.Process.Pid, sig)
	members, _ := u.members()
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
	if u.termAt.IsZero() {
		u.termAt = time.Now()
		u.signal(syscall.SIGTERM)
	}
	deadline := u.termAt.Add(grace)
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
