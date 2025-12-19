from __future__ import annotations

import typer
from rich import print

from acto_server.run import main as run_server

server_app = typer.Typer(help="Run the ACTO verification API server.")


@server_app.command("run")
def run() -> None:
    """Run the API server."""
    print("[cyan]Starting ACTO server...[/cyan]")
    run_server()
