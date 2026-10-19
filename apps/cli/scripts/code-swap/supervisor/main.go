package main

// Source-only runtime qualification harness. No installed CLI activation, authority or ECS readiness.
import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

type generation struct {
	cmd         *exec.Cmd
	port        int
	revision    string
	proxy       *httputil.ReverseProxy
	inflight    atomic.Int64
	exited      atomic.Bool
	membership  map[int]string
	treeMu      sync.Mutex
	termAt      time.Time
	drainUntil  time.Time
	treeFailure bool
	requestsMu  sync.Mutex
	requests    map[*requestLease]bool
}
type requestLease struct {
	cancel context.CancelFunc
	conn   net.Conn
}
type record struct {
	Revision, Key, Sha256, Phase string
	Size                         int64
}

var current, candidate atomic.Pointer[generation]
var routing sync.Mutex
var taskID, app, table, bucket, baseline string
var privateIP = "127.0.0.1"
var siblings bool
var proxyPort = 8080
var local = &http.Client{Timeout: 2 * time.Second}
var stopping atomic.Bool
var stop = make(chan struct{})
var stopAt atomic.Pointer[time.Time]
var grace, drain = 2 * time.Second, 2 * time.Second
var oldGeneration *generation

func must(err error) {
	if err != nil {
		panic(err)
	}
}
func now() int64             { return time.Now().UnixMilli() }
func ms(t time.Time) float64 { return float64(time.Since(t).Microseconds()) / 1000 }
func put(key string, value any) {
	b, err := json.Marshal(value)
	must(err)
	fmt.Printf("{\"benchmarkEvent\":\"status\",\"atMs\":%d,\"data\":%s}\n", now(), b)
	if dir := os.Getenv("STP_BENCH_LOCAL"); dir != "" {
		must(os.WriteFile(dir+"/"+key+".tmp", b, 0600))
		must(os.Rename(dir+"/"+key+".tmp", dir+"/"+key+".json"))
		return
	}
	must(awsJSON("dynamodb", "DynamoDB_20120810.PutItem", map[string]any{"TableName": table, "Item": map[string]any{"pk": map[string]string{"S": key}, "data": map[string]string{"S": string(b)}}}, nil))
}
func read() record {
	var r record
	if dir := os.Getenv("STP_BENCH_LOCAL"); dir != "" {
		b, err := os.ReadFile(dir + "/release.json")
		if os.IsNotExist(err) {
			return r
		}
		must(err)
		must(json.Unmarshal(b, &r))
		return r
	}
	var out struct{ Item map[string]map[string]string }
	must(awsJSON("dynamodb", "DynamoDB_20120810.GetItem", map[string]any{"TableName": table, "Key": map[string]any{"pk": map[string]string{"S": "release#" + app}}, "ConsistentRead": true}, &out))
	if d, ok := out.Item["data"]; ok {
		must(json.Unmarshal([]byte(d["S"]), &r))
	}
	return r
}
func health(port int, rev string, prep bool) bool {
	req, _ := http.NewRequest("GET", fmt.Sprintf("http://%s:%d/", privateIP, port), nil)
	if prep {
		req.Header.Set("X-Lab-Prepare", "1")
	}
	resp, err := local.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	_, err = io.Copy(io.Discard, resp.Body)
	return err == nil && (port != proxyPort || resp.Header.Get("X-Lab-Revision") == rev)
}
func spawn(dir, rev string, t map[string]any, isCandidate bool) (*generation, error) {
	if stopping.Load() {
		return nil, fmt.Errorf("task stopping")
	}
	entry := os.Getenv("STP_BENCH_ENTRY")
	if entry == "" {
		entry = "index.mjs"
	}
	value := -998
	if isCandidate {
		value = 500
	}
	self, err := os.Executable()
	if err != nil {
		return nil, err
	}
	port := 20000 + rand.Intn(12000)
	c := exec.Command(self, "launch", strconv.Itoa(value), "node", entry)
	c.Dir = dir
	c.Env = append(os.Environ(), fmt.Sprintf("PORT=%d", port))
	c.Stdout = os.Stdout
	c.Stderr = os.Stderr
	c.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	t["spawnAtMs"] = now()
	started := time.Now()
	if err := c.Start(); err != nil {
		return nil, err
	}
	u := &generation{cmd: c, port: port, revision: rev, membership: map[int]string{}, requests: map[*requestLease]bool{}}
	go func() {
		err := c.Wait()
		u.exited.Store(true)
		fmt.Printf("{\"benchmarkEvent\":\"processExit\",\"atMs\":%d,\"pid\":%d,\"failed\":%t}\n", now(), c.Process.Pid, err != nil)
	}()
	target, _ := url.Parse(fmt.Sprintf("http://%s:%d", privateIP, port))
	u.proxy = httputil.NewSingleHostReverseProxy(target)
	u.proxy.FlushInterval = -1
	u.proxy.Transport = &http.Transport{MaxIdleConnsPerHost: 32, IdleConnTimeout: time.Second, ResponseHeaderTimeout: 30 * time.Second}
	u.proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		fmt.Printf("{\"benchmarkEvent\":\"proxyError\",\"atMs\":%d,\"revision\":%q}\n", now(), rev)
		http.Error(w, "upstream unavailable", 502)
	}
	for {
		_, treeErr := u.members()
		if stopping.Load() || u.exited.Load() || treeErr != nil || time.Since(started) > 30*time.Second {
			u.terminate()
			u.remove()
			return nil, fmt.Errorf("candidate startup failed: exit=%t tree=%v", u.exited.Load(), treeErr)
		}
		if health(port, rev, false) {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	t["startupMs"] = ms(started)
	t["readyAtMs"] = now()
	return u, nil
}

// Hijacked WebSocket connections remain counted until the reverse proxy returns.
type trackedWriter struct {
	http.ResponseWriter
	u     *generation
	lease *requestLease
}

func (w *trackedWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }
func (w *trackedWriter) Flush()                      { http.NewResponseController(w.ResponseWriter).Flush() }
func (w *trackedWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	c, b, err := http.NewResponseController(w.ResponseWriter).Hijack()
	if err == nil {
		w.u.requestsMu.Lock()
		w.lease.conn = c
		w.u.requestsMu.Unlock()
	}
	return c, b, err
}
func proxy(w http.ResponseWriter, r *http.Request) {
	routing.Lock()
	u := current.Load()
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	if r.Header.Get("X-Lab-Prepare") == "1" && host == privateIP {
		if c := candidate.Load(); c != nil {
			u = c
		}
	}
	if u == nil {
		routing.Unlock()
		http.Error(w, "not serving", 503)
		return
	}
	u.inflight.Add(1)
	routing.Unlock()
	ctx, cancel := context.WithCancel(r.Context())
	lease := &requestLease{cancel: cancel}
	u.requestsMu.Lock()
	u.requests[lease] = true
	u.requestsMu.Unlock()
	defer func() {
		cancel()
		u.requestsMu.Lock()
		delete(u.requests, lease)
		u.requestsMu.Unlock()
		u.inflight.Add(-1)
	}()
	r = r.WithContext(ctx)
	r.Header.Del("X-Lab-Prepare")
	w.Header().Set("X-Lab-Now-Ms", fmt.Sprint(now()))
	w.Header().Set("X-Lab-Task", taskID)
	w.Header().Set("X-Lab-Revision", u.revision)
	u.proxy.ServeHTTP(&trackedWriter{w, u, lease}, r)
}
func (u *generation) closeRequests() {
	u.requestsMu.Lock()
	defer u.requestsMu.Unlock()
	deadline := time.Now().Add(100 * time.Millisecond)
	for lease := range u.requests {
		if lease.conn != nil {
			lease.conn.SetWriteDeadline(deadline)
			lease.conn.Write([]byte{0x88, 2, 3, 0xe9})
			lease.conn.Close()
		}
		lease.cancel()
	}
}

var revisionPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,100}$`)

func prepare(r record, t map[string]any) (*generation, error) {
	if !revisionPattern.MatchString(r.Revision) {
		return nil, fmt.Errorf("unsafe revision")
	}
	t["memoryBefore"] = memory()
	started := time.Now()
	var data []byte
	if os.Getenv("STP_BENCH_LOCAL") != "" {
		b, err := os.ReadFile(r.Key)
		if err != nil {
			return nil, err
		}
		data = b
	} else {
		obj, err := s3Get(bucket, r.Key, "")
		if err != nil {
			return nil, err
		}
		if obj.NotFound {
			return nil, fmt.Errorf("missing bundle")
		}
		data = obj.Body
	}
	t["downloadMs"] = ms(started)
	t["bundleBytes"] = len(data)
	started = time.Now()
	dir := filepath.Join(os.TempDir(), "stp-code-swap", r.Revision)
	if err := applyBundle(data, r.Sha256, r.Size, dir); err != nil {
		return nil, err
	}
	t["extractMs"] = ms(started)
	u, err := spawn(dir, r.Revision, t, true)
	if err != nil {
		os.RemoveAll(dir)
		return nil, err
	}
	candidate.Store(u)
	started = time.Now()
	if current.Load() != nil && !health(proxyPort, r.Revision, true) {
		candidate.Store(nil)
		u.terminate()
		u.remove()
		return nil, fmt.Errorf("prepare proxy check failed")
	}
	t["prepareHealthMs"] = ms(started)
	t["preparedAtMs"] = now()
	return u, nil
}
func transitionCheck(u *generation, oom int64) error {
	if stopping.Load() {
		return fmt.Errorf("task stopping")
	}
	count := oomCount()
	if count < 0 || count != oom {
		return fmt.Errorf("OOM counter changed or unavailable")
	}
	if u.exited.Load() {
		return fmt.Errorf("candidate exited")
	}
	if _, err := u.members(); err != nil {
		return err
	}
	if u.treeFailure {
		return fmt.Errorf("unexplained worker exit during overlap")
	}
	return nil
}
func activate(u *generation, t map[string]any, oom int64) error {
	if err := transitionCheck(u, oom); err != nil {
		return err
	}
	t["commitDetectedAtMs"] = now()
	routing.Lock()
	old := current.Swap(u)
	candidate.Store(nil)
	routing.Unlock()
	oldGeneration = old
	t["switchedAtMs"] = now()
	started := time.Now()
	if !health(proxyPort, u.revision, false) {
		return fmt.Errorf("post-switch check failed")
	}
	t["postHealthMs"] = ms(started)
	t["postHealthAtMs"] = now()
	started = time.Now()
	deadline := started.Add(drain)
	old.drainUntil = deadline
	nextCheck := time.Now().Add(time.Second)
	for old.inflight.Load() > 0 && time.Now().Before(deadline) {
		if err := transitionCheck(u, oom); err != nil {
			return err
		}
		if time.Now().After(nextCheck) {
			if !health(proxyPort, u.revision, false) {
				return fmt.Errorf("drain check failed")
			}
			nextCheck = time.Now().Add(time.Second)
		}
		time.Sleep(5 * time.Millisecond)
	}
	t["drainMs"] = ms(started)
	t["oldInflightAtTerm"] = old.inflight.Load()
	t["forcedDrain"] = old.inflight.Load() > 0
	if old.inflight.Load() > 0 {
		old.closeRequests()
	}
	started = time.Now()
	t["oldPid"] = old.cmd.Process.Pid
	// Continue transition monitoring during the old tree's shutdown grace.
	finished := make(chan error, 1)
	go func() { finished <- old.terminate() }()
	for {
		select {
		case err := <-finished:
			if err != nil {
				return err
			}
			goto reaped
		case <-time.After(5 * time.Millisecond):
			if err := transitionCheck(u, oom); err != nil {
				<-finished
				return err
			}
		}
	}
reaped:
	t["oldExitMs"] = ms(started)
	t["oldReapedAtMs"] = now()
	if err := transitionCheck(u, oom); err != nil {
		return err
	}
	if !health(proxyPort, u.revision, false) {
		return fmt.Errorf("final proxy check failed")
	}
	if err := u.protect(); err != nil {
		return err
	}
	t["newPid"] = u.cmd.Process.Pid
	t["memoryAfter"] = memory()
	old.remove()
	oldGeneration = nil
	return nil
}
func status(state, rev string, t map[string]any, reason string) {
	put("status#"+app+"#"+taskID, map[string]any{"state": state, "revision": rev, "task": taskID, "timings": t, "reason": reason})
}
func fail(u *generation, t map[string]any, err error) {
	// A failed attempt remains sticky until a different revision. Never report restored baseline as swap success.
	t["oomAfter"] = oomCount()
	status("failed", u.revision, t, err.Error())
	if old := oldGeneration; old != nil {
		if !old.exited.Load() && old.termAt.IsZero() && health(old.port, old.revision, false) {
			routing.Lock()
			current.Store(old)
			routing.Unlock()
			t["localRevert"] = "warm"
			oldGeneration = nil
		}
	}
	if current.Load() == u {
		// The baseline may already be reaped. Restart and check it before routing; preserve its directory until then.
		dir := baseline
		rev := "baseline"
		if oldGeneration != nil {
			dir = oldGeneration.cmd.Dir
			rev = oldGeneration.revision
		}
		replacement, e := spawn(dir, rev, map[string]any{}, false)
		if e != nil {
			panic("baseline restart failed")
		}
		routing.Lock()
		current.Store(replacement)
		routing.Unlock()
		t["localRevert"] = "restart"
		t["baselineRestartedAtMs"] = now()
	}
	candidate.Store(nil)
	u.closeRequests()
	must(u.terminate())
	u.remove()
	if oldGeneration != nil {
		must(oldGeneration.terminate())
		if oldGeneration.cmd.Dir != current.Load().cmd.Dir {
			oldGeneration.remove()
		}
		oldGeneration = nil
	}
	t["candidateReaped"] = true
	status("failed", u.revision, t, err.Error())
}
func shutdown(server *http.Server) {
	// Task-stop qualification only. ECS timeout synthesis/readiness remains Phase 3.
	stopping.Store(true)
	begin := time.Now()
	if at := stopAt.Load(); at != nil {
		begin = *at
	}
	candidateTree := candidate.Swap(nil)
	if candidateTree != nil && candidateTree != current.Load() {
		candidateTree.closeRequests()
		must(candidateTree.terminate())
		candidateTree.remove()
	}

	d := 30 * time.Second
	if drain > d {
		d = drain
	}
	deadline := begin.Add(d)
	terminations := map[*generation]chan error{}
	terminateAsync := func(u *generation) {
		if u == nil || terminations[u] != nil {
			return
		}
		u.closeRequests()
		done := make(chan error, 1)
		terminations[u] = done
		go func() { done <- u.terminate() }()
	}
	for time.Now().Before(deadline) {
		if old := oldGeneration; old != nil && (old.inflight.Load() == 0 || !time.Now().Before(old.drainUntil)) {
			terminateAsync(old)
		}
		time.Sleep(10 * time.Millisecond)
	}
	server.Close()
	terminateAsync(current.Load())
	terminateAsync(oldGeneration)
	for u, done := range terminations {
		must(<-done)
		u.remove()
	}

}
func main() {
	if len(os.Args) == 6 && os.Args[1] == "apply" {
		data, err := os.ReadFile(os.Args[2])
		must(err)
		size, err := strconv.ParseInt(os.Args[4], 10, 64)
		must(err)
		must(applyBundle(data, os.Args[3], size, os.Args[5]))
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "launch" {
		launch()
		return
	}
	// Adopt and reap grandchildren; Cmd.Wait retains ownership of direct application leaders.
	_, _, errno := syscall.Syscall6(syscall.SYS_PRCTL, 36, 1, 0, 0, 0, 0)
	if errno != 0 {
		panic(errno)
	}
	if n, err := strconv.Atoi(os.Getenv("STP_BENCH_PORT")); err == nil {
		proxyPort = n
	}
	app = "node"
	table = os.Getenv("STP_BENCH_TABLE")
	bucket = os.Getenv("STP_BENCH_BUCKET")
	baseline = os.Getenv("STP_BENCH_BASELINE")
	if baseline == "" {
		baseline = "/app"
	}
	if n, err := strconv.Atoi(os.Getenv("STP_BENCH_GRACE_S")); err == nil {
		grace = time.Duration(n) * time.Second
	}
	drain = grace
	if grace < 0 || grace > 59*time.Second {
		panic("unsupported task stop budget")
	}
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGTERM, syscall.SIGINT)
	go func() { <-signals; at := time.Now(); stopAt.Store(&at); stopping.Store(true); close(stop) }()
	if os.Getenv("STP_BENCH_LOCAL") != "" {
		taskID = "local"
	} else {
		resp, err := local.Get(os.Getenv("ECS_CONTAINER_METADATA_URI_V4") + "/task")
		must(err)
		var meta struct {
			TaskARN    string
			Limits     struct{ Memory int64 }
			Containers []struct {
				Networks []struct{ IPv4Addresses []string }
			}
		}
		must(json.NewDecoder(resp.Body).Decode(&meta))
		resp.Body.Close()
		siblings = len(meta.Containers) != 1
		if meta.Limits.Memory > 0 {
			must(os.Setenv("STP_BENCH_TASK_MIB", strconv.FormatInt(meta.Limits.Memory, 10)))
		} else {
			must(os.Unsetenv("STP_BENCH_TASK_MIB"))
		}
		taskID = meta.TaskARN[strings.LastIndex(meta.TaskARN, "/")+1:]
		for _, c := range meta.Containers {
			for _, n := range c.Networks {
				if len(n.IPv4Addresses) > 0 {
					privateIP = n.IPv4Addresses[0]
				}
			}
		}
	}
	boot := time.Now()
	t := map[string]any{"bootAtMs": now()}
	r := read()
	var u *generation
	var err error
	// Refuse unsupported protection before executing any application; no unsafe score approximation.
	must(score(os.Getpid(), -998))
	if r.Revision != "" && r.Phase == "commit" {
		u, err = prepare(r, t)
	} else {
		u, err = spawn(baseline, "baseline", t, false)
	}
	must(err)
	must(u.protect())
	current.Store(u)
	candidate.Store(nil)
	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", proxyPort))
	must(err)
	t["listenerAtMs"] = now()
	t["bootToServingMs"] = ms(boot)
	t["memoryAfter"] = memory()
	server := &http.Server{Handler: http.HandlerFunc(proxy), IdleTimeout: 75 * time.Second}
	go func() { server.Serve(listener) }()
	status("complete", u.revision, t, "")
	var prepared *generation
	var p record
	var timing map[string]any
	var oom int64
	failed := ""
	for !stopping.Load() {
		if current.Load().exited.Load() {
			panic("serving process exited")
		}
		r = read()
		if prepared != nil {
			err := transitionCheck(prepared, oom)
			if err != nil {
				fail(prepared, timing, err)
				failed = p.Revision
				prepared = nil
			} else if r.Revision != p.Revision || r.Phase == "abort" {
				candidate.Store(nil)
				must(prepared.terminate())
				prepared.remove()
				timing["candidateReaped"] = true
				status("aborted", p.Revision, timing, "")
				prepared = nil
			}
		}
		if r.Revision != "" && r.Revision != current.Load().revision && r.Revision != failed {
			if prepared == nil && r.Phase == "prepare" {
				timing = map[string]any{"detectedAtMs": now()}
				m := memory()
				timing["memoryBefore"] = m
				if !m["allowed"].(bool) {
					status("refused", r.Revision, timing, "memory_screen")
					failed = r.Revision
					continue
				}
				if err := current.Load().protect(); err != nil {
					status("refused", r.Revision, timing, "unprotected_tree")
					failed = r.Revision
					continue
				}
				oom = oomCount()
				if oom < 0 {
					status("refused", r.Revision, timing, "unknown_oom_counter")
					failed = r.Revision
					continue
				}
				timing["oomBefore"] = oom
				p = r
				prepared, err = prepare(r, timing)
				if err != nil {
					timing["candidateReaped"] = true
					status("failed", r.Revision, timing, err.Error())
					failed = r.Revision
					continue
				}
				if err = transitionCheck(prepared, oom); err != nil {
					fail(prepared, timing, err)
					failed = r.Revision
					prepared = nil
					continue
				}
				status("prepared", r.Revision, timing, "")
			}
			if prepared != nil && r.Phase == "commit" && r.Revision == p.Revision {
				if err := activate(prepared, timing, oom); err != nil {
					if !stopping.Load() {
						fail(prepared, timing, err)
						failed = r.Revision
					}
				} else {
					status("complete", r.Revision, timing, "")
				}
				prepared = nil
			}
		}
		delay := 800 + rand.Intn(401)
		if prepared != nil {
			delay = 180 + rand.Intn(41)
		}
		select {
		case <-stop:
		case <-time.After(time.Duration(delay) * time.Millisecond):
		}
	}
	shutdown(server)
}

func parseHTTPDate(h http.Header, key string) time.Time { t, _ := http.ParseTime(h.Get(key)); return t }
func memory() map[string]any {
	base, version := memoryController()
	taskMiB, _ := strconv.ParseInt(os.Getenv("STP_BENCH_TASK_MIB"), 10, 64)
	return memoryAt(base, version, taskMiB, siblings)
}
func memoryAt(base string, version int, taskMiB int64, siblings bool) map[string]any {
	peakFile, limitFile, usageFile := "memory.max_usage_in_bytes", "memory.limit_in_bytes", "memory.usage_in_bytes"
	if version == 2 {
		peakFile, limitFile, usageFile = "memory.peak", "memory.max", "memory.current"
	}

	readNum := func(f string) int64 {
		b, err := os.ReadFile(base + f)
		if err != nil {
			return -1
		}
		n, err := strconv.ParseInt(strings.TrimSpace(string(b)), 10, 64)
		if err != nil {
			return -1
		}
		return n
	}
	peak := readNum(peakFile)
	rawLimit := readNum(limitFile)
	limit := taskMiB * 1024 * 1024
	if rawLimit > 0 && rawLimit < limit {
		limit = rawLimit
	}
	need := 2.5*float64(peak) + 64*1024*1024
	return map[string]any{"atMs": now(), "cgroupVersion": version, "peakFile": base + peakFile, "peakBytes": peak, "rawLimitBytes": rawLimit, "effectiveLimitBytes": limit, "usageBytes": readNum(usageFile), "requiredBytes": need, "allowed": version > 0 && !siblings && screen(peak, limit)}
}

// Resolve the actual containing controller; a new kernel alone says nothing about Fargate's cgroup version.
func memoryController() (string, int) {
	groups, err := os.ReadFile("/proc/self/cgroup")
	if err != nil {
		return "/unknown/", 0
	}
	mounts, err := os.ReadFile("/proc/self/mountinfo")
	if err != nil {
		return "/unknown/", 0
	}
	for _, group := range strings.Split(string(groups), "\n") {
		fields := strings.SplitN(group, ":", 3)
		if len(fields) != 3 {
			continue
		}
		version := 1
		if fields[0] == "0" && fields[1] == "" {
			version = 2
		} else if !strings.Contains(","+fields[1]+",", ",memory,") {
			continue
		}
		for _, line := range strings.Split(string(mounts), "\n") {
			parts := strings.SplitN(line, " - ", 2)
			if len(parts) != 2 {
				continue
			}
			left, right := strings.Fields(parts[0]), strings.Fields(parts[1])
			if len(left) < 5 || len(right) < 3 {
				continue
			}
			if version == 1 && (right[0] != "cgroup" || !strings.Contains(","+right[2]+",", ",memory,")) {
				continue
			}
			if version == 2 && right[0] != "cgroup2" {
				continue
			}
			root, mount := left[3], left[4]
			relative := strings.TrimPrefix(fields[2], root)
			if root != "/" && !strings.HasPrefix(fields[2], root) {
				continue
			}
			path := mount + "/" + strings.TrimPrefix(relative, "/")
			if !strings.HasSuffix(path, "/") {
				path += "/"
			}
			return path, version
		}
	}
	return "/unknown/", 0
}

func oomCount() int64 {
	base, version := memoryController()
	name := "memory.oom_control"
	field := "oom_kill"
	if version == 2 {
		name = "memory.events"
	}
	b, err := os.ReadFile(base + name)
	if err != nil {
		return -1
	}
	for _, line := range strings.Split(string(b), "\n") {
		f := strings.Fields(line)
		if len(f) == 2 && f[0] == field {
			n, err := strconv.ParseInt(f[1], 10, 64)
			if err == nil {
				return n
			}
		}
	}
	return -1
}

func screen(peak, limit int64) bool {
	return peak > 0 && limit > 0 && peak <= (9*limit-640*(1<<20))/25 && limit < 1<<50
}
