#!/usr/bin/env python3
"""Record dated English-study summaries and select recent calendar days."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


DEFAULT_HISTORY = Path(".english-review-card/history.jsonl")


def _text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    return value.strip()


def _string_list(value: Any, field: str, *, required: bool) -> list[str]:
    if not isinstance(value, list) or (required and not value):
        raise ValueError(f"{field} must be {'a non-empty ' if required else 'a '}list")
    cleaned = [_text(item, field) for item in value]
    if len(set(cleaned)) != len(cleaned):
        raise ValueError(f"{field} must contain unique values")
    return cleaned


def validate_summary(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("summary must be an object")
    study_date = date.fromisoformat(_text(value.get("study_date"), "study_date"))
    timezone_name = _text(value.get("timezone"), "timezone")
    try:
        ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as error:
        raise ValueError("timezone must be a valid IANA timezone") from error
    source_summary = _text(value.get("source_summary"), "source_summary")
    knowledge_points = _string_list(value.get("knowledge_points"), "knowledge_points", required=True)
    mistakes = _string_list(value.get("mistakes", []), "mistakes", required=False)
    session_id = value.get("session_id")
    if session_id is None:
        identity = json.dumps([study_date.isoformat(), timezone_name, source_summary, knowledge_points], ensure_ascii=False)
        session_id = hashlib.sha256(identity.encode()).hexdigest()[:16]
    else:
        session_id = _text(session_id, "session_id")
    return {
        "study_date": study_date.isoformat(),
        "timezone": timezone_name,
        "session_id": session_id,
        "source_summary": source_summary,
        "knowledge_points": knowledge_points,
        "mistakes": mistakes,
    }


def read_history(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    records: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            records.append(validate_summary(json.loads(line)))
        except (ValueError, json.JSONDecodeError) as error:
            raise ValueError(f"invalid history line {line_number}: {error}") from error
    return records


def write_history(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            for record in sorted(records, key=lambda item: (item["study_date"], item["session_id"])):
                handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def record_summary(path: Path, value: Any) -> dict[str, Any]:
    summary = validate_summary(value)
    records = read_history(path)
    key = (summary["study_date"], summary["session_id"])
    records = [record for record in records if (record["study_date"], record["session_id"]) != key]
    records.append(summary)
    write_history(path, records)
    return summary


def recent_summaries(path: Path, days: int, as_of: date, timezone_name: str) -> dict[str, Any]:
    if days < 1:
        raise ValueError("days must be a positive integer")
    try:
        ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as error:
        raise ValueError("timezone must be a valid IANA timezone") from error
    start = as_of - timedelta(days=days - 1)
    records = [record for record in read_history(path) if start <= date.fromisoformat(record["study_date"]) <= as_of]
    return {
        "review_window": {
            "days": days,
            "start_date": start.isoformat(),
            "end_date": as_of.isoformat(),
            "timezone": timezone_name,
            "summary_count": len(records),
        },
        "summaries": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--history", type=Path, default=DEFAULT_HISTORY)
    subparsers = parser.add_subparsers(dest="command", required=True)
    record = subparsers.add_parser("record")
    record.add_argument("summary", type=Path)
    recent = subparsers.add_parser("recent")
    recent.add_argument("--days", type=int, required=True)
    recent.add_argument("--as-of", type=date.fromisoformat)
    recent.add_argument("--timezone", default="Asia/Shanghai")
    args = parser.parse_args()
    if args.command == "record":
        result = record_summary(args.history, json.loads(args.summary.read_text(encoding="utf-8")))
    else:
        as_of = args.as_of or datetime.now(ZoneInfo(args.timezone)).date()
        result = recent_summaries(args.history, args.days, as_of, args.timezone)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
