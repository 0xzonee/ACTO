from __future__ import annotations

import typer
from rich import print

from acto.plugins import PluginLoader

plugins_app = typer.Typer(help="List installed ACTO plugins.")


@plugins_app.command("list")
def list_plugins() -> None:
    loader = PluginLoader()
    items = loader.list_plugins()
    if not items:
        print("No plugins installed.")
        return
    for p in items:
        print(f"- {p.name} ({p.version}) -> {p.entrypoint}")
