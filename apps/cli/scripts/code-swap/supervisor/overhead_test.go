package main

// Opt-in measurement against the identical HTTP application without a tracer.
// No AWS, OOM-score writes, or proxy overhead is included in this diagnostic.
import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"sort"
	"sync/atomic"
	"syscall"
	"testing"
	"time"
)

func TestOverheadApplication(t *testing.T) {
	if os.Getenv("STP_TRACE_FIXTURE") != "1" {
		return
	}
	gate := os.NewFile(3, "gate")
	b := make([]byte, 6)
	gate.Read(b)
	gate.Close()
	var signals atomic.Int64
	ch := make(chan os.Signal, 128)
	signal.Notify(ch, syscall.SIGUSR1)
	go func() {
		for range ch {
			signals.Add(1)
		}
	}()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	os.WriteFile(os.Getenv("STP_TRACE_ADDRESS"), []byte(listener.Addr().String()), 0600)
	http.Serve(listener, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/fork" {
			for i := 0; i < 8; i++ {
				if err := exec.Command("/bin/true").Run(); err != nil {
					http.Error(w, err.Error(), 500)
					return
				}
			}
		} else {
			for i := 0; i < 32; i++ {
				before := signals.Load()
				syscall.Kill(os.Getpid(), syscall.SIGUSR1)
				for signals.Load() == before {
					time.Sleep(time.Microsecond)
				}
			}
		}
		io.WriteString(w, "ok")
	}))
	os.Exit(0)
}

func TestTraceOverhead(t *testing.T) {
	if os.Getenv("STP_MEASURE_TRACE") != "1" {
		t.Skip("explicit measurement only")
	}
	for _, workload := range []string{"fork", "signal"} {
		for round := 0; round < 3; round++ {
			for _, mode := range []string{"direct", "traced", "narrowed"} {
				traced := mode != "direct"
				dir := t.TempDir()
				address := dir + "/address"
				cmd := exec.Command(os.Args[0], "-test.run=^TestOverheadApplication$")
				cmd.Env = append(os.Environ(), "STP_TRACE_FIXTURE=1", "STP_TRACE_ADDRESS="+address)
				cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
				u := &generation{cmd: cmd, membership: map[int]string{}}
				if traced {
					if err := u.startTraced(); err != nil {
						t.Fatal(err)
					}
				} else {
					gate, release, _ := os.Pipe()
					cmd.ExtraFiles = []*os.File{gate}
					if err := cmd.Start(); err != nil {
						t.Fatal(err)
					}
					gate.Close()
					release.Write([]byte("start\n"))
					release.Close()
				}
				deadline := time.Now().Add(5 * time.Second)
				var addr []byte
				for len(addr) == 0 && time.Now().Before(deadline) {
					addr, _ = os.ReadFile(address)
					time.Sleep(time.Millisecond)
				}
				if len(addr) == 0 {
					cmd.Process.Kill()
					t.Fatal("fixture never listened")
				}
				if mode == "narrowed" {
					if err := u.detach(); err != nil {
						t.Fatal(err)
					}
				}
				client := &http.Client{Timeout: 10 * time.Second}
				samples := []float64{}
				started := time.Now()
				for i := 0; i < 600; i++ {
					begin := time.Now()
					res, err := client.Get("http://" + string(addr) + "/" + workload)
					if err != nil {
						t.Fatal(err)
					}
					body, _ := io.ReadAll(res.Body)
					res.Body.Close()
					if string(body) != "ok" {
						t.Fatal(string(body))
					}
					if i >= 100 {
						samples = append(samples, float64(time.Since(begin).Nanoseconds())/1e6)
					} else {
						started = time.Now()
					}
				}
				seconds := time.Since(started).Seconds()
				sort.Float64s(samples)
				b, _ := json.Marshal(map[string]any{"workload": workload, "round": round, "traced": traced, "mode": mode, "requests": len(samples), "p50Ms": samples[len(samples)/2], "p99Ms": samples[len(samples)*99/100], "requestsPerSecond": float64(len(samples)) / seconds})
				fmt.Println("TRACE_MEASUREMENT " + string(b))
				cmd.Process.Kill()
				if traced {
					for !u.exited.Load() {
						time.Sleep(time.Millisecond)
					}
				} else {
					cmd.Wait()
				}
				client.CloseIdleConnections()
			}
		}
	}
}
