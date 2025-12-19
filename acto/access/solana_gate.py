from __future__ import annotations

from dataclasses import dataclass

from acto.access.models import AccessDecision
from acto.errors import AccessError


@dataclass
class SolanaTokenGate:
    rpc_url: str

    def _lazy_import(self):
        try:
            from solana.rpc.api import Client  # type: ignore
            from solders.pubkey import Pubkey  # type: ignore
        except Exception as e:
            raise AccessError(
                "Solana dependencies are not installed. Install with: pip install -e '.[solana]'"
            ) from e
        return Client, Pubkey

    def check_balance(self, owner: str, mint: str) -> float:
        Client, Pubkey = self._lazy_import()
        client = Client(self.rpc_url)

        owner_pk = Pubkey.from_string(owner)
        mint_pk = Pubkey.from_string(mint)

        resp = client.get_token_accounts_by_owner(owner_pk, {"mint": mint_pk})
        value = resp.value
        if not value:
            return 0.0

        total = 0.0
        for item in value:
            parsed = item.account.data.parsed  # type: ignore
            amt = parsed["info"]["tokenAmount"]["uiAmount"]
            total += float(amt or 0.0)
        return total

    def decide(self, owner: str, mint: str, minimum: float) -> AccessDecision:
        bal = self.check_balance(owner, mint)
        if bal >= minimum:
            return AccessDecision(allowed=True, reason="ok", balance=bal)
        return AccessDecision(allowed=False, reason="insufficient_balance", balance=bal)
