package main

import (
	"errors"
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"
	"unsafe"
)

// Observe kernel exit statuses before the application's parent can reap them.
// Polling /proc cannot distinguish a short-lived clean child from a killed child.
// Each generation has one tracer OS thread; __WNOTHREAD keeps its waits away
// from the other generation and from Go's unrelated child processes.
func (u *generation) startTraced() error {
	ready := make(chan error, 1)
	u.detachRequests = make(chan chan error, 1)
	u.traced.Store(true)
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
		events := make(chan os.Signal, 1)
		signal.Notify(events, syscall.SIGCHLD)
		defer signal.Stop(events)
		var status syscall.WaitStatus
		tracees := map[int]bool{leader: true}
		var detached chan error
		var detachErr error
		for {
			if detached == nil {
				select {
				case detached = <-u.detachRequests:
					for pid := range tracees {
						_, _, e := syscall.Syscall6(syscall.SYS_PTRACE, 0x4207, uintptr(pid), 0, 0, 0, 0) // INTERRUPT
						if e != 0 && e != syscall.ESRCH {
							detachErr = errors.Join(detachErr, e)
						}
					}
				default:
				}
			}
			if detached != nil && len(tracees) == 0 {
				u.traced.Store(false)
				detached <- detachErr
				// The leader is still our child after DETACH. Its ordinary wait
				// owns final exit; adopted descendant waits belong to members().
				u.waitUntraced()
				return
			}
			pid, err := syscall.Wait4(-1, &status, syscall.WALL|syscall.WNOHANG|0x20000000, nil)
			if pid == 0 && err == nil {
				select {
				case <-events:
				case <-time.After(10 * time.Millisecond):
				}
				continue
			}
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
				delete(tracees, pid)
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
				} else {
					tracees[int(child)] = true
					if p, ok := processAt(int(child)); ok && (event != syscall.PTRACE_EVENT_CLONE || isProcessLeader(int(child))) {
						u.treeMu.Lock()
						u.membership[p.pid] = p.start
						u.treeMu.Unlock()
					}
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
			if detached != nil {
				deliver := 0
				if int(status)>>16 == 0 {
					deliver = int(sig)
				}
				_, _, e := syscall.Syscall6(syscall.SYS_PTRACE, syscall.PTRACE_DETACH, uintptr(pid), 0, uintptr(deliver), 0, 0)
				if e != 0 && e != syscall.ESRCH {
					detachErr = errors.Join(detachErr, e)
					u.traceFailure.Store(true)
				} else {
					delete(tracees, pid)
				}
				continue
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
		if detached != nil {
			detached <- fmt.Errorf("application exited during detach: %w", detachErr)
		}
		u.exited.Store(true)
		u.cmd.Process.Release()
	}()
	return <-ready
}

// Detach only after overlap, verified old-tree reaping and score restoration.
func (u *generation) detach() error {
	if !u.traced.Load() {
		return nil
	}
	done := make(chan error, 1)
	select {
	case u.detachRequests <- done:
		syscall.Kill(os.Getpid(), syscall.SIGCHLD)
	case <-time.After(2 * time.Second):
		return fmt.Errorf("tracer detach unavailable")
	}
	select {
	case err := <-done:
		return err
	case <-time.After(2 * time.Second):
		return fmt.Errorf("tracer detach timed out")
	}
}

func (u *generation) startUntraced() error {
	gate, release, err := os.Pipe()
	if err != nil {
		return err
	}
	defer gate.Close()
	defer release.Close()
	u.cmd.ExtraFiles = []*os.File{gate}
	if err := u.cmd.Start(); err != nil {
		return err
	}
	u.pid = u.cmd.Process.Pid
	p, _ := processAt(u.pid)
	u.membership[u.pid] = p.start
	if _, err := release.Write([]byte("start\n")); err != nil {
		u.cmd.Process.Kill()
		u.cmd.Wait()
		u.exited.Store(true)
		return err
	}
	go u.waitUntraced()
	return nil
}

// Keep the dead leader as an identity anchor until the final descendant census.
// Reaping first would lose children forked between idle scans and leader exit.
func (u *generation) waitUntraced() {
	var info [128]byte
	for {
		_, _, e := syscall.Syscall6(syscall.SYS_WAITID, 1, uintptr(u.pid), uintptr(unsafe.Pointer(&info[0])), 4|0x01000000, 0, 0) // P_PID, WEXITED|WNOWAIT
		if e == syscall.EINTR {
			continue
		}
		if e != 0 {
			u.traceFailure.Store(true)
		}
		break
	}
	u.members()
	u.cmd.Wait()
	u.exited.Store(true)
}
