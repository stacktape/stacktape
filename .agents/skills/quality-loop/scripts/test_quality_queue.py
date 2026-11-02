"""Offline integration checks using real private-queue Git transactions and separate processes."""

import argparse
from concurrent.futures import ProcessPoolExecutor
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import quality_queue as queue
from private_store import BRANCH, GitStore, QueueError, private_repository


BASELINE = {"public": "1" * 40, "console": "2" * 40}


def execute(remote, command, request, **kwargs):
    args = argparse.Namespace(command=command, request=request, **kwargs)
    return queue.mutate(GitStore(remote, lambda: None), args)


def claim_worker(remote, number):
    return execute(remote, "take", f"claim-{number}", worker=f"worker-{number}", id=None)


def dispatch_worker(remote, number):
    return execute(remote, "next", f"dispatch-{number}", run="trial")


def crash_before_commit(remote):
    def crash(state):
        state["rules"].append("must never become visible")
        os._exit(17)
    GitStore(remote, lambda: None).transaction(crash)


def candidate(baseline=BASELINE):
    return {"version": 1, "kind": "candidate", "baseline": baseline,
            "dedupe_key": "synthetic-fixture:missing-output", "title": "Synthetic fixture omits requested output",
            "category": "correctness", "priority": "P2", "realistic_trigger": "A synthetic caller requests output.",
            "impact": "The synthetic caller cannot obtain its requested result.", "expected": "One requested output is returned.",
            "observed": "No requested output is returned.", "files": ["fixtures/example.py:12"],
            "reproduction": "Create the supplied synthetic fixture, invoke it with the output option, observe missing output.",
            "evidence": "Synthetic test evidence; deliberately not a Stacktape product finding.", "evidence_kind": "runtime",
            "limitations": "Only the synthetic offline fixture was tested.", "smallest_fix": "Preserve the requested output.",
            "fix_risk": "Check callers that intentionally suppress output."}


def completion(kind="discovery", verdict="accept"):
    report = {"version": 1, "kind": kind, "baseline": BASELINE, "cleaned_up": True,
              "cleanup": "No external resources created; synthetic fixtures removed.",
              "evidence": "An independent synthetic reproduction and working control were executed.",
              "limitations": "Offline synthetic evidence only."}
    if kind == "validation":
        report.update(verdict=verdict, method="executed", priority="P2", realistic_trigger="A caller requests the output.",
                      fix_risk="Preserve the explicit suppression behavior.")
    else:
        report.update(outcome="covered", next_probe="Try a different synthetic caller input.")
    return report


