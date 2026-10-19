package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Validate before publishing a release directory. The first slice supports regular files only.
func applyBundle(data []byte, digest string, size int64, destination string) (err error) {
	if size <= 0 || size > 20*1024*1024 || int64(len(data)) != size || sha256Hex(data) != digest {
		return fmt.Errorf("bundle size/hash mismatch")
	}
	if _, err := os.Stat(destination); !os.IsNotExist(err) {
		return fmt.Errorf("release directory already exists")
	}
	if err := os.MkdirAll(filepath.Dir(destination), 0755); err != nil {
		return err
	}
	staging, err := os.MkdirTemp(filepath.Dir(destination), ".apply-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(staging)
	gz, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return err
	}
	defer gz.Close()
	tr := tar.NewReader(io.LimitReader(gz, 128*1024*1024+1))
	names := map[string]bool{}
	var total int64
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		name := h.Name
		if h.Typeflag != tar.TypeReg || name == "." || filepath.IsAbs(name) || filepath.Clean(name) != name || strings.Contains(name, "\\") || strings.HasPrefix(name, "../") || names[name] || name == "node_modules" || strings.HasPrefix(name, "node_modules/") {
			return fmt.Errorf("unsafe archive entry: %q", name)
		}
		total += h.Size
		if h.Size < 0 || total > 128*1024*1024 || len(names) >= 10000 {
			return fmt.Errorf("archive too large")
		}
		names[name] = true
		path := filepath.Join(staging, name)
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return err
		}
		mode := os.FileMode(0644)
		if h.Mode&0111 != 0 {
			mode = 0755
		}
		f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, mode)
		if err != nil {
			return err
		}
		_, copyErr := io.CopyN(f, tr, h.Size)
		closeErr := f.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
	}
	// Consume the gzip trailer as well: a valid tar inside corrupt gzip must never execute.
	if _, err := io.Copy(io.Discard, gz); err != nil {
		return err
	}
	if !names["index.mjs"] {
		return fmt.Errorf("missing Node entrypoint")
	}
	return os.Rename(staging, destination)
}
