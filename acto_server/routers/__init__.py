# ACTO Server - API Routers
# Modular FastAPI routers for different API domains

from .auth import router as auth_router
from .keys import router as keys_router
from .proofs import router as proofs_router
from .access import router as access_router
from .stats import router as stats_router
from .fleet import router as fleet_router

__all__ = [
    "auth_router",
    "keys_router",
    "proofs_router",
    "access_router",
    "stats_router",
    "fleet_router",
]

