package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"os"
	"path/filepath"
	"testing"
)

func bundleForTest(t *testing.T, name string, kind byte) []byte {
	var b bytes.Buffer
	z := gzip.NewWriter(&b)
	a := tar.NewWriter(z)
	if err := a.WriteHeader(&tar.Header{Name: name, Typeflag: kind, Mode: 0644, Size: 0}); err != nil {
		t.Fatal(err)
	}
	a.Close()
	z.Close()
	return b.Bytes()
}
func TestApplyIntegrityAndPaths(t *testing.T) {
	for _, name := range []string{"../escape", "/absolute", "a/../../escape", "a\\escape", "node_modules/x", "index.mjs"} {
		t.Run(name, func(t *testing.T) {
			b := bundleForTest(t, name, tar.TypeReg)
			dst := filepath.Join(t.TempDir(), "release")
			err := applyBundle(b, sha256Hex(b), int64(len(b)), dst)
			if name == "index.mjs" {
				if err != nil {
					t.Fatal(err)
				}
				if _, err := os.Stat(filepath.Join(dst, name)); err != nil {
					t.Fatal(err)
				}
			} else if err == nil {
				t.Fatal("unsafe path accepted")
			}
		})
	}
	for _, kind := range []byte{tar.TypeSymlink, tar.TypeLink, tar.TypeFifo, tar.TypeDir} {
		b := bundleForTest(t, "index.mjs", kind)
		if applyBundle(b, sha256Hex(b), int64(len(b)), filepath.Join(t.TempDir(), "r")) == nil {
			t.Fatal("non-file accepted")
		}
	}
	b := bundleForTest(t, "index.mjs", tar.TypeReg)
	if applyBundle(b, "bad", int64(len(b)), filepath.Join(t.TempDir(), "r")) == nil {
		t.Fatal("bad hash accepted")
	}
	if applyBundle(b, sha256Hex(b), int64(len(b)+1), filepath.Join(t.TempDir(), "r")) == nil {
		t.Fatal("bad size accepted")
	}
	b[len(b)-5] ^= 1
	if applyBundle(b, sha256Hex(b), int64(len(b)), filepath.Join(t.TempDir(), "r")) == nil {
		t.Fatal("corrupt gzip accepted")
	}
}
