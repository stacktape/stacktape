#!/usr/bin/env python3
"""Durable, private, report-only quality work. No model calls or product edits in this CLI."""

import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

from private_store import BRANCH, REPOSITORY, GitStore, QueueError


MODELS = ("gpt-6.1-sol", "gpt-6-astra")
PRIORITIES = ("P1", "P2", "P3")
CATEGORIES = ("correctness", "data-safety", "security", "ux", "maintenance")
STAGES = ("reserved", "setup", "exploring", "reproducing", "validating", "cleanup")
CHARTERS = json.loads((Path(__file__).parent.parent / "references/charters.json").read_text())


def require(condition, message):
    if not condition:
        raise QueueError(message)


def text(value, name, minimum=1, maximum=24000):
    require(isinstance(value, str) and minimum <= len(value.strip()) <= maximum, f"Invalid {name}.")
    return value


def identifier(value):
    require(isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,100}", value), "Invalid ID.")
    return value


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def fields(data, required, optional=()):
    require(isinstance(data, dict), "Report must be a JSON object.")
    require(set(required) <= set(data) <= set(required) | set(optional),
            "Report keys do not match the contract; see the quality-loop report reference.")


def scrub_check(data, bounded=True):
    serialized = json.dumps(data)
    require(not bounded or len(serialized.encode()) <= 100000, "Report exceeds 100 KB; keep a minimal reproduction and bounded evidence.")
    patterns = [r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b", r"\bgh[pousr]_[A-Za-z0-9]{20,}",
                r"github_pat_[A-Za-z0-9_]{20,}", r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
                r"(?i)bearer\s+[a-z0-9._-]{20,}"]
    require(not any(re.search(pattern, serialized) for pattern in patterns),
            "Possible credential in report. Redact it before submission (values are not printed).")


def report_header(report, kind, baseline):
    require(report.get("version") == 1 and report.get("kind") == kind, "Wrong report version or kind.")
    require(report.get("baseline") == baseline, "Report revisions differ from the frozen run baseline.")
    scrub_check(report)


def candidate_report(report, baseline):
    fields(report, ["version", "kind", "baseline", "dedupe_key", "title", "category", "priority",
                    "realistic_trigger", "impact", "expected", "observed", "files", "reproduction",
                    "evidence", "evidence_kind", "limitations", "smallest_fix", "fix_risk"])
    report_header(report, "candidate", baseline)
    require(report["category"] in CATEGORIES and report["priority"] in PRIORITIES, "Invalid classification.")
    require(report["evidence_kind"] in ("runtime", "browser", "static"), "Invalid evidence kind.")
    for key in ("dedupe_key", "title", "realistic_trigger", "impact", "expected", "observed",
                "reproduction", "evidence", "limitations", "smallest_fix", "fix_risk"):
        text(report[key], key, 8)
    require(isinstance(report["files"], list) and 0 < len(report["files"]) <= 30, "Supply affected source paths.")
    for path in report["files"]:
        text(path, "source path", maximum=300)
        require(not path.startswith(("/", "~")) and ".." not in Path(path).parts, "Use repository-relative paths.")


def completion_report(report, job, run):
    common = ["version", "kind", "baseline", "cleaned_up", "cleanup", "evidence", "limitations"]
    extra = ["verdict", "method", "priority", "realistic_trigger", "fix_risk"] if job["kind"] == "validation" else ["outcome", "next_probe"]
    fields(report, common + extra)
    report_header(report, job["kind"], run["baseline"])
    require(report["cleaned_up"] is True, "Finish only after owned processes/resources are cleaned up.")
    for key in ("cleanup", "evidence", "limitations"):
        text(report[key], key, 8)
    if job["kind"] == "validation":
        require(report["verdict"] in ("accept", "reject", "already_fixed", "needs_owner"), "Invalid verdict.")
        require(report["method"] in ("executed", "inspected"), "Invalid validation method.")
        require(report["priority"] in PRIORITIES, "Invalid priority.")
        text(report["realistic_trigger"], "realistic_trigger", 8)
        text(report["fix_risk"], "fix_risk", 8)
    else:
        require(report["outcome"] in ("covered", "blocked"), "Invalid discovery outcome.")
        text(report["next_probe"], "next_probe", 8)


