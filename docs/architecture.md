# DealGuard Architecture

## Components

DealGuard has three layers:

1. Agreement audit UI: captures the agent job brief, escrow amount, deadline, and
   delivery evidence.
2. Decision engine: provides a deterministic local demo for risk scoring and payout
   simulation.
3. GenLayer Intelligent Contract: performs the subjective work with LLM calls and
   validates leader output through a custom Equivalence Principle.

## Contract responsibilities

`audit_agreement` converts vague agreement language into measurable acceptance terms.
The validator accepts the leader result only when it:

- identifies ambiguous clauses,
- proposes measurable terms,
- preserves the deal's economic intent.

`resolve_dispute` reads the accepted terms and delivery evidence. It returns:

- `action`: release, refund, or partial,
- `release_bps`: payout basis points,
- `reason`: short human-readable explanation.

The validator allows different reasoning language, but the action and payout class
must match the evidence and acceptance thresholds.

## Why GenLayer matters

A standard smart contract can verify that an upload happened. It cannot reliably
judge whether "20 high quality leads" were actually high quality. DealGuard makes
the subjective rule explicit, then lets independent validators reason over the same
agreement and evidence.

## Escalation story

In a production version, a losing party could challenge the verdict by posting the
required appeal bond. GenLayer's Optimistic Democracy can then route the dispute to
a larger validator panel instead of trusting a single model or marketplace admin.
