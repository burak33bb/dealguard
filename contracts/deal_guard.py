# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class DealGuard(gl.Contract):
    latest_agreement: str
    latest_terms: str
    latest_evidence: str
    latest_verdict: str
    latest_release_bps: u32

    def __init__(self):
        self.latest_agreement = ""
        self.latest_terms = ""
        self.latest_evidence = ""
        self.latest_verdict = "draft"
        self.latest_release_bps = u32(0)

    @gl.public.write
    def audit_agreement(self, agreement: str) -> None:
        def leader_fn() -> str:
            prompt = f"""
You are DealGuard, an agreement auditor for autonomous AI-agent commerce.
Read the agreement and return compact JSON with:
- risks: array of unclear or disputed clauses
- rewritten_terms: array of measurable acceptance terms
- escrow_policy: release/refund/partial rules

Agreement:
{agreement}

Rules:
- Prefer objective thresholds over buyer satisfaction.
- Every rewritten term must be usable by independent validators.
- Do not invent facts that are not in the agreement.
"""
            return gl.nondet.exec_prompt(prompt)

        def validator_fn(leader_result) -> bool:
            if isinstance(leader_result, Exception):
                return False
            review_prompt = f"""
Validate this DealGuard audit against the original agreement.

Original agreement:
{agreement}

Proposed audit:
{leader_result}

Accept only if the audit identifies ambiguous clauses, proposes measurable terms,
and preserves the economic intent of the agreement. Answer exactly true or false.
"""
            answer = gl.nondet.exec_prompt(review_prompt).strip().lower()
            return answer.startswith("true")

        self.latest_agreement = agreement
        self.latest_terms = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        self.latest_verdict = "audited"

    @gl.public.write
    def resolve_dispute(self, agreement_terms: str, delivery_evidence: str) -> None:
        def leader_fn() -> str:
            prompt = f"""
You are resolving an AI-agent work dispute.

Agreement terms:
{agreement_terms}

Delivery evidence:
{delivery_evidence}

Return compact JSON only:
{{
  "action": "release" | "refund" | "partial",
  "release_bps": integer from 0 to 10000,
  "reason": "short reason"
}}

Use partial when substantial work was delivered but one or more measurable terms failed.
"""
            return gl.nondet.exec_prompt(prompt)

        def validator_fn(leader_result) -> bool:
            if isinstance(leader_result, Exception):
                return False
            review_prompt = f"""
Compare the proposed verdict with the agreement and evidence.

Agreement terms:
{agreement_terms}

Delivery evidence:
{delivery_evidence}

Proposed verdict:
{leader_result}

Equivalence principle:
- The action must be one of release, refund, or partial.
- release_bps must match the action: release near 10000, refund near 0, partial between them.
- The reason can use different words, but it must rely on the same evidence thresholds.

Answer exactly true or false.
"""
            answer = gl.nondet.exec_prompt(review_prompt).strip().lower()
            return answer.startswith("true")

        verdict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        self.latest_evidence = delivery_evidence
        self.latest_verdict = verdict
        # Frontends should parse latest_verdict JSON for exact payout. This field is a simple demo state marker.
        self.latest_release_bps = u32(1)

    @gl.public.view
    def get_latest_terms(self) -> str:
        return self.latest_terms

    @gl.public.view
    def get_latest_verdict(self) -> str:
        return self.latest_verdict