def new_state():
    return {"version": 1, "limits": {"total": 6, "discovery": 4, "heavy": 1, "backlog": 6},
            "runs": {}, "jobs": {}, "findings": {}, "rules": [], "reopened": {}, "receipts": {}}


def active_jobs(state):
    return [job for job in state["jobs"].values() if job["status"] == "running"]


def get_job(state, args):
    require(args.job in state["jobs"], "Unknown job.")
    job = state["jobs"][args.job]
    require(job.get("token") == args.token and job["status"] == "running", "Stale job token or inactive job.")
    return job


def known_findings(state, charter):
    return [{"id": item["id"], "title": item["claim"]["title"], "status": item["status"],
             "dedupe_key": item["claim"]["dedupe_key"], "feedback": item.get("feedback"),
             "reason": item.get("validation", {}).get("evidence")}
            for item in state["findings"].values() if item["charter"] == charter]


def packet(state, job):
    run = state["runs"][job["run"]]
    output = {key: job[key] for key in ("id", "run", "kind", "model", "token", "stage", "lease_until", "heavy", "attempt")}
    output.update({"baseline": run["baseline"], "charter_id": job["charter"], "charter": run["charters"][job["charter"]],
                   "checkpoint": job.get("checkpoint"), "checkpoints": job.get("checkpoints", []),
                   "history": job["history"], "task": job.get("task"),
                   "rules": state["rules"], "resource_prefix": f"quality-{job['id']}-{job['attempt']}",
                   "instructions": "Report only. Read the quality-loop skill and report contract. Verify the baseline before testing. Clean up owned resources before finish."})
    if job["kind"] == "validation":
        finding = state["findings"][job["finding"]]
        # Blind to the explorer's severity, remedy, impact argument and identity. Raw claim and evidence only.
        output["finding"] = {key: finding["claim"][key] for key in
                             ("title", "category", "realistic_trigger", "expected", "observed", "files",
                              "reproduction", "evidence", "evidence_kind", "limitations")}
        output["reported_baseline"] = finding["claim"]["baseline"]
        output["owner_feedback"] = finding.get("feedback")
        output["instructions"] += " Independently attempt to falsify the claim. Rerun runtime/browser reproductions. Agreement alone is not evidence."
    else:
        output["known_findings"] = known_findings(state, job["charter"])
        output["additional_probe"] = state.get("reopened", {}).get(job["charter"])
        output["prior_probes"] = [old["report"] for old in state["jobs"].values()
                                  if old["kind"] == "discovery" and old["charter"] == job["charter"] and "report" in old][-6:]
    return output


def baseline_at(root, public_ref="HEAD", console_ref="HEAD", clean=False):
    def git(path, *args):
        result = subprocess.run(["git", "-C", str(path), *args], capture_output=True, text=True, check=False)
        require(result.returncode == 0, "Cannot read repository baseline; initialize the private Console submodule.")
        return result.stdout.strip()
    root = Path(root).resolve()
    console = root / "apps/console"
    require(git(console, "rev-parse", "--show-toplevel") == str(console), "Console is not an initialized repository.")
    baseline = {"public": git(root, "rev-parse", "--verify", f"{public_ref}^{{commit}}"),
                "console": git(console, "rev-parse", "--verify", f"{console_ref}^{{commit}}")}
    if clean:
        require(not git(root, "status", "--porcelain", "--untracked-files=normal", "--ignore-submodules=all"),
                "Public worktree is dirty; use an isolated checkout at the run's public commit.")
        require(not git(console, "status", "--porcelain", "--untracked-files=normal"), "Console worktree is dirty.")
    return baseline


def enqueue(state, run, charter, kind, model, now, finding=None):
    job_id = "j-" + uuid.uuid4().hex[:16]
    job = {"id": job_id, "run": run["id"], "charter": charter, "kind": kind, "model": model,
           "heavy": run["charters"][charter]["heavy"], "status": "pending", "attempt": 0, "history": [], "created": now}
    if finding:
        job["finding"] = finding
    state["jobs"][job_id] = job
    return job


