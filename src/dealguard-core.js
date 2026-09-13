export const sampleDeal = {
  brief:
    "Client hires ResearchBot for 20 high quality B2B leads in Turkish fintech by Friday. Leads must be useful, recent, and relevant. Payment releases if the client is satisfied.",
  amount: 1.2,
  deadline: "2026-09-17",
  workerAddress: "0x3db9b6ce30dadb1458a5947954960df866f84ef9",
  evidence:
    "ResearchBot delivered 20 rows. 18 have company names, roles, LinkedIn URLs, and source URLs. 2 rows are duplicates. 3 emails bounced in validation. Sources were updated between Aug 20 and Sep 10, 2026."
};

const ambiguousTerms = [
  { term: "high quality", fix: "Set validity, seniority, freshness, and duplicate thresholds." },
  { term: "useful", fix: "Replace with a measurable acceptance rule." },
  { term: "recent", fix: "Set a maximum source age." },
  { term: "relevant", fix: "Specify industry, geography, size, and role." },
  { term: "satisfied", fix: "Remove buyer discretion from payout." },
  { term: "professional", fix: "Define brand, accessibility, and layout checks." },
  { term: "best", fix: "Define ranking inputs and tie-breakers." }
];

export function auditDeal({ brief, amount, deadline }) {
  const text = (brief || "").toLowerCase();
  const findings = [];

  for (const item of ambiguousTerms) {
    if (text.includes(item.term)) {
      findings.push({
        severity: item.term === "satisfied" ? "high" : "medium",
        title: `Ambiguous term: "${item.term}"`,
        detail: item.fix
      });
    }
  }

  if (!/\b\d+\b/.test(text)) {
    findings.push({
      severity: "high",
      title: "No measurable quantity",
      detail: "Add a count, threshold, or score."
    });
  }

  if (!deadline) {
    findings.push({
      severity: "medium",
      title: "No deadline",
      detail: "Add a deadline and grace policy."
    });
  }

  if (Number(amount) <= 0) {
    findings.push({
      severity: "high",
      title: "No escrow amount",
      detail: "Set a funded amount."
    });
  }

  const terms = buildTerms(text);
  const riskScore = Math.min(96, findings.reduce((score, finding) => {
    if (finding.severity === "high") return score + 24;
    if (finding.severity === "medium") return score + 15;
    return score + 8;
  }, 12));

  return {
    riskScore,
    findings,
    terms,
    status: riskScore >= 60 ? "Needs rewrite" : riskScore >= 35 ? "Review required" : "Ready for escrow"
  };
}

export function resolveDispute({ amount, evidence }) {
  const value = Number(amount) || 0;
  const text = (evidence || "").toLowerCase();
  const duplicateCount = readNumberBefore(text, "duplicate");
  const bouncedCount = readNumberBefore(text, "bounced");
  const deliveredCount = readFirstNumber(text);
  const duplicatesPassed = (duplicateCount > 0 && duplicateCount <= 2) || hasNoDefect(text, "duplicate");
  const emailFailuresPassed = (bouncedCount > 0 && bouncedCount <= 3) || hasNoDefect(text, "bounced") || text.includes("validated emails");
  const hasMeasuredDefects = duplicateCount > 0 || bouncedCount > 0;
  let passed = 0;
  let total = 4;
  const reasons = [];

  if (deliveredCount >= 20) {
    passed += 1;
    reasons.push("Quantity passed.");
  } else {
    reasons.push("Quantity not proven.");
  }

  if (duplicatesPassed) {
    passed += 1;
    reasons.push("Duplicates within threshold.");
  } else {
    reasons.push("Duplicates exceed threshold.");
  }

  if (emailFailuresPassed) {
    passed += 1;
    reasons.push("Email failures within threshold.");
  } else {
    reasons.push("Email failures exceed threshold.");
  }

  const hasSourceEvidence = (text.includes("source") || text.includes("url") || text.includes("linkedin"))
    && !text.includes("no source")
    && !text.includes("without source");
  if (hasSourceEvidence) {
    passed += 1;
    reasons.push("Sources present.");
  } else {
    reasons.push("Sources missing.");
  }

  const ratio = passed / total;
  const payoutRatio = hasMeasuredDefects ? Math.min(ratio, 0.75) : ratio;
  const action = ratio >= 0.9 && !hasMeasuredDefects ? "release" : ratio >= 0.5 ? "partial" : "refund";
  const release = action === "release" ? roundTokenAmount(value) : action === "partial" ? roundTokenAmount(value * payoutRatio) : 0;
  const refund = roundTokenAmount(Math.max(0, value - release));

  return {
    action,
    release,
    refund,
    confidence: Math.round((0.58 + ratio * 0.35) * 100),
    reasons
  };
}

function buildTerms(text) {
  const base = [
    {
      title: "Deliverable count",
      detail: text.includes("20") ? "20 lead records." : "Add an exact count."
    },
    {
      title: "Quality threshold",
      detail: "85% must include company, role, contact path, and source."
    },
    {
      title: "Duplicate limit",
      detail: "Duplicates capped at 10%."
    },
    {
      title: "Payout rule",
      detail: "Full release on pass; partial for minor defects."
    }
  ];
  return base;
}

function readFirstNumber(text) {
  const match = text.match(/\b(\d+)\b/);
  return match ? Number(match[1]) : 0;
}

function readNumberBefore(text, word) {
  const match = text.match(new RegExp("\\b(\\d+)\\b[^.]{0,32}" + word));
  return match ? Number(match[1]) : 0;
}

function hasNoDefect(text, word) {
  return new RegExp(`\\b(no|zero|0)\\b[^.]{0,32}${word}`).test(text);
}

function roundTokenAmount(value) {
  return Number(value.toFixed(6));
}
