package main

import (
	"io"
	"net/http"
	"strings"
	"testing"
)

type admissionTransport struct {
	requests []string
	grant    string
}

func (transport *admissionTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	target := request.Header.Get("X-Amz-Target")
	transport.requests = append(transport.requests, target)
	body := "{}"
	if strings.HasSuffix(target, "GetItem") {
		body = transport.grant
	}
	return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(body)), Request: request}, nil
}
func TestProtectedRefusalStartsNoReleasePoller(t *testing.T) {
	oldClient, oldCreds, oldApp, oldTask, oldTable := httpClient, cachedCreds, app, taskID, table
	defer func() {
		httpClient, cachedCreds, app, taskID, table = oldClient, oldCreds, oldApp, oldTask, oldTable
		admitted.Store(false)
	}()
	t.Setenv("STP_BENCH_ADMISSION", "1")
	t.Setenv("STP_BENCH_ROLE_ID", "AROAOWNED")
	t.Setenv("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI", "")
	t.Setenv("AWS_ACCESS_KEY_ID", "synthetic")
	t.Setenv("AWS_SECRET_ACCESS_KEY", "synthetic")
	cachedCreds = nil
	app, taskID, table = "node", "00000000000000000000000000000001", "owned"
	admitted.Store(false)
	transport := &admissionTransport{grant: `{"Item":{"refusal":{"S":"poller_capacity_exceeded"}}}`}
	httpClient = &http.Client{Transport: transport}
	err := acquireAdmission()
	if err == nil || !strings.Contains(err.Error(), "poller_capacity_exceeded") {
		t.Fatalf("refusal=%v", err)
	}
	if admitted.Load() {
		t.Fatal("refused task admitted")
	}
	if len(transport.requests) != 2 || !strings.HasSuffix(transport.requests[0], "PutItem") || !strings.HasSuffix(transport.requests[1], "GetItem") {
		t.Fatalf("unexpected release polling: %v", transport.requests)
	}
}