def can_dispatch(state, job):
    active = active_jobs(state)
    limits = state["limits"]
    run = state["runs"][job["run"]]
    return (len(active) < limits["total"]
            and (not job["heavy"] or sum(item["heavy"] for item in active) < limits["heavy"])
            and (job["kind"] != "discovery" or
                 (sum(item["kind"] == "discovery" for item in active) < limits["discovery"]
                  and sum(item["kind"] == "discovery" and item["run"] == run["id"] for item in active) < run["workers"])))


def charter_eligible(state, run, charter):
    if charter in run.get("deferred", {}):
        return False
    jobs = [job for job in state["jobs"].values() if job["charter"] == charter and job["kind"] == "discovery"
            and state["runs"][job["run"]]["baseline"] == run["baseline"]]
    if any(job["status"] in ("pending", "running") for job in jobs):
        return False
    reopened = state.get("reopened", {}).get(charter, {}).get("at", 0)
    jobs = [job for job in jobs if job["created"] >= reopened]
    done = sorted([job for job in jobs if job["status"] == "done"], key=lambda job: job["created"])
    # A blocked environment is not a clean pass; don't burn repeated units on it at the same revision.
    if done and done[-1]["report"]["outcome"] == "blocked":
        return False
    if len(done) < 2:
        return True
    for job in done[-2:]:
        findings = [item for item in state["findings"].values() if item["discovery_job"] == job["id"]]
        if any(item["status"] in ("validating", "ready", "claimed", "fixed", "needs_owner") for item in findings):
            return True
    return False


def dispatch(state, args, now):
    require(args.run in state["runs"], "Unknown run.")
    run = state["runs"][args.run]
    if run["status"] != "running" or now >= run["deadline"]:
        return {"dispatch": None, "reason": "paused_or_budget_finished"}
    pending = [job for job in state["jobs"].values() if job["run"] == args.run and job["status"] == "pending"]
    pending.sort(key=lambda job: (job["kind"] != "validation", job["created"]))
    backlog = sum(item["kind"] == "validation" and item["status"] in ("pending", "running") for item in state["jobs"].values())
    job = next((item for item in pending if can_dispatch(state, item) and
                (item["kind"] == "validation" or (item["charter"] not in run.get("deferred", {})
                 and now < run["discovery_deadline"] and backlog < state["limits"]["backlog"]))), None)
    if job is None:
        if backlog >= state["limits"]["backlog"] or now >= run["discovery_deadline"]:
            return {"dispatch": None, "reason": "validation_reserve_or_backlog"}
        if run["units_started"] >= run["max_units"]:
            return {"dispatch": None, "reason": "unit_budget_finished"}
        choices = [key for key in run["charters"] if charter_eligible(state, run, key)]
        choices.sort(key=lambda key: (sum(item["charter"] == key for item in state["jobs"].values())
                                     * run["charters"][key]["priority"], run["charters"][key]["priority"]))
        for charter in choices:
            preview = {"run": run["id"], "kind": "discovery", "heavy": run["charters"][charter]["heavy"]}
            if can_dispatch(state, preview):
                job = enqueue(state, run, charter, "discovery", MODELS[run["units_started"] % 2], now)
                run["units_started"] += 1
                break
    if job is None:
        return {"dispatch": None, "reason": "capacity_or_saturated_coverage"}
    job.update(status="running", token=uuid.uuid4().hex, stage="reserved", lease_until=now + 40 * 60,
               attempt=job["attempt"] + 1, task=None)
    return packet(state, job)


