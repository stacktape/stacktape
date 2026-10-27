package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"
)

// fixture serves an ordinary route, a health check path, an endless event stream, an endless text/plain stream, a request that never sends
// headers and a WebSocket upgrade that stays open.
func fixture(rev string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/sse", "/text":
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			if r.URL.Path == "/sse" {
				w.Header().Set("Content-Type", "Text/Event-Stream; charset=utf-8")
			}
			for {
				fmt.Fprintf(w, "data: %s\n\n", rev)
				http.NewResponseController(w).Flush()
				select {
				case <-r.Context().Done():
					return
				case <-time.After(50 * time.Millisecond):
				}
			}
		case "/wait":
			<-r.Context().Done()
		case "/health":
			// A load balancer health check path; an "unhealthy" file in the working directory makes it fail.
			if _, err := os.Stat("unhealthy"); err == nil {
				w.WriteHeader(http.StatusInternalServerError)
			}
			io.WriteString(w, rev)
		case "/moved":
			http.Redirect(w, r, "/health", http.StatusFound)
		case "/ws":
			conn, buf, err := http.NewResponseController(w).Hijack()
			if err != nil {
				return
			}
			defer conn.Close()
			buf.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
			buf.Write(append([]byte{0x81, byte(len(rev))}, rev...))
			buf.Flush()
			io.Copy(io.Discard, conn)
		default:
			io.WriteString(w, rev)
		}
	})
}

// The test binary doubles as the application process of the swap tests below.
func TestLongLivedFixture(t *testing.T) {
	rev := os.Getenv("STP_LONG_LIVED_FIXTURE")
	if rev == "" {
		t.Skip("application process only")
	}
	http.ListenAndServe("127.0.0.1:"+os.Getenv("PORT"), fixture(rev))
}

func startFixture(t *testing.T, rev string, traced bool) *generation {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()
	dir := filepath.Join(t.TempDir(), rev)
	if err := os.Mkdir(dir, 0700); err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command("sh", "-c", `read x <&3; exec "$0" -test.run='^TestLongLivedFixture$'`, os.Args[0])
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "STP_LONG_LIVED_FIXTURE="+rev, "PORT="+strconv.Itoa(port))
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	u := &generation{cmd: cmd, port: port, revision: rev, membership: map[int]string{}, requests: map[*requestLease]bool{}}
	if traced {
		err = u.startTraced()
	} else {
		err = u.startUntraced()
	}
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if lingering.Load() == u {
			stopLingering(0)
		}
		u.limitGrace(0)
		u.terminate()
	})
	u.useProxy(fmt.Sprintf("http://127.0.0.1:%d", port))
	waitFor(t, 10*time.Second, func() bool { return health(port, rev, false) })
	return u
}

func waitFor(t *testing.T, timeout time.Duration, ready func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for !ready() {
		if time.Now().After(deadline) {
			t.Fatal("timed out")
		}
		time.Sleep(5 * time.Millisecond)
	}
}

// swapTask serves the supervisor proxy on a local port and writes status files to a temporary directory.
func swapTask(t *testing.T, drain time.Duration) func() map[string]any {
	dir := t.TempDir()
	t.Setenv("STP_BENCH_LOCAL", dir)
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	server := &http.Server{Handler: http.HandlerFunc(proxy)}
	go server.Serve(listener)
	// Without CAP_SYS_RESOURCE the test cannot lower scores below its own; that value stands in for -998.
	own, err := os.ReadFile("/proc/self/oom_score_adj")
	if err != nil {
		t.Fatal(err)
	}
	oldPort, oldDrain, oldGrace, oldBaseline, oldProtected, oldApp, oldTask := proxyPort, swapDrain, grace, baseline, protectedScore, app, taskID
	proxyPort, swapDrain, grace, baseline, app, taskID = listener.Addr().(*net.TCPAddr).Port, drain, 300*time.Millisecond, "/nonexistent-baseline", "node", "local"
	protectedScore, _ = strconv.Atoi(strings.TrimSpace(string(own)))
	t.Cleanup(func() {
		server.Close()
		desiredRevision.Store(nil)
		checked.Store(nil)
		proxyPort, swapDrain, grace, baseline, protectedScore, app, taskID = oldPort, oldDrain, oldGrace, oldBaseline, oldProtected, oldApp, oldTask
		current.Store(nil)
		candidate.Store(nil)
		oldGeneration.Store(nil)
		lingering.Store(nil)
	})
	return func() map[string]any {
		b, err := os.ReadFile(filepath.Join(dir, statusKey()+".json"))
		if err != nil {
			t.Fatal(err)
		}
		var s map[string]any
		if err := json.Unmarshal(b, &s); err != nil {
			t.Fatal(err)
		}
		return s
	}
}

