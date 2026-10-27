package main

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"testing"
	"time"
	"unsafe"
)

func TestMembershipPrunesRetiredAndReusedPIDs(t *testing.T) {
	p, ok := processAt(os.Getpid())
	if !ok {
		t.Fatal("missing self")
	}
	u := &generation{pid: p.group, membership: map[int]string{os.Getpid(): p.start, 99999999: "gone", os.Getppid(): "reused"}}
	u.traced.Store(true)
	m, err := u.members()
	if err != nil || len(m) != 1 || len(u.membership) != 1 {
		t.Fatalf("members=%v retained=%v err=%v", m, u.membership, err)
	}
}

func TestShutdownUnreapableCandidateStillTerminatesServingTree(t *testing.T) {
	originalGrace, originalBaseline := grace, baseline
	grace, baseline = 100*time.Millisecond, t.TempDir()
	stopping.Store(false)
	defer func() {
		grace, baseline = originalGrace, originalBaseline
		stopping.Store(false)
		stopAt.Store(nil)
		current.Store(nil)
		candidate.Store(nil)
	}()
	// Withhold the candidate's wait: even SIGKILL cannot make cleanup verified.
	cmd := exec.Command("sleep", "30")
	cmd.Dir = t.TempDir()
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	p, _ := processAt(cmd.Process.Pid)
	retained := &generation{cmd: cmd, pid: p.pid, revision: "unreapable", membership: map[int]string{p.pid: p.start}}
	candidate.Store(retained)
	dir := t.TempDir()
	servingCmd := exec.Command("sh", "-c", "read x <&3; trap 'echo term > \"$1/term\"; exit 0' TERM; while :; do sleep .01; done", "serving", dir)
	servingCmd.Dir = baseline
	servingCmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	serving := &generation{cmd: servingCmd, revision: "serving", membership: map[int]string{}}
	if err := serving.startTraced(); err != nil {
		t.Fatal(err)
	}
	current.Store(serving)
	time.Sleep(30 * time.Millisecond)
	at := time.Now().Add(-30*time.Second + 150*time.Millisecond)
	stopAt.Store(&at)
	done := make(chan struct{})
	go func() { shutdown(&http.Server{}); close(done) }()
	time.Sleep(50 * time.Millisecond)
	if _, err := os.Stat(filepath.Join(dir, "term")); !os.IsNotExist(err) {
		t.Fatal("serving tree lost its drain")
	}
	select {
	case <-done:
	case <-time.After(4 * time.Second):
		t.Fatal("shutdown exceeded concurrent budget")
	}
	if _, err := os.Stat(filepath.Join(dir, "term")); err != nil {
		t.Fatal("serving tree missed SIGTERM", err)
	}
	if !serving.exited.Load() {
		t.Fatal("serving tree not reaped")
	}
	if _, err := os.Stat(cmd.Dir); err != nil {
		t.Fatal("unreapable directory removed")
	}
	cmd.Wait()
}

func TestDetachRemovesLifetimeTraceAndKeepsForkOwnership(t *testing.T) {
	oldGrace := grace
	grace = 100 * time.Millisecond
	defer func() { grace = oldGrace }()
	cmd := exec.Command("sh", "-c", "read x <&3; sleep 30 & wait")
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	u := &generation{cmd: cmd, membership: map[int]string{}}
	if err := u.startTraced(); err != nil {
		t.Fatal(err)
	}
	defer u.terminate()
	time.Sleep(20 * time.Millisecond)
	if err := u.detach(); err != nil {
		t.Fatal(err)
	}
	if u.traced.Load() {
		t.Fatal("still traced")
	}
	members, err := u.members()
	if err != nil || len(members) < 2 {
		t.Fatalf("members=%v err=%v", members, err)
	}
	for pid := range members {
		b, err := os.ReadFile(fmt.Sprintf("/proc/%d/status", pid))
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(b), "TracerPid:\t0\n") {
			t.Fatalf("pid %d remains traced", pid)
		}
	}
	if err := u.terminate(); err != nil {
		t.Fatal(err)
	}
}

