package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"testing"
	"time"
)

// The supervisor makes itself a child subreaper before it starts anything (main), and the tests run the same way.
// Orphaned descendants then come back to the process under test. Otherwise they go to the container's PID 1, and the
// result depends on whether PID 1 reaps them: `go test` as PID 1 never does, so a killed tree stays a zombie.
func TestMain(m *testing.M) {
	if _, _, errno := syscall.Syscall6(syscall.SYS_PRCTL, 36, 1, 0, 0, 0, 0); errno != 0 {
		fmt.Fprintln(os.Stderr, "PR_SET_CHILD_SUBREAPER:", errno)
		os.Exit(1)
	}
	os.Exit(m.Run())
}

func TestChildExitPolicy(t *testing.T) {
	for _, tc := range []struct {
		name, script string
		killed       bool
	}{
		{"clean", "sh -c 'exit 0' & wait; sleep .05", false},
		{"normal nonzero", "sh -c 'exit 17' & wait; sleep .05", false},
		{"normal signal", "sleep 30 & kill -TERM $!; wait; sleep .05", false},
		{"parent reaps SIGKILL", "sleep 30 & kill -KILL $!; wait; sleep .05", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cmd := exec.Command("sh", "-c", "read x <&3; "+tc.script)
			cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
			u := &generation{cmd: cmd, membership: map[int]string{}}
			if err := u.startTraced(); err != nil {
				t.Fatal(err)
			}
			deadline := time.Now().Add(5 * time.Second)
			for !u.exited.Load() && time.Now().Before(deadline) {
				u.members()
				time.Sleep(time.Millisecond)
			}
			if !u.exited.Load() {
				u.signal(syscall.SIGKILL)
				t.Fatal("leader never exited")
			}
			if u.traceFailure.Load() {
				t.Fatal("kernel exit observation failed")
			}
			if u.treeFailure.Load() != tc.killed {
				t.Fatalf("SIGKILL failure = %v, want %v", u.treeFailure.Load(), tc.killed)
			}
		})
	}
}

func TestStoppedGrandchildReaped(t *testing.T) {
	// SIGSTOP does not make a process immune to SIGKILL. Force an adopted,
	// stopped grandchild and prove termination reaps it, rather than faking D state.
	dir := t.TempDir()
	cmd := exec.Command("sh", "-c", "read x <&3; sh -c 'echo $$ > \"$1/pid\"; kill -STOP $$; sleep 30' child \"$1\" & exit 0", "leader", dir)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	u := &generation{cmd: cmd, membership: map[int]string{}}
	if err := u.startTraced(); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(3 * time.Second)
	for {
		if _, err := os.Stat(dir + "/pid"); err == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("grandchild not started")
		}
		time.Sleep(time.Millisecond)
	}
	oldGrace := grace
	grace = 10 * time.Millisecond
	defer func() { grace = oldGrace }()
	done := make(chan error, 2)
	go func() { done <- u.terminate() }()
	go func() { done <- u.terminate() }()
	// Exercise the same concurrent members/termination reads as overlap monitoring.
	for !u.exited.Load() {
		u.members()
		u.terminating()
		time.Sleep(time.Millisecond)
	}
	for i := 0; i < 2; i++ {
		if err := <-done; err != nil {
			t.Fatal(err)
		}
	}
	if m, _ := u.members(); len(m) != 0 {
		t.Fatalf("survivors: %v", m)
	}
}

func TestUnverifiedReapKeepsHealthyTaskAndBlocksFallback(t *testing.T) {
	// A wait intentionally withheld by the test makes reaping unverifiable without
	// requiring a broken NFS mount. Real stopped descendants are covered above.
	oldGrace, oldBaseline := grace, baseline
	grace, baseline = 0, t.TempDir()
	defer func() { grace, baseline = oldGrace, oldBaseline; current.Store(nil); candidate.Store(nil) }()
	t.Setenv("STP_BENCH_LOCAL", t.TempDir())
	for _, path := range []string{"prepare", "candidate failure"} {
		t.Run(path, func(t *testing.T) {
			cmd := exec.Command("sleep", "30")
			cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
			cmd.Dir = t.TempDir()
			if err := cmd.Start(); err != nil {
				t.Fatal(err)
			}
			info, _ := processAt(cmd.Process.Pid)
			u := &generation{cmd: cmd, pid: cmd.Process.Pid, revision: "failed", membership: map[int]string{cmd.Process.Pid: info.start}}
			healthy := &generation{revision: "healthy"}
			current.Store(healthy)
			timing := map[string]any{}
			cause := fmt.Errorf("health check failed")
			if path == "prepare" {
				if err := cleanupPrepare(u, timing, cause); !strings.Contains(err.Error(), "not reaped") {
					t.Fatal(err)
				}
			} else {
				fail(u, timing, cause)
			}
			if timing["candidateReaped"] != false {
				t.Fatal("unverified reap was reported successful")
			}
			if current.Load() != healthy || candidate.Load() != u {
				t.Fatal("healthy task or cleanup ownership lost")
			}
			if _, err := os.Stat(cmd.Dir); err != nil {
				t.Fatal("unreaped tree directory removed", err)
			}
			cmd.Wait()
			u.exited.Store(true)
			cleanupPrepare(u, timing, cause)
			if timing["candidateReaped"] != true || candidate.Load() != nil {
				t.Fatal("verified retry did not clear candidate")
			}
		})
	}
}

func TestStopDuringFailureLeavesTreesForShutdown(t *testing.T) {
	t.Setenv("STP_BENCH_LOCAL", t.TempDir())
	stopping.Store(true)
	defer func() { stopping.Store(false); current.Store(nil); oldGeneration.Store(nil) }()
	u := &generation{revision: "failed"}
	old := &generation{revision: "old", termAt: time.Now()}
	current.Store(u)
	oldGeneration.Store(old)
	fail(u, map[string]any{}, fmt.Errorf("candidate exited during old shutdown"))
	if current.Load() != u || oldGeneration.Load() != old {
		t.Fatal("shutdown tree ownership lost")
	}
}

func TestReusedGroupIsNotSignaled(t *testing.T) {
	cmd := exec.Command("sleep", "30")
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer cmd.Process.Kill()
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	u := &generation{pid: cmd.Process.Pid, membership: map[int]string{cmd.Process.Pid: "previous-start-time"}}
	u.exited.Store(true)
	u.signal(syscall.SIGTERM)
	select {
	case err := <-done:
		t.Fatalf("signaled reused process group: %v", err)
	case <-time.After(20 * time.Millisecond):
	}
	cmd.Process.Kill()
	<-done
}
