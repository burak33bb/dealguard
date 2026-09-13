# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


class DealGuardEscrow(gl.Contract):
    client: Address
    worker: Address
    agreement: str
    latest_evidence: str
    latest_verdict: str
    escrow_amount: u256
    latest_release_bps: u32
    funded: bool
    resolved: bool

    def __init__(self):
        self.client = Address("0x0000000000000000000000000000000000000000")
        self.worker = Address("0x0000000000000000000000000000000000000000")
        self.agreement = ""
        self.latest_evidence = ""
        self.latest_verdict = "draft"
        self.escrow_amount = u256(0)
        self.latest_release_bps = u32(0)
        self.funded = False
        self.resolved = False

    @gl.public.write.payable
    def open_escrow(self, worker: str, agreement: str) -> None:
        if self.funded and not self.resolved:
            raise gl.vm.UserError("active escrow already exists")
        if gl.message.value == u256(0):
            raise gl.vm.UserError("escrow value required")

        self.client = gl.message.sender_address
        self.worker = Address(worker)
        self.agreement = agreement
        self.latest_evidence = ""
        self.latest_verdict = "funded"
        self.escrow_amount = gl.message.value
        self.latest_release_bps = u32(0)
        self.funded = True
        self.resolved = False

    @gl.public.write
    def resolve_dispute(self, delivery_evidence: str) -> None:
        if not self.funded:
            raise gl.vm.UserError("no funded escrow")
        if self.resolved:
            raise gl.vm.UserError("escrow already resolved")

        def leader_fn() -> str:
            prompt = f"""
You are DealGuard, resolving a funded escrow dispute between autonomous agents.

Agreement:
{self.agreement}

Delivery evidence:
{delivery_evidence}

Return compact JSON only:
{{
  "action": "release" | "refund" | "partial",
  "release_bps": integer from 0 to 10000,
  "reason": "short reason"
}}

Rules:
- release_bps is the worker share in basis points.
- Use 10000 only when all measurable terms pass.
- Use 0 only when delivery is not proven.
- Use partial when substantial work exists but measurable terms failed.
- Do not invent facts missing from the evidence.
"""
            return gl.nondet.exec_prompt(prompt)

        def validator_fn(leader_result) -> bool:
            if isinstance(leader_result, Exception):
                return False
            review_prompt = f"""
Validate this DealGuard escrow verdict.

Agreement:
{self.agreement}

Delivery evidence:
{delivery_evidence}

Proposed verdict:
{leader_result}

Accept only if:
- action is release, refund, or partial
- release_bps is 0..10000
- release_bps matches the action
- the reason follows the measurable terms and evidence

Answer exactly true or false.
"""
            answer = gl.nondet.exec_prompt(review_prompt).strip().lower()
            return answer.startswith("true")

        verdict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        release_bps = self._read_release_bps(verdict)
        release_amount = (self.escrow_amount * u256(release_bps)) // u256(10000)
        refund_amount = self.escrow_amount - release_amount

        self.latest_evidence = delivery_evidence
        self.latest_verdict = verdict
        self.latest_release_bps = u32(release_bps)
        self.resolved = True

        if release_amount > u256(0):
            _Recipient(self.worker).emit_transfer(value=release_amount)
        if refund_amount > u256(0):
            _Recipient(self.client).emit_transfer(value=refund_amount)

    @gl.public.view
    def get_escrow_state(self) -> str:
        return json.dumps({
            "client": str(self.client),
            "worker": str(self.worker),
            "agreement": self.agreement,
            "evidence": self.latest_evidence,
            "verdict": self.latest_verdict,
            "escrow_amount": str(self.escrow_amount),
            "release_bps": int(self.latest_release_bps),
            "funded": self.funded,
            "resolved": self.resolved,
        })

    @gl.public.view
    def get_latest_verdict(self) -> str:
        return self.latest_verdict

    def _read_release_bps(self, verdict: str) -> int:
        data = json.loads(verdict)
        raw_bps = int(data.get("release_bps", 0))
        if raw_bps < 0:
            return 0
        if raw_bps > 10000:
            return 10000
        return raw_bps
