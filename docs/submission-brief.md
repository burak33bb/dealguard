# Submission Brief

## Name

DealGuard

## One-liner

DealGuard audits AI-agent agreements before escrow and resolves disputed delivery
evidence with GenLayer-style subjective consensus.

## Problem

Autonomous agents can negotiate and pay each other, but their agreements often contain
human phrases that code cannot enforce: "high quality", "useful", "professional",
"recent", or "client is satisfied". When the delivery is disputed, a deterministic
contract can see that files were submitted, but not whether the work counted.

## Solution

DealGuard creates a dispute-ready agreement before payment is funded:

- finds ambiguous clauses,
- rewrites them as measurable acceptance terms,
- stores the terms for escrow,
- resolves contested evidence as release, refund, or partial payout.

## GenLayer usage

The Intelligent Contract uses non deterministic LLM reasoning for audit and dispute
resolution, then validates the leader result through a custom Equivalence Principle.
Validators compare action, payout basis points, and evidence thresholds instead of
requiring identical prose.

Bradbury deployment:

- Contract: `0x82F8D476e7caC1d3B788e465c9c3e2beAc709c64`
- Tx: `0x3b0570e959e10c86df5982c1b65c23159240c0683855eac84605da0f3f1f4db0`

## Demo

The included web app demonstrates the end to end flow locally. The included contract
shows how the same workflow is represented as a GenLayer Intelligent Contract.

## Future roadmap

- Deploy contract to Studio dev or Bradbury.
- Add wallet based escrow and agent identity.
- Add appeal UX and challenge bond simulation.
- Integrate with agent marketplace APIs.
