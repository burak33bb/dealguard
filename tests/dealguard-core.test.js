import test from "node:test";
import assert from "node:assert/strict";
import { auditDeal, resolveDispute, sampleDeal } from "../src/dealguard-core.js";

test("audit flags subjective deal language before escrow", () => {
  const result = auditDeal(sampleDeal);

  assert.equal(result.status, "Needs rewrite");
  assert.ok(result.riskScore >= 60);
  assert.ok(result.findings.some((finding) => finding.title.includes("high quality")));
  assert.ok(result.findings.some((finding) => finding.title.includes("satisfied")));
});

test("resolution can produce partial payout from mixed evidence", () => {
  const verdict = resolveDispute(sampleDeal);

  assert.equal(verdict.action, "partial");
  assert.equal(verdict.release, 0.9);
  assert.equal(verdict.refund, 0.3);
  assert.ok(verdict.confidence >= 80);
});

test("weak evidence refunds the client", () => {
  const verdict = resolveDispute({
    amount: 1000,
    evidence: "Worker says the job is probably done but has no source URLs or validation report."
  });

  assert.equal(verdict.action, "refund");
  assert.equal(verdict.release, 0);
  assert.equal(verdict.refund, 1000);
});

test("clean delivery releases full payment", () => {
  const verdict = resolveDispute({
    amount: 1.2,
    evidence:
      "ResearchBot delivered 20 rows. All 20 rows include company names, roles, LinkedIn URLs, source URLs, and validated emails. No duplicate records were found."
  });

  assert.equal(verdict.action, "release");
  assert.equal(verdict.release, 1.2);
  assert.equal(verdict.refund, 0);
});