def apply(state, args, now):
    command = args.command
    if command == "init":
        return {"repository": REPOSITORY, "branch": BRANCH, "initialized": True}
    if command == "start":
        identifier(args.id)
        require(args.id not in state["runs"], "Run already exists; use resume.")
        require(0 < args.hours <= 168 and 1 <= args.units <= 10000
                and 1 <= args.workers <= state["limits"]["discovery"], "Invalid run budget.")
        selected = args.charters.split(",") if args.charters else list(CHARTERS)
        require(all(key in CHARTERS for key in selected), "Unknown charter.")
        state["runs"][args.id] = {"id": args.id, "baseline": args.baseline, "created": now, "status": "running",
                                 "deadline": now + args.hours * 3600, "discovery_deadline": now + args.hours * 2160,
                                 "max_units": args.units, "units_started": 0, "workers": args.workers,
                                 "charters": {key: CHARTERS[key] for key in selected}}
        return state["runs"][args.id]
    if command in ("pause", "resume"):
        require(args.run in state["runs"], "Unknown run.")
        run = state["runs"][args.run]
        run["status"] = "paused" if command == "pause" else "running"
        if command == "pause":
            run["pause_reason"] = text(args.reason, "reason", 3)
        else:
            require(0 < args.hours <= 168 and 0 <= args.units <= 10000, "Invalid extension budget.")
            run.update(deadline=now + args.hours * 3600, discovery_deadline=now + args.hours * 2160,
                       max_units=run["max_units"] + args.units)
            run.pop("completed_at", None)
        return run
    if command == "complete":
        require(args.run in state["runs"], "Unknown run.")
        run = state["runs"][args.run]
        require(not any(job["run"] == args.run and job["status"] in ("pending", "running")
                        for job in state["jobs"].values()), "Finish or reconcile every job before completing the run.")
        coverage_exhausted = (not active_jobs(state)
                              and not any(charter_eligible(state, run, key) for key in run["charters"]))
        require(run["units_started"] >= run["max_units"] or now >= run["deadline"] or coverage_exhausted,
                "The run still has discovery budget and eligible coverage.")
        run.update(status="completed", completed_at=now)
        return {"run": args.run, "status": "completed", "units_started": run["units_started"]}
    if command == "next":
        return dispatch(state, args, now)
    if command == "configure":
        require(1 <= args.discovery <= args.total <= 64 and 1 <= args.heavy <= args.total
                and 1 <= args.backlog <= 100, "Invalid global limits.")
        state["limits"] = {key: getattr(args, key) for key in ("total", "discovery", "heavy", "backlog")}
        return state["limits"]
    if command == "reopen":
        require(args.charter in CHARTERS, "Unknown charter.")
        text(args.probe, "new probe or resolved blocker", 12)
        state.setdefault("reopened", {})[args.charter] = {"at": now, "probe": args.probe}
        return {"charter": args.charter, "reopened": True}
    if command == "defer":
        require(args.run in state["runs"], "Unknown run.")
        run = state["runs"][args.run]
        charters = args.charters.split(",")
        require(all(key in run["charters"] for key in charters), "Unknown run charter.")
        text(args.reason, "shared setup blocker", 12)
        for key in charters:
            run.setdefault("deferred", {})[key] = {"reason": args.reason, "at": now}
        return {"run": run["id"], "deferred": run["deferred"]}
    if command in ("bind", "checkpoint", "submit", "finish", "recover"):
        job = get_job(state, args)
        run = state["runs"][job["run"]]
        if command == "bind":
            text(args.task, "task identifier", 3)
            require(args.model == job["model"], "Actual delegated model differs from the assigned model.")
            require(job["task"] in (None, args.task), "Job is already bound to another task.")
            require(not any(other["id"] != job["id"] and other.get("task") == args.task for other in state["jobs"].values()),
                    "A fresh task/context is required for every job.")
            job["task"] = args.task
        elif command == "checkpoint":
            require(args.stage in STAGES, "Invalid checkpoint stage.")
            checkpoint = {"at": now, "stage": args.stage, "attempt": job["attempt"], "note": text(args.note, "note", 3)}
            job.setdefault("checkpoints", []).append(checkpoint)
            job.update(stage=args.stage, checkpoint=checkpoint)
        elif command == "recover":
            # Expiry is only a warning; never grant a second writer while the first might still be alive.
            require(args.stopped_task == (job["task"] or "never-launched"), "Stopped task must match the recorded owner.")
            text(args.proof, "stop and cleanup proof", 12)
            job["history"].append({"attempt": job["attempt"], "task": job["task"], "proof": args.proof,
                                   "checkpoint": job.get("checkpoint"), "at": now})
            job.update(status="pending", token=None, task=None, stage="reserved")
        else:
            require(job["task"], "Bind the actual delegated task before accepting its report.")
            if command == "submit":
                require(job["kind"] == "discovery", "Only discovery jobs submit candidates.")
                candidate_report(args.report, run["baseline"])
                key = args.report["dedupe_key"].strip().lower()
                existing = next((item for item in state["findings"].values() if item["claim"]["dedupe_key"].strip().lower() == key), None)
                if existing:
                    return {"duplicate_of": existing["id"], "status": existing["status"]}
                require(sum(item["discovery_job"] == job["id"] for item in state["findings"].values()) < 3,
                        "Three candidates per unit maximum; finish this unit before exploring more.")
                finding_id = "q-" + digest(key)[:16]
                finding = {"id": finding_id, "charter": job["charter"], "claim": args.report, "created": now,
                           "status": "validating", "discovery_job": job["id"], "explorer": {"task": job["task"], "model": job["model"]}}
                state["findings"][finding_id] = finding
                validator = enqueue(state, run, job["charter"], "validation", MODELS[1 - MODELS.index(job["model"])], now, finding_id)
                finding["validation_job"] = validator["id"]
                return {"id": finding_id, "status": "validating"}
            completion_report(args.report, job, run)
            if job["kind"] == "validation":
                finding = state["findings"][job["finding"]]
                require(finding["explorer"]["task"] != job["task"] and finding["explorer"]["model"] != job["model"],
                        "Acceptance needs independent tasks using two different GPT models.")
                if args.report["verdict"] == "accept" and finding["claim"]["evidence_kind"] != "static":
                    require(args.report["method"] == "executed", "Runtime/browser claims need an executed independent reproduction.")
                finding.update(validation=args.report, validator={"task": job["task"], "model": job["model"]},
                               status={"accept": "ready", "reject": "rejected", "already_fixed": "already_fixed", "needs_owner": "needs_owner"}[args.report["verdict"]],
                               priority=args.report["priority"])
            job.update(status="done", report=args.report, finished=now)
        return {"job": job["id"], "status": job["status"]}
    if command == "take":
        text(args.worker, "worker identity", 3)
        require(not any(item.get("claim_owner", {}).get("worker") == args.worker for item in state["findings"].values()),
                "This worker already owns a finding; resolve or release it first.")
        choices = [item for item in state["findings"].values() if item["status"] == "ready"
                   and (not args.id or item["id"] == args.id)]
        choices.sort(key=lambda item: (item["priority"], item["created"]))
        if not choices:
            return {"finding": None, "reason": "no_ready_finding"}
        item = choices[0]
        item.update(status="claimed", claim_owner={"worker": args.worker, "token": uuid.uuid4().hex, "at": now,
                                                  "lease_until": now + 3600})
        return item
    if command in ("release", "resolve", "recover-fix"):
        require(args.id in state["findings"], "Unknown finding.")
        item = state["findings"][args.id]
        owner = item.get("claim_owner", {})
        require(item["status"] == "claimed" and owner.get("token") == args.token, "Stale finding claim token.")
        if command == "recover-fix":
            require(args.stopped_task == owner["worker"], "Stopped task must match the fixing worker.")
            text(args.proof, "stop and cleanup proof", 12)
            item.update(status="ready", recovery=args.proof)
        elif command == "release":
            item.update(status="ready", release_note=text(args.reason, "reason", 8))
        else:
            fields(args.report, ["outcome", "summary", "checks", "references"])
            require(args.report["outcome"] in ("fixed", "blocked"), "Invalid resolution.")
            for key in ("summary", "checks", "references"):
                text(args.report[key], key, 8)
            scrub_check(args.report)
            item.update(status=args.report["outcome"], resolution=args.report)
        item.setdefault("fix_history", []).append({"owner": owner, "at": now, "status": item["status"]})
        item.pop("claim_owner", None)
        return {"id": item["id"], "status": item["status"]}
    if command == "feedback":
        require(args.id in state["findings"], "Unknown finding.")
        item = state["findings"][args.id]
        require(item["status"] not in ("claimed", "validating"), "Stop/reconcile active work before owner feedback.")
        text(args.reason, "owner feedback", 8)
        item["feedback"] = {"decision": args.decision, "reason": args.reason, "at": now}
        if args.decision == "reject":
            item["status"] = "rejected"
        if args.rule:
            text(args.rule, "reporting rule", 8)
            if args.rule not in state["rules"]:
                state["rules"].append(args.rule)
        return {"id": item["id"], "status": item["status"]}
    if command == "requeue":
        require(args.id in state["findings"], "Unknown finding.")
        item = state["findings"][args.id]
        require(item["status"] == "blocked" and item.get("validation", {}).get("verdict") == "accept",
                "Only a previously validated blocked fix can be requeued.")
        item.update(status="ready", requeue_reason=text(args.reason, "resolved blocker", 12))
        return {"id": item["id"], "status": item["status"]}
    if command == "revalidate":
        require(args.id in state["findings"] and args.run in state["runs"], "Unknown finding or run.")
        item, run = state["findings"][args.id], state["runs"][args.run]
        require(item["status"] not in ("claimed", "validating"), "Reconcile active work before revalidation.")
        require(item["charter"] in run["charters"], "Target run must include the finding's charter.")
        text(args.reason, "reason for fresh validation", 12)
        item.setdefault("validation_history", []).append({"report": item.get("validation"), "validator": item.get("validator"),
                                                          "reason": args.reason, "at": now})
        validator = enqueue(state, run, item["charter"], "validation",
                            MODELS[1 - MODELS.index(item["explorer"]["model"])], now, item["id"])
        item.update(status="validating", validation_job=validator["id"])
        return {"id": item["id"], "status": "validating", "job": validator["id"]}
    raise QueueError("Unknown mutation.")


