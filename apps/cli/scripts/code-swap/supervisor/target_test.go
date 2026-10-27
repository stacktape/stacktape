package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// albTask is a swap task behind an application load balancer whose target group checks /health.
func albTask(t *testing.T) func() map[string]any {
	status := swapTask(t, 5*time.Second)
	oldPath, oldBudget := targetCheckPath, targetCheckBudget
	targetCheckPath, targetCheckBudget = "/health", 500*time.Millisecond
	t.Cleanup(func() { targetCheckPath, targetCheckBudget = oldPath, oldBudget })
	return status
}

func get(t *testing.T, path string) *http.Response {
	t.Helper()
	resp, err := http.Get(proxied(path))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp
}

func TestCandidateMustPassLoadBalancerCheckBeforeSwitch(t *testing.T) {
	albTask(t)
	old := startFixture(t, "old", false)
	current.Store(old)
	u := startFixture(t, "new", true)
	candidate.Store(u)
	flag := filepath.Join(u.cmd.Dir, "unhealthy")
	if err := os.WriteFile(flag, nil, 0600); err != nil {
		t.Fatal(err)
	}
	// Any response counts as reachability; the load balancer's check needs 200 and fails the preparation.
	if !health(proxyPort, "new", true) {
		t.Fatal("candidate not reachable")
	}
	err := awaitTargetCheck(u)
	if err == nil || !strings.Contains(err.Error(), "returned 500") {
		t.Fatalf("err=%v", err)
	}
	// The load balancer's own checks keep reaching the serving code while the candidate prepares.
	if resp := get(t, "/health"); resp.StatusCode != 200 || resp.Header.Get("X-Lab-Revision") != "old" {
		t.Fatalf("load balancer check saw %d from %q", resp.StatusCode, resp.Header.Get("X-Lab-Revision"))
	}
	os.Remove(flag)
	if err := awaitTargetCheck(u); err != nil {
		t.Fatal(err)
	}
}

func TestLoadBalancerCheckDoesNotFollowRedirects(t *testing.T) {
	albTask(t)
	targetCheckPath = "/moved"
	old := startFixture(t, "old", false)
	current.Store(old)
	u := startFixture(t, "new", true)
	candidate.Store(u)
	// The load balancer counts the 302 as a failure, even though the redirect target would answer 200.
	if err := awaitTargetCheck(u); err == nil || !strings.Contains(err.Error(), "returned 302") {
		t.Fatalf("err=%v", err)
	}
}

func TestFailingLoadBalancerCheckAfterSwitchRevertsToOldCode(t *testing.T) {
	status := albTask(t)
	old := startFixture(t, "old", false)
	current.Store(old)
	u := startFixture(t, "new", true)
	if err := os.WriteFile(filepath.Join(u.cmd.Dir, "unhealthy"), nil, 0600); err != nil {
		t.Fatal(err)
	}
	err := commit(u, map[string]any{}, oomCount())
	if err == nil || !strings.Contains(err.Error(), "post-switch load balancer health check /health returned 500") {
		t.Fatalf("err=%v", err)
	}
	s := status()
	timings := s["timings"].(map[string]any)
	if s["state"] != "failed" || timings["localRevert"] != "warm" || timings["candidateReaped"] != true {
		t.Fatalf("status=%v", s)
	}
	if current.Load() != old || old.exited.Load() || !u.exited.Load() {
		t.Fatal("the old code is not serving after the failed check")
	}
	if resp := get(t, "/health"); resp.StatusCode != 200 || resp.Header.Get("X-Lab-Revision") != "old" {
		t.Fatalf("load balancer check saw %d from %q", resp.StatusCode, resp.Header.Get("X-Lab-Revision"))
	}
}

func TestSwapBehindLoadBalancerCompletesWhenCheckPasses(t *testing.T) {
	status := albTask(t)
	old := startFixture(t, "old", false)
	current.Store(old)
	u := startFixture(t, "new", true)
	if err := commit(u, map[string]any{}, oomCount()); err != nil {
		t.Fatal(err)
	}
	if s := status(); s["state"] != "complete" || current.Load() != u || !old.exited.Load() {
		t.Fatalf("status=%v", s)
	}
}

