from __future__ import annotations

import sys
from pathlib import Path

import httpx


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python submit_proof.py <proof.json>")
        return 2

    proof_path = Path(sys.argv[1])
    env = httpx.Response(200, text=proof_path.read_text(encoding="utf-8")).json()
    r = httpx.post("http://127.0.0.1:8080/v1/proofs", json={"envelope": env}, timeout=30)
    print(r.status_code)
    print(r.text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
