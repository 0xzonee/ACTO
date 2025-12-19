from __future__ import annotations

from dataclasses import dataclass

from acto.proof.models import ProofEnvelope


@dataclass
class ScoreResult:
    score: float
    reasons: dict[str, float]


class ReputationScorer:
    """Explainable reputation score derived from proof payload."""

    def __init__(self, weights: dict[str, float] | None = None):
        self.weights = weights or {"events_count": 0.4, "safety_ok_ratio": 0.4, "freshness": 0.2}

    def score(self, env: ProofEnvelope) -> ScoreResult:
        reasons: dict[str, float] = {}
        events = env.payload.telemetry_normalized.get("events", [])
        events_count = float(len(events))
        reasons["events_count"] = min(1.0, events_count / 100.0)

        ok_vals = []
        for e in events:
            data = e.get("data", {})
            if isinstance(data, dict) and "ok" in data:
                ok_vals.append(bool(data["ok"]))
        ok_ratio = (
            sum(1 for v in ok_vals if v) / float(len(ok_vals))
            if ok_vals
            else 0.5
        )

        reasons["safety_ok_ratio"] = float(ok_ratio)

        freshness = 0.5
        try:
            import datetime as _dt
            dt = _dt.datetime.fromisoformat(env.payload.created_at)
            now = _dt.datetime.now(dt.tzinfo)
            age_seconds = max(0.0, (now - dt).total_seconds())
            freshness = max(0.0, min(1.0, 1.0 - (age_seconds / (7 * 24 * 3600))))
        except Exception:
            freshness = 0.5
        reasons["freshness"] = float(freshness)

        score = 0.0
        for k, wgt in self.weights.items():
            score += wgt * reasons.get(k, 0.0)

        return ScoreResult(score=float(round(score, 6)), reasons=reasons)
