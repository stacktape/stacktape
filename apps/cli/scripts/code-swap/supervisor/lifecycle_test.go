package main

import "testing"

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