func TestProxyForwardsClientHeadersUnchanged(t *testing.T) {
	swapTask(t, time.Second)
	type seenRequest struct {
		header http.Header
		host   string
	}
	seen := make(chan seenRequest, 1)
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen <- seenRequest{r.Header.Clone(), r.Host}
	}))
	defer backend.Close()
	u := &generation{revision: "app", requests: map[*requestLease]bool{}}
	u.useProxy(backend.URL)
	current.Store(u)

	req, _ := http.NewRequest("GET", proxied("/path?q=1"), nil)
	req.Host = "api.example.com"
	req.Header.Set("X-Forwarded-For", "203.0.113.7")
	req.Header.Set("X-Forwarded-Proto", "https")
	req.Header.Set("X-Forwarded-Port", "443")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	r := <-seen
	got, _ := json.Marshal(map[string]any{"for": r.header.Values("X-Forwarded-For"), "proto": r.header.Get("X-Forwarded-Proto"), "port": r.header.Get("X-Forwarded-Port"), "host": r.host})
	if string(got) != `{"for":["203.0.113.7"],"host":"api.example.com","port":"443","proto":"https"}` {
		t.Fatalf("forwarded %s", got)
	}

	// Without a forwarded header, as on a direct connection, the application sees none.
	get(t, "/")
	if r := <-seen; r.header.Get("X-Forwarded-For") != "" {
		t.Fatalf("proxy added X-Forwarded-For %q", r.header.Get("X-Forwarded-For"))
	}
}

// stopTask stops the task as ECS does (SIGTERM) with the routing hold ending holdLeft from now. The channel closes when
// the supervisor has stopped the task.
func stopTask(t *testing.T, holdLeft time.Duration) chan struct{} {
	t.Helper()
	at := time.Now().Add(holdLeft - 30*time.Second)
	stopAt.Store(&at)
	t.Cleanup(func() {
		stopAt.Store(nil)
		stopping.Store(false)
	})
	done := make(chan struct{})
	go func() { shutdown(&http.Server{}); close(done) }()
	return done
}

func TestTaskStopBehindLoadBalancerSkipsRoutingHold(t *testing.T) {
	albTask(t)
	u := startFixture(t, "app", false)
	current.Store(u)
	// The load balancer has finished its deregistration delay, so no request is in flight: the stop does not wait.
	select {
	case <-stopTask(t, 2*time.Second):
	case <-time.After(time.Second):
		t.Fatal("task stop waited for the routing hold behind a load balancer")
	}
	if !u.exited.Load() {
		t.Fatal("application not stopped")
	}
}

func TestTaskStopBehindLoadBalancerWaitsForInflightRequest(t *testing.T) {
	albTask(t)
	u := startFixture(t, "app", false)
	current.Store(u)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", proxied("/wait"), nil)
	go http.DefaultClient.Do(req)
	waitFor(t, 2*time.Second, func() bool { return u.inflight.Load() == 1 })
	done := stopTask(t, 5*time.Second)
	select {
	case <-done:
		t.Fatal("task stop cut a request in flight")
	case <-time.After(300 * time.Millisecond):
	}
	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("task stop kept waiting after the last request finished")
	}
}

func TestTaskStopBehindHttpApiKeepsRoutingHold(t *testing.T) {
	swapTask(t, 5*time.Second)
	u := startFixture(t, "app", false)
	current.Store(u)
	// Cloud Map can still route requests to the task, so the proxy keeps serving until the hold ends.
	started := time.Now()
	<-stopTask(t, time.Second)
	if elapsed := time.Since(started); elapsed < 900*time.Millisecond {
		t.Fatalf("task stop ended the routing hold after %v", elapsed)
	}
	if !u.exited.Load() {
		t.Fatal("application not stopped")
	}
}
