from __future__ import annotations

import csv
import json
from abc import ABC, abstractmethod
from pathlib import Path

from acto.errors import TelemetryError
from acto.telemetry.models import TelemetryBundle, TelemetryEvent


class TelemetryParser(ABC):
    @abstractmethod
    def parse(
        self,
        path: str | Path,
        task_id: str,
        robot_id: str | None = None,
        run_id: str | None = None,
    ) -> TelemetryBundle:
        raise NotImplementedError


class JsonlTelemetryParser(TelemetryParser):
    def parse(
        self,
        path: str | Path,
        task_id: str,
        robot_id: str | None = None,
        run_id: str | None = None,
    ) -> TelemetryBundle:
        p = Path(path)
        if not p.exists():
            raise TelemetryError(f"Telemetry file not found: {p}")

        events: list[TelemetryEvent] = []
        with p.open("r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as e:
                    raise TelemetryError(f"Invalid JSONL at line {idx + 1}: {e}") from e

                if "ts" not in obj or "topic" not in obj or "data" not in obj:
                    raise TelemetryError(f"Missing keys at line {idx + 1}: expected ts/topic/data")

                events.append(TelemetryEvent(ts=obj["ts"], topic=obj["topic"], data=obj["data"]))

        return TelemetryBundle(task_id=task_id, robot_id=robot_id, run_id=run_id, events=events, meta={})


class CsvTelemetryParser(TelemetryParser):
    def parse(
        self,
        path: str | Path,
        task_id: str,
        robot_id: str | None = None,
        run_id: str | None = None,
    ) -> TelemetryBundle:
        p = Path(path)
        if not p.exists():
            raise TelemetryError(f"Telemetry file not found: {p}")

        events: list[TelemetryEvent] = []
        with p.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                if not row.get("ts") or not row.get("topic") or not row.get("data_json"):
                    raise TelemetryError(f"Missing columns at row {idx + 2}")
                try:
                    data = json.loads(row["data_json"])
                except json.JSONDecodeError as e:
                    raise TelemetryError(f"Invalid JSON in data_json at row {idx + 2}: {e}") from e

                events.append(TelemetryEvent(ts=row["ts"], topic=row["topic"], data=data))

        return TelemetryBundle(task_id=task_id, robot_id=robot_id, run_id=run_id, events=events, meta={})
