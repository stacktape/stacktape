package main

import (
	"os"
	"testing"
)

func TestScreenBoundary(t *testing.T) {
	for _, limit := range []int64{512 << 20, 1024 << 20} {
		// 25*peak + 640 MiB <= 9*limit (integer arithmetic; no rounded MiB admission).
		boundary := (9*limit - 640*(1<<20)) / 25
		if !screen(boundary, limit) || screen(boundary+1, limit) {
			t.Fatal("incorrect byte boundary", limit, boundary)
		}
	}
	for _, p := range []int64{-1, 0} {
		if screen(p, 512<<20) {
			t.Fatal("unknown peak admitted")
		}
	}
	if screen(1, -1) || screen(1, 0) {
		t.Fatal("unknown limit admitted")
	}
}
func TestRealCounterFilesAndEffectiveLimit(t *testing.T) {
	for _, version := range []int{1, 2} {
		dir := t.TempDir() + "/"
		peak, limit := "memory.max_usage_in_bytes", "memory.limit_in_bytes"
		if version == 2 {
			peak = "memory.peak"
			limit = "memory.max"
		}
		os.WriteFile(dir+peak, []byte("100000000"), 0600)
		os.WriteFile(dir+limit, []byte("9223372036854771712"), 0600)
		m := memoryAt(dir, version, 512, false)
		if !m["allowed"].(bool) || m["effectiveLimitBytes"] != int64(512<<20) {
			t.Fatal(m)
		}
		if memoryAt(dir, version, 512, true)["allowed"].(bool) {
			t.Fatal("sidecar admitted")
		}
		if memoryAt(dir, version, 0, false)["allowed"].(bool) {
			t.Fatal("unknown task budget admitted")
		}
		os.WriteFile(dir+limit, []byte("104857600"), 0600)
		if memoryAt(dir, version, 512, false)["allowed"].(bool) {
			t.Fatal("finite leaf limit ignored")
		}
		os.WriteFile(dir+limit, []byte("max"), 0600)
		for _, value := range []string{"0", "-1", "invalid"} {
			os.WriteFile(dir+peak, []byte(value), 0600)
			if memoryAt(dir, version, 512, false)["allowed"].(bool) {
				t.Fatal("unknown peak admitted")
			}
		}
		os.Remove(dir + peak)
		if memoryAt(dir, version, 512, false)["allowed"].(bool) {
			t.Fatal("unreadable peak admitted")
		}
	}
}