def mutate(store, args):
    request = text(args.request, "request ID", maximum=180)
    intent = {key: value for key, value in vars(args).items() if key not in ("request", "file")}
    scrub_check(intent, bounded=False)
    request_hash = digest(intent)
    now = time.time()

    def update(old):
        require(old is not None or args.command == "init", "Run pnpm quality init first.")
        state = copy.deepcopy(old) if old else new_state()
        if request in state["receipts"]:
            receipt = state["receipts"][request]
            require(receipt["intent"] == request_hash, "Request ID reused for a different operation.")
            return old, receipt["output"]
        output = apply(state, args, now)
        scrub_check(output, bounded=False)
        # No-work is not a reservation. The same slot can try again after a completion wake-up.
        if output.get("dispatch", "present") is not None and output.get("finding", "present") is not None:
            state["receipts"][request] = {"intent": request_hash, "output": copy.deepcopy(output)}
        return state, output

    return store.transaction(update)


def read_command(state, args):
    if args.command == "status":
        now = time.time()
        return {"repository": REPOSITORY, "branch": BRANCH, "limits": state["limits"], "runs": list(state["runs"].values()),
                "jobs": [{key: job.get(key) for key in ("id", "run", "kind", "charter", "status", "stage", "task", "token", "lease_until", "attempt", "checkpoint", "checkpoints", "history")}
                         | {"expired": job.get("lease_until", now + 1) < now and job["status"] == "running"}
                         for job in state["jobs"].values() if job["status"] != "done"],
                "findings": {status: sum(item["status"] == status for item in state["findings"].values())
                             for status in ("validating", "ready", "claimed", "fixed", "blocked", "rejected", "already_fixed", "needs_owner")},
                "rules": state["rules"]}
    if args.command == "list":
        return [{"id": item["id"], "status": item["status"], "priority": item.get("priority"),
                 "category": item["claim"]["category"], "title": item["claim"]["title"], "charter": item["charter"]}
                for item in state["findings"].values() if not args.status or item["status"] == args.status]
    if args.command == "show":
        require(args.id in state["findings"], "Unknown finding.")
        return state["findings"][args.id]
    if args.command == "packet":
        job = get_job(state, args)
        return packet(state, job)
    if args.command == "verify-baseline":
        require(args.run in state["runs"], "Unknown run.")
        expected = state["runs"][args.run]["baseline"]
        require(baseline_at(args.root, clean=True) == expected, "Checkout does not match both frozen revisions.")
        return {"verified": True, "baseline": expected}
    raise QueueError("Unknown read command.")


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    commands = p.add_subparsers(dest="command", required=True)
    commands.add_parser("init")
    commands.add_parser("status")
    commands.add_parser("charters")
    defer = commands.add_parser("defer")
    defer.add_argument("--run", required=True)
    defer.add_argument("--charters", required=True)
    defer.add_argument("--reason", required=True)
    configure = commands.add_parser("configure")
    for name in ("total", "discovery", "heavy", "backlog"):
        configure.add_argument(f"--{name}", type=int, required=True)
    reopen = commands.add_parser("reopen")
    reopen.add_argument("--charter", required=True)
    reopen.add_argument("--probe", required=True)
    revalidate = commands.add_parser("revalidate")
    revalidate.add_argument("--id", required=True)
    revalidate.add_argument("--run", required=True)
    revalidate.add_argument("--reason", required=True)
    listing = commands.add_parser("list")
    listing.add_argument("--status")
    show = commands.add_parser("show")
    show.add_argument("--id", required=True)
    start = commands.add_parser("start")
    start.add_argument("--id", required=True)
    start.add_argument("--hours", type=float, default=2)
    start.add_argument("--units", type=int, default=8)
    start.add_argument("--workers", type=int, default=4)
    start.add_argument("--charters")
    start.add_argument("--root", default=".")
    start.add_argument("--public-ref", default="HEAD")
    start.add_argument("--console-ref", default="HEAD")
    for name in ("pause", "resume", "next", "verify-baseline", "complete"):
        sub = commands.add_parser(name)
        sub.add_argument("--run", required=True)
        if name == "pause":
            sub.add_argument("--reason", required=True)
        elif name == "resume":
            sub.add_argument("--hours", type=float, required=True)
            sub.add_argument("--units", type=int, default=0)
        elif name == "verify-baseline":
            sub.add_argument("--root", default=".")
    for name in ("bind", "checkpoint", "submit", "finish", "recover", "packet"):
        sub = commands.add_parser(name)
        sub.add_argument("--job", required=True)
        sub.add_argument("--token", required=True)
        if name == "bind":
            sub.add_argument("--task", required=True)
            sub.add_argument("--model", choices=MODELS, required=True)
        elif name == "checkpoint":
            sub.add_argument("--stage", choices=STAGES, required=True)
            sub.add_argument("--note", required=True)
        elif name in ("submit", "finish"):
            sub.add_argument("--file", required=True)
        elif name == "recover":
            sub.add_argument("--stopped-task", required=True)
            sub.add_argument("--proof", required=True)
    take = commands.add_parser("take")
    take.add_argument("--id")
    take.add_argument("--worker", required=True)
    for name in ("release", "resolve", "recover-fix", "feedback", "requeue"):
        sub = commands.add_parser(name)
        sub.add_argument("--id", required=True)
        if name not in ("feedback", "requeue"):
            sub.add_argument("--token", required=True)
        if name in ("release", "feedback", "requeue"):
            sub.add_argument("--reason", required=True)
        if name == "resolve":
            sub.add_argument("--file", required=True)
        if name == "recover-fix":
            sub.add_argument("--stopped-task", required=True)
            sub.add_argument("--proof", required=True)
        if name == "feedback":
            sub.add_argument("--decision", choices=("keep", "reject"), required=True)
            sub.add_argument("--rule")
    readonly = ("status", "list", "show", "packet", "verify-baseline", "charters")
    for name, sub in commands.choices.items():
        if name not in readonly and name not in ("init", "start"):
            sub.add_argument("--request", required=True, help="Stable unique operation ID. Reuse it on retry, never for a different action.")
    return p


def main():
    args = parser().parse_args()
    if args.command == "charters":
        return CHARTERS
    if args.command == "start":
        args.baseline = baseline_at(args.root, args.public_ref, args.console_ref)
        args.request = f"start-{args.id}"
    elif args.command == "init":
        args.request = "init-v1"
    if hasattr(args, "file"):
        require(Path(args.file).stat().st_size <= 100000, "Report file exceeds 100 KB.")
        args.report = json.loads(Path(args.file).read_text())
    store = GitStore()
    if args.command in ("status", "list", "show", "packet", "verify-baseline"):
        return read_command(store.transaction(), args)
    return mutate(store, args)


if __name__ == "__main__":
    try:
        print(json.dumps(main(), indent=2))
    except (QueueError, ValueError, OSError, subprocess.TimeoutExpired) as error:
        print(json.dumps({"error": str(error) if isinstance(error, QueueError) else type(error).__name__}), file=sys.stderr)
        sys.exit(1)