class QueueIntegration(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.remote = str(Path(self.temp.name) / "private.git")
        subprocess.run(["git", "init", "--bare", "--quiet", self.remote], check=True)
        self.store = GitStore(self.remote, lambda: None)
        self.call("init", "init")
        self.call("start", "start", id="trial", baseline=BASELINE, hours=2, units=30, workers=4, charters=None)

    def tearDown(self):
        self.temp.cleanup()

    def call(self, command, request, **kwargs):
        return execute(self.remote, command, request, **kwargs)

    def next_job(self, key="next"):
        job = self.call("next", key, run="trial")
        self.call("bind", f"bind-{key}", job=job["id"], token=job["token"], task=f"task-{key}", model=job["model"])
        return job

    def finish(self, job, key, report):
        return self.call("finish", key, job=job["id"], token=job["token"], report=report)

    def accepted(self):
        job = self.next_job()
        submitted = self.call("submit", "candidate", job=job["id"], token=job["token"], report=candidate())
        self.finish(job, "explored", completion())
        validator = self.next_job("validator")
        self.assertEqual(validator["kind"], "validation")
        self.assertNotEqual(validator["model"], job["model"])
        self.assertNotIn("priority", validator["finding"])
        self.assertNotIn("smallest_fix", validator["finding"])
        self.finish(validator, "validated", completion("validation"))
        return submitted["id"]

    def test_two_model_gate_then_one_winner_among_parallel_fixers(self):
        finding_id = self.accepted()
        with ProcessPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(claim_worker, [self.remote] * 6, range(6)))
        winners = [result for result in results if result.get("id") == finding_id]
        self.assertEqual(len(winners), 1)
        winner = winners[0]
        worker_number = int(winner["claim_owner"]["worker"].split("-")[-1])
        replay = claim_worker(self.remote, worker_number)
        self.assertEqual(replay["claim_owner"]["token"], winner["claim_owner"]["token"])
        self.assertEqual(self.store.transaction()["findings"][finding_id]["status"], "claimed")
        self.call("resolve", "fixed", id=finding_id, token=winner["claim_owner"]["token"],
                  report={"outcome": "fixed", "summary": "Synthetic fix applied and checked.",
                          "checks": "The synthetic reproduction now passes.", "references": "Synthetic commit 12345678."})

    def test_parallel_dispatch_enforces_global_caps_and_resumes_after_restart(self):
        with ProcessPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(dispatch_worker, [self.remote] * 6, range(6)))
        jobs = [result for result in results if "id" in result]
        self.assertEqual(len(jobs), 4)
        self.assertEqual(sum(job["heavy"] for job in jobs), 1)
        # Each worker used a separate process and temp clone. A new store sees the same durable claims.
        state = GitStore(self.remote, lambda: None).transaction()
        self.assertEqual(len(queue.active_jobs(state)), 4)

    def test_crash_rolls_back_then_recovery_fences_old_worker(self):
        job = self.next_job()
        with ProcessPoolExecutor(max_workers=1) as pool:
            future = pool.submit(crash_before_commit, self.remote)
            with self.assertRaises(Exception):
                future.result()
        self.assertEqual(self.store.transaction()["rules"], [])
        self.call("recover", "recover", job=job["id"], token=job["token"], stopped_task="task-next",
                  proof="Test worker process was killed and exited; no resources remain.")
        resumed = self.next_job("retry")
        self.assertEqual(resumed["id"], job["id"])
        self.assertNotEqual(resumed["token"], job["token"])
        with self.assertRaises(QueueError):
            self.finish(job, "late-old-result", completion())
        self.finish(resumed, "new-result", completion())

    def test_expiry_never_steals_and_quota_pause_preserves_pending_validation(self):
        job = self.next_job()
        self.call("submit", "candidate", job=job["id"], token=job["token"], report=candidate())
        self.call("pause", "quota-stop", run="trial", reason="Provider quota exhausted.")
        stopped = self.call("next", "after-stop", run="trial")
        self.assertIsNone(stopped["dispatch"])
        self.assertEqual(self.store.transaction()["jobs"][job["id"]]["status"], "running")
        self.finish(job, "finish-during-pause", completion())
        self.call("resume", "new-budget", run="trial", hours=1, units=2)
        validator = self.next_job("after-resume")
        self.assertEqual(validator["kind"], "validation")

    def test_rejection_memory_and_realistic_validation_gate(self):
        job = self.next_job()
        submitted = self.call("submit", "candidate", job=job["id"], token=job["token"], report=candidate())
        self.finish(job, "explored", completion())
        validator = self.next_job("validator")
        weak = completion("validation")
        weak["method"] = "inspected"
        with self.assertRaises(QueueError):
            self.finish(validator, "static-runtime-proof", weak)
        self.finish(validator, "rejected", completion("validation", "reject"))
        state = self.store.transaction()
        self.assertEqual(state["findings"][submitted["id"]]["status"], "rejected")
        self.call("feedback", "owner-rule", id=submitted["id"], decision="reject",
                  reason="The example is intended synthetic behavior.", rule="Do not report intended synthetic suppression.")
        self.assertTrue(self.store.transaction()["rules"])
        other = self.next_job("next-probe")
        self.assertIn("Do not report intended synthetic suppression.", other["rules"])

    def test_bad_schema_baseline_secret_and_duplicate_rejected(self):
        job = self.next_job()
        for changes in ({"baseline": {"public": "wrong", "console": "wrong"}}, {"unexpected": True},
                        {"evidence": "AKIA" + "A" * 16}, {"files": ["/home/user/private/file"]}):
            report = candidate() | changes
            with self.assertRaises(QueueError):
                self.call("submit", "bad-" + queue.digest(changes), job=job["id"], token=job["token"], report=report)
        first = self.call("submit", "candidate", job=job["id"], token=job["token"], report=candidate())
        duplicate = self.call("submit", "duplicate", job=job["id"], token=job["token"], report=candidate())
        self.assertEqual(duplicate["duplicate_of"], first["id"])
        with self.assertRaises(QueueError):
            self.call("pause", "candidate", run="trial", reason="An unrelated action reusing an ID.")

    def test_unvalidated_finding_cannot_be_claimed(self):
        job = self.next_job()
        submitted = self.call("submit", "candidate", job=job["id"], token=job["token"], report=candidate())
        result = self.call("take", "premature-fix", id=submitted["id"], worker="fixer-one")
        self.assertIsNone(result["finding"])

    def test_budget_reserves_validation_and_does_not_expire_existing_workers(self):
        job = self.next_job()
        state = self.store.transaction()
        run = state["runs"]["trial"]
        args = argparse.Namespace(command="next", run="trial")
        self.assertIsNone(queue.dispatch(state, args, run["discovery_deadline"] + 1)["dispatch"])
        self.assertEqual(state["jobs"][job["id"]]["status"], "running")
        self.assertIsNone(queue.dispatch(state, args, run["deadline"] + 1)["dispatch"])

    def test_visibility_failure_prevents_all_remote_bytes(self):
        calls = []
        def reject():
            calls.append(True)
            raise QueueError("Destination is public.")
        with self.assertRaises(QueueError):
            GitStore(self.remote, reject).transaction(lambda state: (state, {}))
        self.assertEqual(len(calls), 1)
        metadata = subprocess.CompletedProcess([], 0, json.dumps({"nameWithOwner": "stacktape/console-app", "isPrivate": False}))
        with patch("private_store.subprocess.run", return_value=metadata):
            with self.assertRaises(QueueError):
                private_repository()

    def test_privacy_rechecked_before_write(self):
        checks = []
        def verify():
            checks.append(True)
            if len(checks) == 2:
                raise QueueError("Repository became public.")
        def update(old):
            new = copy.deepcopy(old)
            new["rules"].append("Must not be sent.")
            return new, {}
        with self.assertRaises(QueueError):
            GitStore(self.remote, verify).transaction(update)
        self.assertEqual(self.store.transaction()["rules"], [])

    def test_privacy_check_pins_github_host_and_identity(self):
        metadata = {"nameWithOwner": "stacktape/console-app", "isPrivate": True,
                    "url": "https://github.com/stacktape/console-app"}
        with patch("private_store.subprocess.run", return_value=subprocess.CompletedProcess([], 0, json.dumps(metadata))) as run:
            private_repository()
            self.assertIn("https://github.com/stacktape/console-app", run.call_args.args[0])
        metadata["url"] = "https://other-host.invalid/stacktape/console-app"
        with patch("private_store.subprocess.run", return_value=subprocess.CompletedProcess([], 0, json.dumps(metadata))):
            with self.assertRaises(QueueError):
                private_repository()

    def test_queue_branch_contains_no_product_tree(self):
        result = subprocess.run(["git", "--git-dir", self.remote, "ls-tree", "--name-only", BRANCH],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout.strip(), "state.json")

    def test_recovery_packet_keeps_all_resource_checkpoints(self):
        job = self.next_job()
        self.call("checkpoint", "setup", job=job["id"], token=job["token"], stage="setup",
                  note="Owned container quality-test-123; PID 12345; port 43210.")
        self.call("checkpoint", "repro", job=job["id"], token=job["token"], stage="reproducing",
                  note="Investigating the next synthetic control.")
        state = self.store.transaction()
        packet = queue.packet(state, state["jobs"][job["id"]])
        self.assertIn("quality-test-123", json.dumps(packet["checkpoints"]))
        self.assertEqual(len(packet["checkpoints"]), 2)
        with self.assertRaises(QueueError):
            self.call("checkpoint", "secret-note", job=job["id"], token=job["token"], stage="setup",
                      note="Never store " + "AKIA" + "A" * 16)

    def test_combined_packet_may_exceed_individual_report_limit(self):
        job = self.next_job()
        report = candidate()
        report.update(evidence="x" * 23000, reproduction="y" * 23000, impact="z" * 17000)
        result = self.call("submit", "large-candidate", job=job["id"], token=job["token"], report=report)
        self.finish(job, "finish", completion())
        validator = self.next_job("validator")
        validated = completion("validation")
        validated.update(evidence="x" * 23000, realistic_trigger="y" * 23000, fix_risk="z" * 17000)
        self.finish(validator, "validated", validated)
        claimed = self.call("take", "take-large", worker="fix-large", id=result["id"])
        self.assertGreater(len(json.dumps(claimed)), 100000)
        with self.assertRaises(QueueError):
            self.call("take", "second-take", worker="fix-large", id=None)

    def test_owner_decision_returns_to_independent_validation(self):
        job = self.next_job()
        result = self.call("submit", "candidate", job=job["id"], token=job["token"], report=candidate())
        self.finish(job, "finish", completion())
        validator = self.next_job("validator")
        self.finish(validator, "decision-needed", completion("validation", "needs_owner"))
        self.call("feedback", "owner-decision", id=result["id"], decision="keep",
                  reason="Owner confirms the synthetic expectation is intended.", rule=None)
        self.call("revalidate", "return-to-review", id=result["id"], run="trial",
                  reason="The owner has resolved the policy uncertainty.")
        fresh = self.next_job("fresh-validator")
        self.assertEqual(fresh["owner_feedback"]["decision"], "keep")
        self.assertNotEqual(fresh["id"], validator["id"])
        self.finish(fresh, "fresh-verdict", completion("validation"))
        self.assertEqual(self.store.transaction()["findings"][result["id"]]["status"], "ready")

    def test_distinct_run_caps_do_not_reduce_other_runs(self):
        self.call("start", "small-run", id="small", baseline=BASELINE, hours=1, units=3, workers=1,
                  charters="maintenance-structure")
        self.next_job()
        result = self.call("next", "small-dispatch", run="small")
        self.assertIn("id", result)
        self.assertEqual(result["run"], "small")

    def test_configurable_scale_and_wrong_model_binding(self):
        self.call("configure", "scale", total=12, discovery=8, heavy=2, backlog=12)
        self.call("start", "larger-run", id="larger", baseline=BASELINE, hours=10, units=100, workers=8, charters=None)
        job = self.call("next", "new-dispatch", run="larger")
        with self.assertRaises(QueueError):
            self.call("bind", "wrong-model", job=job["id"], token=job["token"], task="wrong-model-task",
                      model=queue.MODELS[1 - queue.MODELS.index(job["model"])])

    def test_recovered_discovery_obeys_validation_backlog(self):
        state = self.store.transaction()
        run = state["runs"]["trial"]
        heavy = queue.enqueue(state, run, "J6-console-ux", "discovery", queue.MODELS[0], run["created"])
        heavy.update(status="running", token="held", lease_until=run["deadline"])
        recovered = queue.enqueue(state, run, "J1-init", "discovery", queue.MODELS[0], run["created"])
        recovered["history"].append({"proof": "Earlier worker stopped; setup cleaned."})
        for index in range(6):
            queue.enqueue(state, run, "J6-console-ux", "validation", queue.MODELS[1], run["created"] + index)
        result = queue.dispatch(state, argparse.Namespace(run="trial"), run["created"] + 60)
        self.assertIsNone(result["dispatch"])
        self.assertEqual(recovered["status"], "pending")

    def test_shared_setup_deferral_preserves_validation_and_records_gap(self):
        self.call("defer", "defer-console", run="trial", charters="J6-console-ux,J5-access",
                  reason="Synthetic shared fixture dependency is unavailable at this baseline.")
        state = self.store.transaction()
        run = state["runs"]["trial"]
        self.assertFalse(queue.charter_eligible(state, run, "J6-console-ux"))
        self.assertTrue(queue.charter_eligible(state, run, "J1-init"))
        self.accepted()
        self.assertEqual(len(state["runs"]["trial"]["deferred"]), 2)

    def test_completion_requires_settled_jobs_and_exhausted_work_then_can_resume(self):
        self.call("start", "short-run", id="short", baseline=BASELINE, hours=1, units=1, workers=1,
                  charters="J1-init")
        with self.assertRaises(QueueError):
            self.call("complete", "too-early", run="short")
        job = self.call("next", "short-dispatch", run="short")
        with self.assertRaises(QueueError):
            self.call("complete", "still-running", run="short")
        self.call("bind", "short-bind", job=job["id"], token=job["token"], task="short-task", model=job["model"])
        self.finish(job, "short-finish", completion())
        result = self.call("complete", "short-complete", run="short")
        self.assertEqual(result["status"], "completed")
        self.assertIsNone(self.call("next", "after-complete", run="short")["dispatch"])
        self.call("resume", "short-extension", run="short", hours=1, units=1)
        self.assertNotIn("completed_at", self.store.transaction()["runs"]["short"])
        self.assertIn("id", self.call("next", "extended-dispatch", run="short"))


if __name__ == "__main__":
    unittest.main()
