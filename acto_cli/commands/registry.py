from __future__ import annotations

import json

import typer
from rich import print

from acto.registry import ProofRegistry

registry_app = typer.Typer(help="Local proof registry utilities.")


@registry_app.command("list")
def list_cmd(limit: int = typer.Option(50, help="Max items")) -> None:
    reg = ProofRegistry()
    items = reg.list(limit=limit)
    print(json.dumps(items, indent=2))


@registry_app.command("get")
def get_cmd(proof_id: str = typer.Option(..., help="Proof ID")) -> None:
    reg = ProofRegistry()
    env = reg.get(proof_id)
    print(env.model_dump_json(indent=2))
