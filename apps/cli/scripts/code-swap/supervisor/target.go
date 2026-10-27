package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"
)

// Behind an application load balancer, the target group sends GET <path> to the task's port and needs 200. The
// supervisor runs the same check on the candidate before the switch, and on the serving code after it, so a swap never
// leaves the load balancer checking code that fails. Behind an HTTP API the path is empty and only reachability counts.
var targetCheckPath string
var targetCheckClient = newTargetCheckClient(4 * time.Second)

// A candidate may answer before it is ready, for example while it connects to a database. It gets this long to pass.
var targetCheckBudget = 30 * time.Second

// Like the load balancer, the check does not follow redirects: a 3xx response fails it.
func newTargetCheckClient(timeout time.Duration) *http.Client {
	return &http.Client{Timeout: timeout, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
}

func configureTargetCheck() {
	targetCheckPath = os.Getenv("STP_CODE_SWAP_TARGET_CHECK_PATH")
	if n, err := strconv.Atoi(os.Getenv("STP_CODE_SWAP_TARGET_CHECK_TIMEOUT_S")); err == nil && n > 0 {
		targetCheckClient = newTargetCheckClient(time.Duration(n) * time.Second)
	}
}

// targetCheck sends the load balancer's check through the proxy to the candidate (prep) or to the serving generation.
func targetCheck(rev string, prep bool) error {
	if targetCheckPath == "" {
		return nil
	}
	req, err := http.NewRequest("GET", fmt.Sprintf("http://%s:%d%s", privateIP, proxyPort, targetCheckPath), nil)
	if err != nil {
		return err
	}
	if prep {
		req.Header.Set("X-Lab-Prepare", "1")
	}
	req.Header.Set("X-Lab-Check", "1")
	req.Header.Set("User-Agent", "ELB-HealthChecker/2.0")
	resp, err := targetCheckClient.Do(req)
	if err != nil {
		return fmt.Errorf("load balancer health check %s failed: %w", targetCheckPath, err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	if served := resp.Header.Get("X-Lab-Revision"); served != rev {
		return fmt.Errorf("load balancer health check %s reached revision %q", targetCheckPath, served)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("load balancer health check %s returned %d, not 200", targetCheckPath, resp.StatusCode)
	}
	return nil
}

// awaitTargetCheck retries the candidate's check until it passes, the candidate exits, or the budget runs out.
func awaitTargetCheck(u *generation) error {
	deadline := time.Now().Add(targetCheckBudget)
	for {
		err := targetCheck(u.revision, true)
		if err == nil || stopping.Load() || u.exited.Load() || !time.Now().Before(deadline) {
			return err
		}
		time.Sleep(250 * time.Millisecond)
	}
}
