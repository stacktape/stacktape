package main

// Disposable timing prototype. Deliberately omits release security and recovery.
import (
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
	"strconv"
	"strings"
	"sync/atomic"
	"syscall"
	"time"
)

type generation struct {
	cmd      *exec.Cmd
	port     int
	revision string
	proxy    *httputil.ReverseProxy
	inflight atomic.Int64
	done     chan error
}
type record struct {
	Revision, Key, Sha256, Phase string
	Size                         int64
}

var current, candidate atomic.Pointer[generation]
var taskID, app, table, bucket string
var baseline string
var local = &http.Client{Timeout: 2 * time.Second}

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
	if dir := os.Getenv("STP_BENCH_LOCAL"); dir != "" {
		must(os.WriteFile(dir+"/"+key+".json", b, 0600))
		return
	}
	must(awsJSON("dynamodb", "DynamoDB_20120810.PutItem", map[string]any{"TableName": table, "Item": map[string]any{"pk": map[string]string{"S": key}, "data": map[string]string{"S": string(b)}}}, nil))
}
func read() record {
	if dir := os.Getenv("STP_BENCH_LOCAL"); dir != "" {
		var r record
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
	var r record
	if d, ok := out.Item["data"]; ok {
		must(json.Unmarshal([]byte(d["S"]), &r))
	}
	return r
}
func health(port int, rev string, prep bool) bool {
	req, _ := http.NewRequest("GET", fmt.Sprintf("http://127.0.0.1:%d/", port), nil)
	if prep {
		req.Header.Set("X-Lab-Prepare", "1")
	}
	resp, err := local.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	return port != 8080 || resp.Header.Get("X-Lab-Revision") == rev
}
func spawn(dir, rev string, t map[string]any) *generation {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	must(err)
	port := l.Addr().(*net.TCPAddr).Port
	l.Close()
	// Choose below the ephemeral range, as established by lab2.
	port = 20000 + rand.Intn(10000)
	var c *exec.Cmd
	if app == "node" {
		entry := os.Getenv("STP_BENCH_ENTRY")
		if entry == "" {
			entry = "index.mjs"
		}
		c = exec.Command("node", entry)

	}
	c.Dir = dir
	c.Env = append(os.Environ(), fmt.Sprintf("PORT=%d", port))
	c.Stdout = os.Stdout
	c.Stderr = os.Stderr
	c.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	started := time.Now()
	t["spawnAtMs"] = now()
	must(c.Start())
	u := &generation{cmd: c, port: port, revision: rev, done: make(chan error, 1)}
	go func() { u.done <- c.Wait(); close(u.done) }()
	target, _ := url.Parse(fmt.Sprintf("http://127.0.0.1:%d", port))
	u.proxy = httputil.NewSingleHostReverseProxy(target)
	u.proxy.Transport = &http.Transport{MaxIdleConnsPerHost: 32, IdleConnTimeout: time.Second}
	for !health(port, rev, false) {
		select {
		case err := <-u.done:
			panic(fmt.Sprintf("candidate exited: %v", err))
		default:
		}
		if time.Since(started) > 30*time.Second {
			panic("startup timeout")
		}
		time.Sleep(10 * time.Millisecond)
	}
	t["startupMs"] = ms(started)
	t["readyAtMs"] = now()
	return u
}
func proxy(w http.ResponseWriter, r *http.Request) {
	var u *generation
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	if r.Header.Get("X-Lab-Prepare") == "1" && host == "127.0.0.1" {
		u = candidate.Load()
	}
	if u == nil {
		for {
			u = current.Load()
			u.inflight.Add(1)
			if current.Load() == u {
				break
			}
			u.inflight.Add(-1)
		}
	} else {
		u.inflight.Add(1)
	}
	defer u.inflight.Add(-1)
	r.Header.Del("X-Lab-Prepare")
	w.Header().Set("X-Lab-Now-Ms", fmt.Sprint(now()))
	w.Header().Set("X-Lab-Task", taskID)
	w.Header().Set("X-Lab-Revision", u.revision)
	u.proxy.ServeHTTP(w, r)
}
func prepare(r record, t map[string]any) *generation {
	t["memoryBefore"] = memory()
	started := time.Now()
	var data []byte
	if localDir := os.Getenv("STP_BENCH_LOCAL"); localDir != "" {
		var err error
		data, err = os.ReadFile(r.Key)
		must(err)
	} else {
		obj, err := s3Get(bucket, r.Key, "")
		must(err)
		if obj.NotFound {
			panic("missing bundle")
		}
		data = obj.Body
	}
	t["downloadMs"] = ms(started)
	t["bundleBytes"] = len(data)
	started = time.Now()
	dir := os.TempDir() + "/stp-code-swap/" + r.Revision
	must(applyBundle(data, r.Sha256, r.Size, dir))
	t["extractMs"] = ms(started)
	u := spawn(dir, r.Revision, t)
	candidate.Store(u)
	if current.Load() != nil && !health(8080, r.Revision, true) {
		panic("prepare proxy health failed")
	}
	t["preparedAtMs"] = now()
	return u
}
func activate(u *generation, t map[string]any) {
	t["commitDetectedAtMs"] = now()
	old := current.Swap(u)
	candidate.Store(nil)
	t["switchedAtMs"] = now()
	started := time.Now()
	if !health(8080, u.revision, false) {
		panic("post switch health failed")
	}
	t["postHealthMs"] = ms(started)
	t["postHealthAtMs"] = now()
	started = time.Now()
	for old.inflight.Load() > 0 {
		if time.Since(started) > 30*time.Second {
			panic("drain timeout")
		}
		time.Sleep(time.Millisecond)
	}
	t["drainMs"] = ms(started)
	t["oldInflightAtTerm"] = old.inflight.Load()
	started = time.Now()
	t["oldPid"] = old.cmd.Process.Pid
	must(syscall.Kill(-old.cmd.Process.Pid, syscall.SIGTERM))
	select {
	case err := <-old.done:
		t["oldWaitResult"] = fmt.Sprint(err)
	case <-time.After(30 * time.Second):
		panic("old exit timeout")
	}
	t["oldExitMs"] = ms(started)
	t["oldReapedAtMs"] = now()
	if !health(8080, u.revision, false) {
		panic("final proxy check failed")
	}
	t["newPid"] = u.cmd.Process.Pid
	t["memoryAfter"] = memory()
	if old.cmd.Dir != baseline {
		os.RemoveAll(old.cmd.Dir)
	}
}
func main() {
	app = "node"
	table = os.Getenv("STP_BENCH_TABLE")
	bucket = os.Getenv("STP_BENCH_BUCKET")
	baseline = os.Getenv("STP_BENCH_BASELINE")
	if baseline == "" {
		baseline = "/app"
	}
	if os.Getenv("STP_BENCH_LOCAL") != "" {
		taskID = "local"
	} else {
		resp, err := local.Get(os.Getenv("ECS_CONTAINER_METADATA_URI_V4") + "/task")
		must(err)
		var meta struct{ TaskARN string }
		must(json.NewDecoder(resp.Body).Decode(&meta))
		resp.Body.Close()
		taskID = meta.TaskARN[strings.LastIndex(meta.TaskARN, "/")+1:]
	}
	boot := time.Now()
	t := map[string]any{"bootAtMs": now()}
	r := read()
	var u *generation
	if r.Revision != "" && r.Phase == "commit" {
		u = prepare(r, t)
	} else {
		u = spawn(baseline, "baseline", t)
	}
	current.Store(u)
	candidate.Store(nil)
	listener, err := net.Listen("tcp", ":8080")
	must(err)
	t["listenerAtMs"] = now()
	t["bootToServingMs"] = ms(boot)
	t["memoryAfter"] = memory()
	go func() { must(http.Serve(listener, http.HandlerFunc(proxy))) }()
	put("status#"+app+"#"+taskID, map[string]any{"state": "complete", "revision": u.revision, "task": taskID, "startup": true, "timings": t})
	var prepared *generation
	var p record
	var timing map[string]any
	for {
		r := read()
		if r.Revision != "" && r.Revision != current.Load().revision {
			if prepared == nil && r.Phase == "prepare" {
				timing = map[string]any{"detectedAtMs": now()}
				m := memory()
				timing["memoryBefore"] = m
				if !m["allowed"].(bool) {
					put("status#"+app+"#"+taskID, map[string]any{"state": "refused", "revision": r.Revision, "task": taskID, "timings": timing, "reason": "memory_screen"})
					time.Sleep(time.Second)
					continue
				}
				p = r
				prepared = prepare(r, timing)
				put("status#"+app+"#"+taskID, map[string]any{"state": "prepared", "revision": r.Revision, "task": taskID, "timings": timing})
			}
			if prepared != nil && r.Phase == "commit" && r.Revision == p.Revision {
				activate(prepared, timing)
				put("status#"+app+"#"+taskID, map[string]any{"state": "complete", "revision": r.Revision, "task": taskID, "timings": timing})
				prepared = nil
			}
		}
		delay := 800 + rand.Intn(401)
		if prepared != nil {
			delay = 180 + rand.Intn(41)
		}
		time.Sleep(time.Duration(delay) * time.Millisecond)
	}
}

func parseHTTPDate(h http.Header, key string) time.Time { t, _ := http.ParseTime(h.Get(key)); return t }
func memory() map[string]any {
	base, version := memoryController()
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
	taskMiB, _ := strconv.ParseInt(os.Getenv("STP_BENCH_TASK_MIB"), 10, 64)
	limit := taskMiB * 1024 * 1024
	if rawLimit > 0 && rawLimit < limit {
		limit = rawLimit
	}
	need := 2.5*float64(peak) + 64*1024*1024
	return map[string]any{"atMs": now(), "cgroupVersion": version, "peakFile": base + peakFile, "peakBytes": peak, "rawLimitBytes": rawLimit, "effectiveLimitBytes": limit, "usageBytes": readNum(usageFile), "requiredBytes": need, "allowed": peak > 0 && limit > 0 && need <= .9*float64(limit)}
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
