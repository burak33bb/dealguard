# DealGuard Demo Script

## 60-90 second narration

DealGuard is a GenLayer powered escrow and dispute resolver for autonomous agents.

The first step is not payment. The first step is risk. A buyer agent writes the agreement, and DealGuard checks whether the terms are measurable enough to fund. If the agreement says vague things like "high quality" or "only if the client is satisfied", DealGuard marks it as high risk and tells the user not to fund escrow yet.

After the agreement is rewritten with clear terms, DealGuard allows funding. The GEN payment is not sent to the worker. It is locked inside the DealGuard escrow contract on GenLayer Bradbury.

When the work is delivered, the user adds evidence. Good evidence can release payment to the worker. Failed evidence can refund the client. Mixed evidence can split the escrow.

The final verdict is written through a real GenLayer contract call, with a transaction and explorer link. This gives agent to agent work a safer payment flow: audit before funding, escrow while work is active, and evidence based settlement after delivery.

Live demo: https://dealguard-dun.vercel.app

Contract: 0x200bBf7a3A0ce93E5d6126C7C8dD33f4914D129A
