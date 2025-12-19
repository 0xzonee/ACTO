from __future__ import annotations

import uvicorn

from acto.config import Settings
from acto.logging import configure_logging
from acto_server.app import create_app


def main() -> None:
    settings = Settings()
    configure_logging(settings.log_level, settings.json_logs)
    uvicorn.run(create_app(), host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
