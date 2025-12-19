from __future__ import annotations

import os
from acto_server.app import create_app
from mangum import Mangum

# Debug: Check if environment variable is set
db_url = os.getenv("ACTO_DB_URL", "NOT SET")
print(f"DEBUG: ACTO_DB_URL = {db_url[:50]}..." if len(db_url) > 50 else f"DEBUG: ACTO_DB_URL = {db_url}")

# FastAPI
app = create_app()

# Mangum adapter
handler = Mangum(app, lifespan="off")
