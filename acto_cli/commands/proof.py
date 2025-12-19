from __future__ import annotations

from pathlib import Path

import typer
from rich import print

from acto.crypto import load_keypair
from acto.errors import ProofError, TelemetryError
from acto.proof import ProofEnvelope, create_proof, verify_proof
from acto.registry import ProofRegistry
from acto.telemetry import CsvTelemetryParser, JsonlTelemetryParser

proof_app = typer.Typer(help="Create and verify ACTO proofs.")


def _select_parser(source: str):
    p = Path(source)
    if p.suffix.lower() == ".jsonl":
        return JsonlTelemetryParser()
    if p.suffix.lower() == ".csv":
        return CsvTelemetryParser()
    raise typer.BadParameter("Unsupported telemetry file type. Use .jsonl or .csv")


@proof_app.command("create")
def create(
    task_id: str = typer.Option(..., help="Task ID"),
    source: str = typer.Option(..., help="Telemetry source file (.jsonl or .csv)"),
    keypair: str = typer.Option("data/keys/acto_keypair.json", help="Keypair path"),
    robot_id: str | None = typer.Option(None, help="Robot ID"),
    run_id: str | None = typer.Option(None, help="Run ID"),
    out: str = typer.Option("data/proofs/proof.json", help="Output proof path"),
    registry: bool = typer.Option(True, help="Store proof in local registry"),
) -> None:
    """Create a signed proof envelope."""
    try:
        kp = load_keypair(keypair)
        parser = _select_parser(source)
        bundle = parser.parse(
            source,
            task_id=task_id,
            robot_id=robot_id,
            run_id=run_id,
        )

        env = create_proof(bundle, kp.private_key_b64, kp.public_key_b64)

        Path(out).parent.mkdir(parents=True, exist_ok=True)
        Path(out).write_text(env.model_dump_json(indent=2), encoding="utf-8")

        print(f"[green]Proof written:[/green] {out}")
        print(f"[cyan]Payload hash:[/cyan] {env.payload.payload_hash}")

        if registry:
            reg = ProofRegistry()
            proof_id = reg.upsert(env)
            print(f"[green]Stored in registry:[/green] {proof_id}")

    except (TelemetryError, ProofError) as e:
        print(f"[red]{e}[/red]")
        raise typer.Exit(code=1) from e


@proof_app.command("verify")
def verify(
    proof: str = typer.Option(..., help="Proof JSON file"),
) -> None:
    """Verify a proof envelope."""
    try:
        env = ProofEnvelope.model_validate_json(
            Path(proof).read_text(encoding="utf-8")
        )
        verify_proof(env)
        print("[green]Valid proof.[/green]")
        print(f"[cyan]Payload hash:[/cyan] {env.payload.payload_hash}")

    except Exception as e:
        print(f"[red]Invalid proof:[/red] {e}")
        raise typer.Exit(code=1) from e