func TestReadinessUsesLiveFreshCheckedGeneration(t *testing.T) {
	t.Setenv("STP_BENCH_READINESS_SOCKET", t.TempDir()+"/socket")
	closeServer, err := serveReadiness()
	if err != nil {
		t.Fatal(err)
	}
	defer closeServer()
	defer func() {
		current.Store(nil)
		checked.Store(nil)
		desiredRevision.Store(nil)
		stopping.Store(false)
	}()
	u := &generation{revision: "committed"}
	current.Store(u)
	assertReady := func(want bool) {
		t.Helper()
		if got := readinessCommand() == nil; got != want {
			t.Fatalf("ready=%v want %v", got, want)
		}
	}
	assertReady(false)
	checked.Store(&checkedGeneration{u, time.Now(), true})
	assertReady(true)
	checked.Store(&checkedGeneration{u, time.Now().Add(-8 * time.Second), true})
	assertReady(false)
	checked.Store(&checkedGeneration{u, time.Now(), true})
	rev := "other"
	desiredRevision.Store(&rev)
	assertReady(false)
	desiredRevision.Store(nil)
	stopping.Store(true)
	assertReady(false)
	stopping.Store(false)
	u.exited.Store(true)
	assertReady(false)
	u.exited.Store(false)
	checked.Store(&checkedGeneration{&generation{}, time.Now(), true})
	assertReady(false)
	closeServer()
	assertReady(false)
}

func TestTraceDeniedBootKeepsImageOnly(t *testing.T) {
	// Isolate the irreversible seccomp filter in a subprocess. TSYNC denies
	// ptrace on every Go runtime thread, including the tracer's locked thread.
	if os.Getenv("STP_DENY_TRACE_TEST") == "1" {
		runtime.LockOSThread()
		filters := []syscall.SockFilter{{Code: 0x20, K: 0}, {Code: 0x15, Jt: 0, Jf: 1, K: uint32(syscall.SYS_PTRACE)}, {Code: 0x06, K: 0x00050000 | uint32(syscall.EPERM)}, {Code: 0x06, K: 0x7fff0000}}
		program := syscall.SockFprog{Len: uint16(len(filters)), Filter: &filters[0]}
		_, _, e := syscall.RawSyscall6(syscall.SYS_PRCTL, 38, 1, 0, 0, 0, 0)
		if e != 0 {
			t.Fatal(e)
		}
		// seccomp(SET_MODE_FILTER, TSYNC, program), Linux amd64 qualification only.
		_, _, e = syscall.RawSyscall(317, 1, 1, uintptr(unsafe.Pointer(&program)))
		if e != 0 {
			t.Fatal(e)
		}
		makeTree := func() *generation {
			cmd := exec.Command("sh", "-c", "read x <&3; sleep .03")
			cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
			return &generation{cmd: cmd, membership: map[int]string{}}
		}
		image := makeTree()
		if err := image.startUntraced(); err != nil {
			t.Fatal(err)
		}
		for !image.exited.Load() {
			time.Sleep(time.Millisecond)
		}
		candidate := makeTree()
		if err := candidate.startTraced(); err == nil || !strings.Contains(err.Error(), "operation not permitted") {
			t.Fatalf("denied trace: %v", err)
		}
		if !candidate.exited.Load() {
			t.Fatal("denied launcher not reaped")
		}
		return
	}
	cmd := exec.Command(os.Args[0], "-test.run=^TestTraceDeniedBootKeepsImageOnly$")
	cmd.Env = append(os.Environ(), "STP_DENY_TRACE_TEST=1")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("%v: %s", err, out)
	}
}

func TestIdleLeaderExitRetainsLateOrphan(t *testing.T) {
	cmd := exec.Command("sh", "-c", "read x <&3; sleep 30 & exit 0")
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	u := &generation{cmd: cmd, membership: map[int]string{}}
	if err := u.startUntraced(); err != nil {
		t.Fatal(err)
	}
	defer u.terminate()
	deadline := time.Now().Add(3 * time.Second)
	for !u.exited.Load() && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if !u.exited.Load() {
		t.Fatal("leader wait stalled")
	}
	members, _ := u.members()
	if len(members) != 1 {
		t.Fatalf("late orphan lost: %v", members)
	}
	if err := u.terminate(); err != nil {
		t.Fatal(err)
	}
}
