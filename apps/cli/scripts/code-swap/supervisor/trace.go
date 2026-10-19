package main

import (
	"errors"
	"fmt"
	"os"
	"runtime"
	"syscall"
)

// Observe kernel exit statuses before the application's parent can reap them.
// Polling /proc cannot distinguish a short-lived clean child from a killed child.
// Each generation has one tracer OS thread; __WNOTHREAD keeps its waits away
// from the other generation and from Go's unrelated child processes.
func (u *generation) startTraced() error {
	ready := make(chan error, 1)
	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()
		gate, release, err := os.Pipe()
		if err != nil {
			ready <- err
			return
		}
		if len(u.cmd.ExtraFiles) != 0 {
			gate.Close()
			release.Close()
			ready <- fmt.Errorf("unexpected launcher descriptors")
			return
		}
		u.cmd.ExtraFiles = []*os.File{gate}
		if err := u.cmd.Start(); err != nil {
			gate.Close()
			release.Close()
			ready <- err
			return
		}
		gate.Close()
		leader := u.cmd.Process.Pid
		u.pid = leader
		leaderInfo, _ := processAt(leader)
		u.membership[leader] = leaderInfo.start
		options := syscall.PTRACE_O_TRACEFORK | syscall.PTRACE_O_TRACEVFORK | syscall.PTRACE_O_TRACECLONE | syscall.PTRACE_O_TRACEEXIT | 0x100000 // EXITKILL
		_, _, errno := syscall.Syscall6(syscall.SYS_PTRACE, 0x4206, uintptr(leader), 0, uintptr(options), 0, 0)                                   // SEIZE
		if errno != 0 {
			syscall.Kill(leader, syscall.SIGKILL)
			var status syscall.WaitStatus
			reaped, waitErr := syscall.Wait4(leader, &status, 0, nil)
			release.Close()
			u.exited.Store(reaped == leader)
			if reaped == leader {
				u.cmd.Process.Release()
			}
			ready <- fmt.Errorf("kernel exit observation unavailable: %w", errors.Join(errno, waitErr))
			return
		}
		_, err = release.Write([]byte("start\n"))
		release.Close()
		if err != nil {
			syscall.Kill(leader, syscall.SIGKILL)
			ready <- err
		} else {
			ready <- nil
		}
		var status syscall.WaitStatus
		for {
			pid, err := syscall.Wait4(-1, &status, syscall.WALL|0x20000000, nil)
			if err == syscall.EINTR {
				continue
			}
			if err == syscall.ECHILD {
				break
			}
			if err != nil {
				u.traceFailure.Store(true)
				break
			}
			if status.Exited() || status.Signaled() {
				if pid == leader {
					u.exited.Store(true)
					fmt.Printf("{\"benchmarkEvent\":\"processExit\",\"atMs\":%d,\"pid\":%d,\"failed\":%t}\n", now(), leader, !status.Exited() || status.ExitStatus() != 0)
				}
				continue
			}
			if !status.Stopped() {
				continue
			}
			sig := status.StopSignal()
			// Register forked processes while the kernel still holds both sides of the
			// fork event. A parent can exit before the first /proc membership scan.
			event := status.TrapCause()
			if sig == syscall.SIGTRAP && (event == syscall.PTRACE_EVENT_FORK || event == syscall.PTRACE_EVENT_VFORK || event == syscall.PTRACE_EVENT_CLONE) {
				child, err := syscall.PtraceGetEventMsg(pid)
				if err != nil {
					u.traceFailure.Store(true)
				} else if p, ok := processAt(int(child)); ok && (event != syscall.PTRACE_EVENT_CLONE || isProcessLeader(int(child))) {
					u.treeMu.Lock()
					u.membership[p.pid] = p.start
					u.treeMu.Unlock()
				}
			}
			if sig == syscall.SIGTRAP && status.TrapCause() == syscall.PTRACE_EVENT_EXIT {
				code, e := syscall.PtraceGetEventMsg(pid)
				if e != nil {
					u.traceFailure.Store(true)
				} else {
					exit := syscall.WaitStatus(code)
					if pid != leader && exit.Signaled() && exit.Signal() == syscall.SIGKILL {
						u.treeFailure.Store(true)
					}
				}
			}
			// SEIZE preserves job-control stops. LISTEN leaves stopped children stopped
			// until SIGCONT (or SIGKILL), while synthetic newborn stops resume normally.
			if (int(status) >> 16) == 128 { // PTRACE_EVENT_STOP
				if sig != syscall.SIGTRAP {
					_, _, e := syscall.Syscall6(syscall.SYS_PTRACE, 0x4208, uintptr(pid), 0, 0, 0, 0) // LISTEN
					if e != 0 && e != syscall.ESRCH {
						u.traceFailure.Store(true)
					}
					continue
				}
			}
			deliver := 0
			if (int(status) >> 16) == 0 {
				deliver = int(sig)
			}
			if err := syscall.PtraceCont(pid, deliver); err != nil && err != syscall.ESRCH {
				u.traceFailure.Store(true)
			}

		}
		u.exited.Store(true)
		u.cmd.Process.Release()
	}()
	return <-ready
}
