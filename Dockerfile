FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md LICENSE /app/
COPY acto /app/acto
COPY acto_cli /app/acto_cli
COPY acto_server /app/acto_server
COPY docs /app/docs
COPY examples /app/examples
COPY migrations /app/migrations
COPY alembic.ini /app/alembic.ini

RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir ".[all]"

ENV ACTO_HOST=0.0.0.0
ENV ACTO_PORT=8080

EXPOSE 8080
CMD ["python", "-m", "acto_server.run"]
