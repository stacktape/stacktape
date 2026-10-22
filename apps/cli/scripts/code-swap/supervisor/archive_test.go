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

func TestAtomicExtractionAndEntryConflicts(t *testing.T) {
	for _, names := range [][]string{{"index.mjs", "index.mjs"}, {"index.mjs", "a", "a/b"}, {"index.mjs", "../outside"}, {"index.mjs", "node_modules"}} {
		var b bytes.Buffer
		z := gzip.NewWriter(&b)
		a := tar.NewWriter(z)
		for _, name := range names {
			if err := a.WriteHeader(&tar.Header{Name: name, Typeflag: tar.TypeReg, Mode: 07777}); err != nil {
				t.Fatal(err)
			}
		}
		a.Close()
		z.Close()
		parent := t.TempDir()
		dst := filepath.Join(parent, "r")
		if applyBundle(b.Bytes(), sha256Hex(b.Bytes()), int64(b.Len()), dst) == nil {
			t.Fatal("invalid entries published", names)
		}
		entries, _ := os.ReadDir(parent)
		if len(entries) != 0 {
			t.Fatal("failed extraction leaked staging directory", entries)
		}
	}
	parent := t.TempDir()
	dst := filepath.Join(parent, "r")
	os.Mkdir(dst, 0755)
	os.WriteFile(filepath.Join(dst, "owned"), []byte("retain"), 0600)
	b := bundleForTest(t, "index.mjs", tar.TypeReg)
	if applyBundle(b, sha256Hex(b), int64(len(b)), dst) == nil {
		t.Fatal("existing live directory replaced")
	}
	content, _ := os.ReadFile(filepath.Join(dst, "owned"))
	if string(content) != "retain" {
		t.Fatal("live directory changed")
	}
}
func TestArchiveExpansionLimit(t *testing.T) {
	var b bytes.Buffer
	z := gzip.NewWriter(&b)
	a := tar.NewWriter(z)
	a.WriteHeader(&tar.Header{Name: "index.mjs", Typeflag: tar.TypeReg, Size: 129 * 1024 * 1024, Mode: 0644})
	zero := make([]byte, 1024*1024)
	for i := 0; i < 129; i++ {
		a.Write(zero)
	}
	a.Close()
	z.Close()
	if applyBundle(b.Bytes(), sha256Hex(b.Bytes()), int64(b.Len()), filepath.Join(t.TempDir(), "r")) == nil {
		t.Fatal("expansion bomb accepted")
	}
}

func TestPythonArchiveUsesConfiguredImageCommand(t *testing.T) {
	t.Setenv("STP_CODE_SWAP_COMMAND", "/stacktape-start")
	b := bundleForTest(t, "app.py", tar.TypeReg)
	dst := filepath.Join(t.TempDir(), "python")
	if err := applyBundle(b, sha256Hex(b), int64(len(b)), dst); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dst, "app.py")); err != nil {
		t.Fatal(err)
	}
	b = bundleForTest(t, "../escape.py", tar.TypeReg)
	if applyBundle(b, sha256Hex(b), int64(len(b)), filepath.Join(t.TempDir(), "bad")) == nil {
		t.Fatal("unsafe Python archive accepted")
	}
}