func proxied(path string) string { return fmt.Sprintf("http://127.0.0.1:%d%s", proxyPort, path) }

// openStream reads a stream's first event, then keeps reading; the channel closes when the stream ends.
func openStream(t *testing.T, path string) (*http.Response, chan struct{}) {
	t.Helper()
	resp, err := http.Get(proxied(path))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	body := bufio.NewReader(resp.Body)
	if _, err := body.ReadString('\n'); err != nil {
		t.Fatal(err)
	}
	ended := make(chan struct{})
	go func() {
		for {
			if _, err := body.ReadString('\n'); err != nil {
				close(ended)
				return
			}
		}
	}()
	return resp, ended
}

func openWebSocket(t *testing.T) net.Conn {
	t.Helper()
	conn, err := net.Dial("tcp", fmt.Sprintf("127.0.0.1:%d", proxyPort))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	io.WriteString(conn, "GET /ws HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n")
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	head, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil || !strings.Contains(head, "101") {
		t.Fatalf("upgrade failed: %q %v", head, err)
	}
	return conn
}

// streamEnds reports whether an event stream ends within the timeout.
func streamEnds(ended chan struct{}, timeout time.Duration) bool {
	select {
	case <-ended:
		return true
	case <-time.After(timeout):
		return false
	}
}

// webSocketCloses reports whether the proxy sends a going-away close frame (1001) and closes the connection.
func webSocketCloses(conn net.Conn, timeout time.Duration) bool {
	conn.SetReadDeadline(time.Now().Add(timeout))
	received, err := io.ReadAll(conn)
	timedOut := false
	if e, ok := err.(net.Error); ok && e.Timeout() {
		timedOut = true
	}
	return !timedOut && bytes.Contains(received, []byte{0x88, 2, 3, 0xe9})
}

func TestLongLivedClassification(t *testing.T) {
	swapTask(t, time.Second)
	backend := httptest.NewServer(fixture("app"))
	defer backend.Close()
	u := &generation{revision: "app", requests: map[*requestLease]bool{}}
	u.useProxy(backend.URL)
	current.Store(u)
	counts := func(inflight, longLived int64) func() bool {
		return func() bool { return u.inflight.Load() == inflight && u.longLived.Load() == longLived }
	}

	ws := openWebSocket(t)
	waitFor(t, 2*time.Second, counts(0, 1))
	ws.Close()
	waitFor(t, 2*time.Second, counts(0, 0))

	sse, _ := openStream(t, "/sse")
	waitFor(t, 2*time.Second, counts(0, 1))
	sse.Body.Close()
	waitFor(t, 2*time.Second, counts(0, 0))

	// An AI SDK-style text/plain stream and a request still waiting for headers delay completion like any request.
	text, _ := openStream(t, "/text")
	time.Sleep(100 * time.Millisecond)
	if !counts(1, 0)() {
		t.Fatalf("text/plain stream: inflight=%d longLived=%d", u.inflight.Load(), u.longLived.Load())
	}
	text.Body.Close()
	waitFor(t, 2*time.Second, counts(0, 0))

	wait, err := http.NewRequest("GET", proxied("/wait"), nil)
	if err != nil {
		t.Fatal(err)
	}
	go http.DefaultClient.Do(wait)
	waitFor(t, 2*time.Second, counts(1, 0))
	time.Sleep(100 * time.Millisecond)
	if !counts(1, 0)() {
		t.Fatal("request without headers became long-lived")
	}
	u.closeRequests()
	waitFor(t, 2*time.Second, counts(0, 0))
}

