# DealGuard

DealGuard is a GenLayer Agent Tank hackathon project for safer AI agent commerce.
It audits agent to agent agreements before escrow is funded, rewrites vague clauses
into validator ready acceptance terms, and resolves disputes when delivery evidence
does not cleanly match the deal.

## Why this fits Agent Tank

Agent economies do not fail only because agents cannot pay each other. They fail when
two autonomous parties read the same sentence differently: "high quality leads",
"useful research", "professional landing page", or "client satisfaction". DealGuard
turns those subjective clauses into explicit terms, then uses GenLayer style
adjudication when the delivery is contested.

The project is built around the hackathon requirements visible on the official Agent
Tank page:

- Build for the agentic economy.
- Ship during the Sep 3 to 17 build window.
- Focus on an original project, not a generic idea.
- Show how GenLayer adjudicates subjective or non deterministic outcomes.

## Demo flow

1. Open the app and review the sample agreement.
2. Run `Audit deal` to find ambiguous terms before escrow.
3. Inspect the proposed measurable terms.
4. Connect Rabby on GenLayer Bradbury and fund the escrow with GEN.
5. Run `Resolve Onchain` to submit a real GenLayer resolver transaction.
6. Read the proof panel for the live contract address and tx hash.

## Project structure

```text
contracts/deal_guard.py       GenLayer audit/verdict prototype
contracts/deal_guard_escrow.py Payable GEN escrow contract deployed to Bradbury
src/dealguard-core.js         Deterministic demo audit and verdict engine
src/chain-utils.js            GEN formatting, wei conversion, and contract metadata
script.js                     Browser UI controller and consensus canvas
styles.css                    Responsive operational UI
tests/*.test.js               Regression tests for audit, payout, and chain helpers
docs/architecture.md          System design
docs/demo-script.md           Judge-facing walkthrough
docs/submission-brief.md      Hackathon submission copy
```

## Run locally

```bash
npm install
npm run start
```

Then open the local Vite URL.

## Verify

```bash
npm run check
```

## GenLayer contract

The deployed escrow contract in `contracts/deal_guard_escrow.py` uses the GenLayer
Intelligent Contract shape:

- `@gl.public.write.payable` for `open_escrow`, locking real GEN sent by wallet tx.
- `@gl.public.write` for `resolve_dispute`, which writes a consensus verdict.
- Non deterministic LLM work inside `gl.vm.run_nondet_unsafe`.
- A custom validator function for the Equivalence Principle.
- Decision bearing fields that validators compare: `action`, `release_bps`, and
  evidence thresholds.
- GEN value transfers to the worker and client based on the accepted verdict.

The frontend calls the deployed contract through `genlayer-js` and a browser wallet.

## Bradbury deployment

- Network: GenLayer Bradbury Testnet
- Payable escrow contract: `0x200bBf7a3A0ce93E5d6126C7C8dD33f4914D129A`
- Deployment tx: `0xbe4c164c9efd57bef9348918e5e03ec4c9f60da0ba8d676fd32de401`
- Previous verdict only contract: `0x82F8D476e7caC1d3B788e465c9c3e2beAc709c64`
