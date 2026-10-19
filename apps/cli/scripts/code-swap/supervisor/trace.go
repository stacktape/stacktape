package main

import (
	"fmt"
	"os"
	"runtime"
	"strconv"
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
		fd := 3 + len(u.cmd.ExtraFiles)
		u.cmd.ExtraFiles = append(u.cmd.ExtraFiles, gate)
		if u.cmd.Env == nil {
			u.cmd.Env = os.Environ()
		}
		u.cmd.Env = append(u.cmd.Env, "STP_BENCH_TRACE_FD="+strconv.Itoa(fd))
		if err := u.cmd.Start(); err != nil {
			gate.Close()
			release.Close()
			ready <- err
			return
		}
		gate.Close()
		leader := u.cmd.Process.Pid
		u.pid = leader
		options := syscall.PTRACE_O_TRACEFORK | syscall.PTRACE_O_TRACEVFORK | syscall.PTRACE_O_TRACECLONE | syscall.PTRACE_O_TRACEEXIT | 0x100000 // EXITKILL
		_, _, errno := syscall.Syscall6(syscall.SYS_PTRACE, 0x4206, uintptr(leader), 0, uintptr(options), 0, 0)                                   // SEIZE
		if errno != 0 {
			syscall.Kill(leader, syscall.SIGKILL)
			var status syscall.WaitStatus
			syscall.Wait4(leader, &status, 0, nil)
			release.Close()
			u.exited.Store(true)
			ready <- fmt.Errorf("kernel exit observation unavailable: %w", errno)
			return
		}
		_, err = release.Write([]byte("start\n"))
		release.Close()
		if err != nil {
			syscall.Kill(leader, syscall.SIGKILL)
			ready <- err
			return
		}
		var status syscall.WaitStatus

		ready <- nil
		for {
			pid, err := syscall.Wait4(-1, &status, syscall.WALL|0x20000000, nil)
			if err == syscall.EINTR {
				continue
			}
			if err == syscall.ECHILD {
				break
			}
			if err != nil {
				u.treeFailure.Store(true)
				break
			}
			if status.Exited() || status.Signaled() {
				if pid == leader {
					u.exited.Store(true)
				}
				continue
			}
			if !status.Stopped() {
				continue
			}
			sig := status.StopSignal()
			if sig == syscall.SIGTRAP && status.TrapCause() == syscall.PTRACE_EVENT_EXIT {
				code, e := syscall.PtraceGetEventMsg(pid)
				if e != nil {
					u.treeFailure.Store(true)
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
						u.treeFailure.Store(true)
					}
					continue
				}
			}
			deliver := 0
			if (int(status) >> 16) == 0 {
				deliver = int(sig)
			}
			if err := syscall.PtraceCont(pid, deliver); err != nil && err != syscall.ESRCH {
				u.treeFailure.Store(true)
			}

		}
		u.exited.Store(true)
		u.cmd.Process.Release()
	}()
	return <-ready
}