// lingeringSwap completes a swap from "old" to "new" while an event stream and a WebSocket stay open on "old".
func lingeringSwap(t *testing.T, drain time.Duration) (old, u *generation, sse chan struct{}, ws net.Conn, status func() map[string]any) {
	status = swapTask(t, drain)
	old = startFixture(t, "old", false)
	current.Store(old)
	_, sse = openStream(t, "/sse")
	ws = openWebSocket(t)
	u = startFixture(t, "new", true)
	began := time.Now()
	if err := commit(u, map[string]any{}, oomCount()); err != nil {
		t.Fatal(err)
	}
	if elapsed := time.Since(began); elapsed > drain/2 {
		t.Fatalf("completion waited %v for long-lived connections", elapsed)
	}
	s := status()
	timings := s["timings"].(map[string]any)
	if s["state"] != "complete" || s["revision"] != "new" || timings["longLivedRemaining"] != float64(2) || timings["forcedDrain"] != false {
		t.Fatalf("status=%v", s)
	}
	if current.Load() != u || lingering.Load() != old || oldGeneration.Load() != nil {
		t.Fatal("lingering tree not separated from the serving tree")
	}
	if old.exited.Load() || streamEnds(sse, 200*time.Millisecond) {
		t.Fatal("long-lived connections closed at completion")
	}
	resp, err := http.Get(proxied("/"))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.Header.Get("X-Lab-Revision") != "new" {
		t.Fatal("new requests did not reach the new tree")
	}
	return
}

func assertLingererGone(t *testing.T, old, u *generation, status func() map[string]any) {
	t.Helper()
	waitFor(t, 5*time.Second, func() bool { return lingering.Load() == nil && old.exited.Load() })
	if _, err := os.Stat(old.cmd.Dir); !os.IsNotExist(err) {
		t.Fatal("lingering release directory kept", err)
	}
	if s := status(); s["state"] != "complete" || s["revision"] != "new" || current.Load() != u || u.exited.Load() {
		t.Fatalf("serving tree or completed status changed: %v", s)
	}
}

func TestCompleteWhileLongLivedConnectionsOpenThenCloseAtDeadline(t *testing.T) {
	drain := 3 * time.Second
	old, u, sse, ws, status := lingeringSwap(t, drain)
	if !streamEnds(sse, drain+2*time.Second) {
		t.Fatal("event stream outlived the drain deadline")
	}
	if !webSocketCloses(ws, 2*time.Second) {
		t.Fatal("WebSocket not closed with 1001 at the deadline")
	}
	assertLingererGone(t, old, u, status)
}

func TestNextPrepareReapsLingerer(t *testing.T) {
	old, u, sse, ws, status := lingeringSwap(t, time.Minute)
	began := time.Now()
	if err := stopLingering(lingerCutGrace); err != nil {
		t.Fatal(err)
	}
	if elapsed := time.Since(began); elapsed > 2*time.Second {
		t.Fatalf("reap took %v", elapsed)
	}
	if !streamEnds(sse, time.Second) || !webSocketCloses(ws, time.Second) {
		t.Fatal("long-lived connections survived the next prepare")
	}
	assertLingererGone(t, old, u, status)
}

func TestNoRevertToLingererAfterComplete(t *testing.T) {
	old, u, _, _, _ := lingeringSwap(t, time.Minute)
	// A later failure, here of the next candidate, can only fall back to the serving tree.
	next := startFixture(t, "next", true)
	fail(next, map[string]any{}, fmt.Errorf("candidate failed"))
	if current.Load() != u || lingering.Load() != old || oldGeneration.Load() != nil || !next.exited.Load() {
		t.Fatal("failure routed back to the lingering tree")
	}
}

func TestLingererCrashAfterComplete(t *testing.T) {
	old, u, sse, _, status := lingeringSwap(t, time.Minute)
	syscall.Kill(old.pid, syscall.SIGKILL)
	if !streamEnds(sse, 2*time.Second) {
		t.Fatal("event stream of the crashed tree stayed open")
	}
	assertLingererGone(t, old, u, status)
}

func TestShutdownClosesLingeringWebSocket(t *testing.T) {
	old, u, _, ws, status := lingeringSwap(t, time.Minute)
	stopping.Store(true)
	defer stopping.Store(false)
	at := time.Now().Add(-30 * time.Second)
	stopAt.Store(&at)
	defer stopAt.Store(nil)
	shutdown(&http.Server{})
	if !webSocketCloses(ws, time.Second) {
		t.Fatal("hijacked WebSocket not closed at task stop")
	}
	if !old.exited.Load() || !u.exited.Load() || lingering.Load() != nil {
		t.Fatal("task stop left a process tree")
	}
	if s := status(); s["state"] != "complete" {
		t.Fatalf("status=%v", s)
	}
}
