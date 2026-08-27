#!/usr/bin/env python3
"""Manage the repository-local, file-backed task ledger."""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import re
import sys
import tempfile
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


SCHEMA_VERSION = 1
STATUSES = {"pending", "assigned", "in_progress", "review", "completed", "blocked", "cancelled"}
ACTIVE_STATUSES = {"assigned", "in_progress", "review"}
TRANSITIONS = {
    "pending": {"assigned", "cancelled"},
    "assigned": {"pending", "in_progress", "blocked", "cancelled"},
    "in_progress": {"review", "blocked", "cancelled"},
    "review": {"in_progress", "completed", "blocked", "cancelled"},
    "blocked": {"pending", "assigned", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}
TASK_ID = re.compile(r"^task-[0-9]{4,}$")


class TaskError(RuntimeError):
    pass


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def tasks_dir(root: Path) -> Path:
    return root / "_workspace" / "tasks"


def index_path(root: Path) -> Path:
    return tasks_dir(root) / "index.json"


def atomic_write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


@contextmanager
def locked(root: Path) -> Iterator[None]:
    directory = tasks_dir(root)
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / ".lock").open("a+", encoding="utf-8") as handle:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def empty_index() -> dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "next_id": 1, "tasks": {}}


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise TaskError(f"Missing ledger file: {path}") from error
    except json.JSONDecodeError as error:
        raise TaskError(f"Invalid JSON in {path}: {error}") from error
    if not isinstance(value, dict) or value.get("schema_version") != SCHEMA_VERSION:
        raise TaskError(f"Unsupported ledger schema in {path}")
    return value


def load_index(root: Path) -> dict[str, Any]:
    return load_json(index_path(root))


def task_path(root: Path, task_id: str) -> Path:
    if not TASK_ID.fullmatch(task_id):
        raise TaskError(f"Invalid task id: {task_id}")
    return tasks_dir(root) / f"{task_id}.json"


def load_task(root: Path, task_id: str) -> dict[str, Any]:
    task = load_json(task_path(root, task_id))
    if task.get("id") != task_id or task.get("status") not in STATUSES:
        raise TaskError(f"Invalid task record: {task_id}")
    return task


def summary(task: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": task["title"],
        "status": task["status"],
        "assignee": task["assignee"],
        "updated_at": task["updated_at"],
        "file": f"{task['id']}.json",
    }


def persist(root: Path, index: dict[str, Any], task: dict[str, Any]) -> None:
    index["tasks"][task["id"]] = summary(task)
    atomic_write(task_path(root, task["id"]), task)
    atomic_write(index_path(root), index)


def ensure_initialized(root: Path) -> None:
    if not index_path(root).exists():
        atomic_write(index_path(root), empty_index())


def dependencies_complete(root: Path, task: dict[str, Any]) -> bool:
    return all(load_task(root, dependency)["status"] == "completed" for dependency in task["depends_on"])


def normalized_path(value: str) -> str:
    path = value.strip().strip("/")
    if not path or path == "." or path.startswith("../") or "/../" in path:
        raise TaskError(f"Owned paths must be repository-relative: {value}")
    return path


def paths_overlap(left: str, right: str) -> bool:
    left_parts = Path(left).parts
    right_parts = Path(right).parts
    length = min(len(left_parts), len(right_parts))
    return left_parts[:length] == right_parts[:length]


def has_active_overlap(root: Path, index: dict[str, Any], candidate: dict[str, Any]) -> bool:
    for task_id, item in index["tasks"].items():
        if task_id == candidate["id"] or item["status"] not in ACTIVE_STATUSES:
            continue
        active = load_task(root, task_id)
        if any(paths_overlap(a, b) for a in candidate["owned_paths"] for b in active["owned_paths"]):
            return True
    return False


def add_history(task: dict[str, Any], old: str, new: str, actor: str, note: str) -> None:
    timestamp = now()
    task["updated_at"] = timestamp
    task["history"].append({"at": timestamp, "from": old, "to": new, "actor": actor, "note": note})


def cmd_init(args: argparse.Namespace) -> None:
    root = args.root.resolve()
    with locked(root):
        existed = index_path(root).exists()
        ensure_initialized(root)
    print("Task ledger already initialized." if existed else f"Initialized {index_path(root)}")


def cmd_create(args: argparse.Namespace) -> None:
    root = args.root.resolve()
    with locked(root):
        ensure_initialized(root)
        index = load_index(root)
        for dependency in args.depends_on:
            load_task(root, dependency)
        number = index["next_id"]
        task_id = f"task-{number:04d}"
        timestamp = now()
        status = "assigned" if args.assignee else "pending"
        task = {
            "schema_version": SCHEMA_VERSION,
            "id": task_id,
            "title": args.title.strip(),
            "description": args.description.strip(),
            "status": status,
            "assignee": args.assignee,
            "depends_on": list(dict.fromkeys(args.depends_on)),
            "owned_paths": list(dict.fromkeys(normalized_path(path) for path in args.owned_path)),
            "artifacts": [],
            "blocked_reason": None,
            "created_at": timestamp,
            "updated_at": timestamp,
            "history": [{"at": timestamp, "from": None, "to": status, "actor": args.actor, "note": "task created"}],
        }
        if not task["title"]:
            raise TaskError("Task title must not be empty")
        index["next_id"] = number + 1
        persist(root, index, task)
    print(task_id)


