package main

import (
	"errors"
	"testing"
	"time"
)

func TestInterruptedProposalBootstrapsCommittedCodeAndForeignRevisionUsesImage(t *testing.T) {
	r := record{Seq: 12, TaskDefinition: "arn:aws:ecs:eu-west-1:123456789012:task-definition/api:4", Phase: "prepare", Revision: "candidate",
		Committed: &bundleIdentity{Revision: "committed", Key: "committed.tgz", Sha256: "hash", Size: 123}}
	matching := bootstrapIdentity(r, "api:4")
	if matching.Revision != "committed" || matching.Phase != "commit" || matching.Seq != 12 {
		t.Fatalf("wrong committed bootstrap: %+v", matching)
	}
	foreign := bootstrapIdentity(r, "api:5")
	if foreign.Revision != "" || foreign.Phase != "abort" {
		t.Fatalf("foreign overlay replaced image: %+v", foreign)
	}
	r.Committed = nil
	baseline := bootstrapIdentity(r, "api:4")
	if baseline.Revision != "" || baseline.Phase != "abort" {
		t.Fatalf("proposal executed during bootstrap: %+v", baseline)
	}
}

func TestStatusWritesRetryAndNeverPanic(t *testing.T) {
	oldPut, oldDelays := putItem, statusRetryDelays
	statusRetryDelays = []time.Duration{time.Millisecond, time.Millisecond, time.Millisecond}
	defer func() { putItem, statusRetryDelays = oldPut, oldDelays }()

	attempts := 0
	putItem = func(map[string]any) error {
		attempts++
		if attempts < 3 {
			return errors.New("dynamodb PutItem: 500 InternalServerError")
		}
		return nil
	}
	if err := status("prepared", "v000002", map[string]any{}, ""); err != nil || attempts != 3 {
		t.Fatalf("transient failure not retried: attempts=%d err=%v", attempts, err)
	}

	attempts = 0
	putItem = func(map[string]any) error {
		attempts++
		return errors.New("dynamodb PutItem: 400 ThrottlingException")
	}
	if err := status("complete", "v000002", map[string]any{}, ""); err == nil || attempts != 4 {
		t.Fatalf("persistent failure: attempts=%d err=%v", attempts, err)
	}
}
