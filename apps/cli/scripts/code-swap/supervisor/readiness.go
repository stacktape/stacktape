package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"sync/atomic"
	"time"
)

// ECS queries the live process. No files, AWS reads or application health policy
// are involved in the tiny command. The supervisor owns all real proxy checks.
type checkedGeneration struct {
	generation *generation
	at         time.Time
	passed     bool
}

var checked atomic.Pointer[checkedGeneration]
var admitted atomic.Bool
var desiredRevision atomic.Pointer[string]

func readinessSocket() string {
	if path := os.Getenv("STP_BENCH_READINESS_SOCKET"); path != "" {
		return path
	}
	return "/tmp/stacktape-supervisor.sock"
}
func ready() bool {
	u := current.Load()
	c := checked.Load()
	desired := desiredRevision.Load()
	return admitted.Load() && !stopping.Load() && u != nil && !u.exited.Load() && c != nil && c.generation == u && c.passed && time.Since(c.at) <= 7*time.Second && (desired == nil || *desired == u.revision)
}
func readinessCommand() error {
	client := &http.Client{Timeout: time.Second, Transport: &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", readinessSocket())
	}}}
	defer client.CloseIdleConnections()
	response, err := client.Get("http://supervisor/readiness")
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("supervisor not ready")
	}
	return nil
}
func serveReadiness() (func(), error) {
	// Removing a stale socket cannot turn it into readiness; every query needs a
	// response from this live process and a fresh checked generation.
	if err := os.Remove(readinessSocket()); err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	listener, err := net.Listen("unix", readinessSocket())
	if err != nil {
		return nil, err
	}
	if err := os.Chmod(readinessSocket(), 0600); err != nil {
		listener.Close()
		return nil, err
	}
	server := &http.Server{ReadHeaderTimeout: time.Second, Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !ready() {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	})}
	go server.Serve(listener)
	return func() { server.Close(); os.Remove(readinessSocket()) }, nil
}
func monitorReadiness() {
	for !stopping.Load() {
		u := current.Load()
		if u != nil {
			health(proxyPort, u.revision, false)
		}
		select {
		case <-stop:
			return
		case <-time.After(5 * time.Second):
		}
	}
}
