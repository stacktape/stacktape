package main

// Unsigned/unfenced benchmark transport only. Never linked into the installed CLI.

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

type creds struct {
	AccessKeyID     string `json:"AccessKeyId"`
	SecretAccessKey string `json:"SecretAccessKey"`
	Token           string `json:"Token"`
	Expiration      time.Time
}

var (
	credsMu     sync.Mutex
	cachedCreds *creds
	httpClient  = &http.Client{Timeout: 30 * time.Second, Transport: &http.Transport{MaxIdleConnsPerHost: 16, IdleConnTimeout: 90 * time.Second}}
)

func region() string {
	if r := os.Getenv("AWS_REGION"); r != "" {
		return r
	}
	return "eu-west-1"
}

func getCreds() (*creds, error) {
	credsMu.Lock()
	defer credsMu.Unlock()
	if cachedCreds != nil && (cachedCreds.Expiration.IsZero() || time.Until(cachedCreds.Expiration) > 5*time.Minute) {
		return cachedCreds, nil
	}
	if rel := os.Getenv("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI"); rel != "" {
		resp, err := httpClient.Get("http://169.254.170.2" + rel)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		var c creds
		if err := json.NewDecoder(resp.Body).Decode(&c); err != nil {
			return nil, err
		}
		cachedCreds = &c
		return cachedCreds, nil
	}
	if id := os.Getenv("AWS_ACCESS_KEY_ID"); id != "" {
		cachedCreds = &creds{AccessKeyID: id, SecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"), Token: os.Getenv("AWS_SESSION_TOKEN")}
		return cachedCreds, nil
	}
	return nil, fmt.Errorf("no AWS credentials")
}

func hmacSHA256(key []byte, data string) []byte {
	m := hmac.New(sha256.New, key)
	m.Write([]byte(data))
	return m.Sum(nil)
}

func sha256Hex(b []byte) string {
	s := sha256.Sum256(b)
	return hex.EncodeToString(s[:])
}

// uriEncode follows the SigV4 rules (RFC 3986 unreserved characters stay).
func uriEncode(s string, encodeSlash bool) string {
	var b strings.Builder
	for _, c := range []byte(s) {
		switch {
		case c >= 'A' && c <= 'Z', c >= 'a' && c <= 'z', c >= '0' && c <= '9', c == '-', c == '_', c == '.', c == '~':
			b.WriteByte(c)
		case c == '/' && !encodeSlash:
			b.WriteByte(c)
		default:
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

func canonicalQuery(q url.Values) string {
	keys := make([]string, 0, len(q))
	for k := range q {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var parts []string
	for _, k := range keys {
		vals := append([]string(nil), q[k]...)
		sort.Strings(vals)
		for _, v := range vals {
			parts = append(parts, uriEncode(k, true)+"="+uriEncode(v, true))
		}
	}
	return strings.Join(parts, "&")
}

func signingKey(secret, date, reg, service string) []byte {
	k := hmacSHA256([]byte("AWS4"+secret), date)
	k = hmacSHA256(k, reg)
	k = hmacSHA256(k, service)
	return hmacSHA256(k, "aws4_request")
}

// sign adds SigV4 headers. canonicalPath must already be encoded as the service expects.
func sign(req *http.Request, body []byte, service, reg, canonicalPath string) error {
	c, err := getCreds()
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	date := amzDate[:8]
	payloadHash := sha256Hex(body)
	req.Header.Set("X-Amz-Date", amzDate)
	req.Header.Set("X-Amz-Content-Sha256", payloadHash)
	if c.Token != "" {
		req.Header.Set("X-Amz-Security-Token", c.Token)
	}
	headers := map[string]string{"host": req.URL.Host}
	for k, v := range req.Header {
		lk := strings.ToLower(k)
		if strings.HasPrefix(lk, "x-amz-") || lk == "content-type" || lk == "if-none-match" || lk == "if-match" {
			headers[lk] = strings.TrimSpace(strings.Join(v, ","))
		}
	}
	names := make([]string, 0, len(headers))
	for k := range headers {
		names = append(names, k)
	}
	sort.Strings(names)
	var ch strings.Builder
	for _, k := range names {
		ch.WriteString(k + ":" + headers[k] + "\n")
	}
	signed := strings.Join(names, ";")
	creq := strings.Join([]string{req.Method, canonicalPath, canonicalQuery(req.URL.Query()), ch.String(), signed, payloadHash}, "\n")
	scope := date + "/" + reg + "/" + service + "/aws4_request"
	sts := "AWS4-HMAC-SHA256\n" + amzDate + "\n" + scope + "\n" + sha256Hex([]byte(creq))
	sig := hex.EncodeToString(hmacSHA256(signingKey(c.SecretAccessKey, date, reg, service), sts))
	req.Header.Set("Authorization", fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s", c.AccessKeyID, scope, signed, sig))
	return nil
}

type s3Result struct {
	Body         []byte
	ETag         string
	NotModified  bool
	NotFound     bool
	Status       int
	Date         time.Time
	LastModified time.Time
}

func s3Do(method, bucket, key string, body []byte, extra map[string]string) (*s3Result, error) {
	path := "/" + uriEncode(key, false)
	u := fmt.Sprintf("https://%s.s3.%s.amazonaws.com%s", bucket, region(), path)
	ctx, cancel := bootstrapRequestContext(context.Background())
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, method, u, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	if body == nil {
		req.Body = http.NoBody
	}
	for k, v := range extra {
		req.Header.Set(k, v)
	}
	if err := sign(req, body, "s3", region(), path); err != nil {
		return nil, err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 24*1024*1024))
	if err != nil {
		return nil, err
	}
	r := &s3Result{Body: data, ETag: resp.Header.Get("ETag"), Status: resp.StatusCode,
		Date: parseHTTPDate(resp.Header, "Date"), LastModified: parseHTTPDate(resp.Header, "Last-Modified")}
	switch {
	case resp.StatusCode == 304:
		r.NotModified = true
	case resp.StatusCode == 404:
		r.NotFound = true
	case resp.StatusCode >= 300:
		return r, fmt.Errorf("s3 %s %s: %d %s", method, key, resp.StatusCode, truncate(string(data), 300))
	}
	return r, nil
}

func s3Get(bucket, key, etag string) (*s3Result, error) {
	extra := map[string]string{}
	if etag != "" {
		extra["If-None-Match"] = etag
	}
	return s3Do("GET", bucket, key, nil, extra)
}

// awsJSON calls a JSON-protocol API (SSM, ECS) with X-Amz-Target.
func awsJSON(service, target string, input any, output any) error {
	return awsJSONContext(context.Background(), service, target, input, output)
}
func awsJSONContext(ctx context.Context, service, target string, input any, output any) error {
	ctx, cancel := bootstrapRequestContext(ctx)
	defer cancel()
	body, _ := json.Marshal(input)
	host := fmt.Sprintf("%s.%s.amazonaws.com", service, region())
	req, _ := http.NewRequestWithContext(ctx, "POST", "https://"+host+"/", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/x-amz-json-1.1")
	if service == "dynamodb" {
		req.Header.Set("Content-Type", "application/x-amz-json-1.0")
	}
	req.Header.Set("X-Amz-Target", target)
	if err := sign(req, body, service, region(), "/"); err != nil {
		return err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 24*1024*1024))
	if resp.StatusCode >= 300 {
		return fmt.Errorf("%s %s: %d %s", service, target, resp.StatusCode, truncate(string(data), 300))
	}
	if output != nil {
		return json.Unmarshal(data, output)
	}
	return nil
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}