def cmd_assign(args: argparse.Namespace) -> None:
    root = args.root.resolve()
    with locked(root):
        index = load_index(root)
        task = load_task(root, args.task_id)
        old = task["status"]
        if old not in {"pending", "assigned", "blocked"}:
            raise TaskError(f"Cannot assign a task in {old}")
        if old != "assigned" and "assigned" not in TRANSITIONS[old]:
            raise TaskError(f"Invalid transition: {old} -> assigned")
        task["status"] = "assigned"
        task["assignee"] = args.assignee
        task["blocked_reason"] = None
        add_history(task, old, "assigned", args.actor, args.note or f"assigned to {args.assignee}")
        persist(root, index, task)
    print(args.task_id)


def cmd_claim(args: argparse.Namespace) -> None:
    root = args.root.resolve()
    with locked(root):
        index = load_index(root)
        selected = None
        for task_id in sorted(index["tasks"]):
            task = load_task(root, task_id)
            if task["status"] != "pending":
                continue
            if dependencies_complete(root, task) and not has_active_overlap(root, index, task):
                selected = task
                break
        if selected is None:
            raise TaskError("No ready, non-conflicting pending task")
        selected["status"] = "assigned"
        selected["assignee"] = args.assignee
        add_history(selected, "pending", "assigned", args.actor, args.note or f"claimed by {args.assignee}")
        persist(root, index, selected)
    print(selected["id"])


def cmd_transition(args: argparse.Namespace) -> None:
    root = args.root.resolve()
    with locked(root):
        index = load_index(root)
        task = load_task(root, args.task_id)
        old, new = task["status"], args.to
        if new not in TRANSITIONS[old]:
            raise TaskError(f"Invalid transition: {old} -> {new}")
        if new in ACTIVE_STATUSES and not task["assignee"]:
            raise TaskError(f"State {new} requires an assignee")
        if new == "in_progress" and not dependencies_complete(root, task):
            raise TaskError("Cannot start until all dependencies are completed")
        if new == "blocked" and not args.blocked_reason:
            raise TaskError("Entering blocked requires --blocked-reason")
        if new == "pending":
            task["assignee"] = None
        task["status"] = new
        task["blocked_reason"] = args.blocked_reason if new == "blocked" else None
        task["artifacts"] = list(dict.fromkeys([*task["artifacts"], *args.artifact]))
        add_history(task, old, new, args.actor, args.note or "")
        persist(root, index, task)
    print(args.task_id)


def ready(root: Path, task: dict[str, Any], index: dict[str, Any]) -> bool:
    return task["status"] == "pending" and dependencies_complete(root, task) and not has_active_overlap(root, index, task)


def cmd_list(args: argparse.Namespace) -> None:
    root = args.root.resolve()
    with locked(root):
        index = load_index(root)
        tasks = [load_task(root, task_id) for task_id in sorted(index["tasks"])]
        if args.status:
            tasks = [task for task in tasks if task["status"] == args.status]
        if args.ready:
            tasks = [task for task in tasks if ready(root, task, index)]
    if args.json:
        print(json.dumps(tasks, ensure_ascii=False, indent=2, sort_keys=True))
        return
    if not tasks:
        print("No tasks.")
        return
    for task in tasks:
        assignee = task["assignee"] or "-"
        print(f"{task['id']}\t{task['status']}\t{assignee}\t{task['title']}")


def cmd_show(args: argparse.Namespace) -> None:
    with locked(args.root.resolve()):
        task = load_task(args.root.resolve(), args.task_id)
    print(json.dumps(task, ensure_ascii=False, indent=2, sort_keys=True))


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="repository root")
    commands = result.add_subparsers(dest="command", required=True)
    init = commands.add_parser("init", help="initialize the task ledger")
    init.set_defaults(func=cmd_init)

    create = commands.add_parser("create", help="create a task")
    create.add_argument("--title", required=True)
    create.add_argument("--description", default="")
    create.add_argument("--assignee")
    create.add_argument("--depends-on", action="append", default=[])
    create.add_argument("--owned-path", action="append", default=[])
    create.add_argument("--actor", default="integration-owner")
    create.set_defaults(func=cmd_create)

    assign = commands.add_parser("assign", help="assign a specific task")
    assign.add_argument("task_id")
    assign.add_argument("assignee")
    assign.add_argument("--actor", default="integration-owner")
    assign.add_argument("--note")
    assign.set_defaults(func=cmd_assign)

    claim = commands.add_parser("claim", help="atomically claim the next ready task")
    claim.add_argument("--assignee", required=True)
    claim.add_argument("--actor", default="integration-owner")
    claim.add_argument("--note")
    claim.set_defaults(func=cmd_claim)

    transition = commands.add_parser("transition", help="change task status")
    transition.add_argument("task_id")
    transition.add_argument("--to", required=True, choices=sorted(STATUSES))
    transition.add_argument("--actor", required=True)
    transition.add_argument("--note")
    transition.add_argument("--blocked-reason")
    transition.add_argument("--artifact", action="append", default=[])
    transition.set_defaults(func=cmd_transition)

    listing = commands.add_parser("list", help="list tasks")
    listing.add_argument("--status", choices=sorted(STATUSES))
    listing.add_argument("--ready", action="store_true")
    listing.add_argument("--json", action="store_true")
    listing.set_defaults(func=cmd_list)

    show = commands.add_parser("show", help="show one task")
    show.add_argument("task_id")
    show.set_defaults(func=cmd_show)
    return result


def main(argv: list[str] | None = None) -> int:
    try:
        args = parser().parse_args(argv)
        args.func(args)
        return 0
    except TaskError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
