import { auditDeal, resolveDispute, sampleDeal } from "./src/dealguard-core.js";
import {
  DEALGUARD_DEPLOY_TX,
  DEALGUARD_ESCROW_ADDRESS,
  explorerTxUrl,
  formatGenAmount,
  formatGenFromWei,
  isEvmAddress,
  parseGenToWei
} from "./src/chain-utils.js";
import { BRADBURY_CHAIN, isBradburyChain, shortAddress } from "./src/wallet-config.js";

const brief = document.querySelector("#brief");
const amount = document.querySelector("#amount");
const deadline = document.querySelector("#deadline");
const workerAddress = document.querySelector("#workerAddress");
const evidence = document.querySelector("#evidence");
const verdictTitle = document.querySelector("#verdictTitle");
const riskScore = document.querySelector("#riskScore");
const scanState = document.querySelector("#scanState");
const evidenceState = document.querySelector("#evidenceState");
const stepAudit = document.querySelector("#stepAudit");
const stepTerms = document.querySelector("#stepTerms");
const stepResolve = document.querySelector("#stepResolve");
const lifeDraft = document.querySelector("#lifeDraft");
const lifeAudit = document.querySelector("#lifeAudit");
const lifeFund = document.querySelector("#lifeFund");
const lifeResolve = document.querySelector("#lifeResolve");
const risksPanel = document.querySelector("#risks");
const termsPanel = document.querySelector("#terms");
const consensusPanel = document.querySelector("#consensus");
const metaEscrow = document.querySelector("#metaEscrow");
const lockedHero = document.querySelector("#lockedHero");
const releaseAmount = document.querySelector("#releaseAmount");
const refundAmount = document.querySelector("#refundAmount");
const confidence = document.querySelector("#confidence");
const fundingAdvice = document.querySelector("#fundingAdvice");
const fundingAdviceTitle = document.querySelector("#fundingAdviceTitle");
const fundingAdviceText = document.querySelector("#fundingAdviceText");
const payoutCaption = document.querySelector("#payoutCaption");
const statePill = document.querySelector("#statePill");
const outcomeBanner = document.querySelector("#outcomeBanner");
const escrowNote = document.querySelector("#escrowNote");
const successPanel = document.querySelector("#successPanel");
const successTitle = document.querySelector("#successTitle");
const successExplorer = document.querySelector("#successExplorer");
const releaseBar = document.querySelector("#releaseBar");
const refundBar = document.querySelector("#refundBar");
const reasonChips = document.querySelector("#reasonChips");
const workerShare = document.querySelector("#workerShare");
const clientShare = document.querySelector("#clientShare");
const contractMethod = document.querySelector("#contractMethod");
const contractAddress = document.querySelector("#contractAddress");
const contractTx = document.querySelector("#contractTx");
const explorerLink = document.querySelector("#explorerLink");
const dealId = document.querySelector("#dealId");
const chainFunding = document.querySelector("#chainFunding");
const chainResolver = document.querySelector("#chainResolver");
const chainLastTx = document.querySelector("#chainLastTx");
const fundEscrowButton = document.querySelector("#fundEscrow");
const resolveDealButton = document.querySelector("#resolveDeal");
const connectWallet = document.querySelector("#connectWallet");
const walletAddress = document.querySelector("#walletAddress");
const walletNetwork = document.querySelector("#walletNetwork");
const walletStatus = document.querySelector("#walletStatus");
const canvas = document.querySelector("#consensusCanvas");

let latestAudit = null;
let latestVerdict = null;
let walletManuallyDisconnected = false;
let connectedWalletAddress = "";
let escrowFunded = false;
let currentDealId = "DG-200B-NEW";
let resolveLaunchLock = false;

document.querySelector("#loadSample").addEventListener("click", () => {
  loadSample();
  runAudit();
});

document.querySelector("#runAudit").addEventListener("click", () => runAudit({ animate: true }));
fundEscrowButton.addEventListener("click", fundEscrowOnChain);
resolveDealButton.addEventListener("pointerdown", launchResolveFromPress, { capture: true });
resolveDealButton.addEventListener("click", launchResolveFromPress);
document.addEventListener("pointerdown", (event) => {
  if (event.target.closest?.("#resolveDeal")) {
    launchResolveFromPress(event);
  }
}, { capture: true });
connectWallet.addEventListener("click", connectWalletFlow);

for (const tab of document.querySelectorAll(".tab")) {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
}

function readInput() {
  return {
    brief: brief.value,
    amount: amount.value,
    deadline: deadline.value,
    workerAddress: workerAddress.value,
    evidence: evidence.value
  };
}

function loadSample() {
  brief.value = sampleDeal.brief;
  amount.value = sampleDeal.amount;
  deadline.value = sampleDeal.deadline;
  workerAddress.value = sampleDeal.workerAddress;
  evidence.value = sampleDeal.evidence;
}

async function resolveCurrentDeal() {
  renderOutcome("pending", "Resolve clicked", "Checking wallet and contract");
  escrowNote.textContent = "Resolve button is active. Wallet check is starting.";

  if ((Number(amount.value) || 0) <= 0) {
    renderOutcome("warning", "Add escrow amount", "Refund needs a locked value");
    statePill.textContent = "Missing amount";
    amount.focus();
    return;
  }

  await resolveOnChain();
}

function launchResolveFromPress(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (resolveLaunchLock) return;
  resolveLaunchLock = true;
  setTimeout(() => {
    resolveLaunchLock = false;
  }, 1200);
  renderOutcome("pending", "Resolve pressed", "Starting wallet request");
  escrowNote.textContent = "Resolve button was pressed. Wallet request is starting.";
  resolveCurrentDeal();
}

window.dealGuardResolve = launchResolveFromPress;

function resetWorkspace() {
  brief.value = "";
  amount.value = "";
  deadline.value = "";
  workerAddress.value = "";
  evidence.value = "";
  latestAudit = null;
  latestVerdict = null;
  escrowFunded = false;
  currentDealId = "DG-200B-NEW";
  verdictTitle.textContent = "Ready for deal input";
  riskScore.textContent = "--";
  scanState.textContent = "Ready";
  evidenceState.textContent = "Waiting";
  statePill.textContent = "Draft";
  renderOutcome("pending", "Outcome", "No decision");
  hideSuccess();
  metaEscrow.textContent = "0 GEN";
  lockedHero.textContent = "0 GEN";
  clearPayoutMetrics();
  setFundingAdvice("neutral", "Audit deal first", "Risk decides whether escrow should be funded.");
  reasonChips.innerHTML = "";
  setContractProof("open_escrow", DEALGUARD_DEPLOY_TX);
  setChainState({
    funding: "Not funded",
    resolver: "Idle",
    tx: "Deploy only"
  });
  setLifecycle("draft");
  escrowNote.textContent = "Enter a deal, fund escrow, then resolve onchain.";
  risksPanel.innerHTML = emptyPanel("No audit yet", "Run Audit after entering the agreement.");
  termsPanel.innerHTML = emptyPanel("No terms extracted", "Deal rules appear here after audit.");
  consensusPanel.innerHTML = emptyPanel("No verdict yet", "Resolve after adding delivery evidence.");
  setSteps("audit");
  drawConsensus();
}

async function runAudit({ animate = false } = {}) {
  if (animate) {
    scanState.textContent = "Scanning...";
    verdictTitle.textContent = "Scanning agreement";
    setSteps("audit");
    await new Promise((resolve) => setTimeout(resolve, 520));
  }
  latestAudit = auditDeal(readInput());
  latestVerdict = null;
  verdictTitle.textContent = latestAudit.status;
  riskScore.textContent = latestAudit.riskScore;
  statePill.textContent = latestAudit.riskScore >= 60 ? "Needs rewrite" : "Ready";
  if (latestAudit.riskScore >= 60) {
    renderOutcome("warning", "Rewrite required", `Risk ${latestAudit.riskScore}: do not fund yet`);
    setFundingAdvice("danger", "Do not fund", "Rewrite the vague terms, then audit again.");
    setChainState({
      funding: "Blocked by risk",
      resolver: "Rewrite first",
      tx: "Deploy only"
    });
  } else {
    renderOutcome("pending", "Ready to fund", evidence.value.trim() ? "Evidence ready" : "Awaiting evidence");
    setFundingAdvice("safe", "Ready to fund", "Agreement is clear enough for escrow.");
    setChainState({
      funding: "Ready",
      resolver: "Idle",
      tx: "Deploy only"
    });
  }
  metaEscrow.textContent = formatGenAmount(Number(amount.value) || 0);
  lockedHero.textContent = formatGenAmount(Number(amount.value) || 0);
  clearPayoutMetrics();
  reasonChips.innerHTML = "";
  contractMethod.textContent = "open_escrow";
  setSteps("terms");
  setLifecycle("audit");
  scanState.textContent = `${latestAudit.findings.length} issues found`;
  evidenceState.textContent = "Ready for review";
  escrowNote.textContent = latestAudit.riskScore >= 60
    ? "Rewrite risky terms before funding real escrow."
    : "Terms are clear enough to fund escrow.";
  renderAudit();
  drawConsensus();
}

function renderAudit() {
  const findings = latestAudit.findings.length ? latestAudit.findings : [
    {
      severity: "low",
      title: "No critical ambiguity detected",
      detail: "The agreement has enough structure for escrow funding in this demo."
    }
  ];

  risksPanel.innerHTML = `<div class="finding-list">${findings
    .map((finding) => `
      <article class="finding ${finding.severity}">
        <div class="finding-top">
          <strong>${escapeHtml(finding.title)}</strong>
          <span class="severity ${finding.severity}">${escapeHtml(finding.severity)}</span>
        </div>
        <p>${escapeHtml(finding.detail)}</p>
      </article>
    `)
    .join("")}</div>`;

  termsPanel.innerHTML = `<div class="finding-list">${latestAudit.terms
    .map((term) => `
      <article class="term accepted">
        <strong>${escapeHtml(term.title)}</strong>
        <p>${escapeHtml(term.detail)}</p>
      </article>
    `)
    .join("")}</div>`;

  consensusPanel.innerHTML = `
    <article class="term accepted">
      <strong>Decision fields</strong>
      <p>Action, payout, and evidence threshold must align.</p>
    </article>
    <article class="term">
      <strong>Challenge path</strong>
      <p>Contested results move to a larger review panel.</p>
    </article>`;
}

function renderVerdict() {
  const label = latestVerdict.action === "release"
    ? "Release payment"
    : latestVerdict.action === "partial"
      ? "Partial payout"
      : "Refund client";
  verdictTitle.textContent = label;
  verdictTitle.closest(".decision-band").classList.remove("decision-flash");
  void verdictTitle.closest(".decision-band").offsetWidth;
  verdictTitle.closest(".decision-band").classList.add("decision-flash");
  statePill.textContent = "Resolved";
  renderOutcome(latestVerdict.action, label, latestVerdict.action === "refund"
    ? `${formatGenAmount(latestVerdict.refund)} returned to client`
    : `${formatGenAmount(latestVerdict.release)} to worker`);
  setSteps("resolve");
  contractMethod.textContent = "resolve_dispute";
  metaEscrow.textContent = formatGenAmount(Number(amount.value) || 0);
  lockedHero.textContent = formatGenAmount(Number(amount.value) || 0);
  releaseAmount.textContent = formatGenAmount(latestVerdict.release);
  refundAmount.textContent = formatGenAmount(latestVerdict.refund);
  confidence.textContent = `${latestVerdict.confidence}%`;
  payoutCaption.textContent = "Final payout from onchain verdict.";
  renderSplit();
  renderReasonChips();
  escrowNote.textContent = latestVerdict.action === "partial"
    ? "Funds split because delivery passed with defects."
    : latestVerdict.action === "release"
      ? "Funds release to the worker."
      : "Funds return to the client.";
  consensusPanel.innerHTML = `<div class="finding-list">${latestVerdict.reasons
    .map((reason) => `
      <article class="term accepted">
        <strong>Check</strong>
        <p>${escapeHtml(reason)}</p>
      </article>
    `)
    .join("")}</div>`;
  activateTab("consensus");
  drawConsensus();
}

async function fundEscrowOnChain() {
  if (!latestAudit) await runAudit();

  const validationError = validateFundingInput();
  if (validationError) {
    renderOutcome("warning", "Cannot fund escrow", validationError);
    escrowNote.textContent = validationError;
    return;
  }

  const provider = await requireConnectedBradburyWallet();
  if (!provider) return;

  try {
    statePill.textContent = "Funding";
    renderOutcome("pending", "Prepare escrow", "Estimating GenLayer fees");
    escrowNote.textContent = "Rabby will ask you to approve the real GenLayer transaction.";

    const { readClient, writeClient, TransactionStatus } = await createGenLayerClients(provider);
    const write = {
      address: DEALGUARD_ESCROW_ADDRESS,
      functionName: "open_escrow",
      args: [workerAddress.value.trim(), brief.value.trim()],
      value: parseGenToWei(amount.value)
    };
    const estimate = await estimateWriteFees(writeClient, write);

    renderOutcome("pending", "Wallet confirmation", `${formatGenAmount(amount.value)} will be locked`);
    const txHash = await writeClient.writeContract(addFees(write, estimate));
    currentDealId = makeDealId(txHash);
    setContractProof("open_escrow", txHash);
    renderOutcome("pending", "Submitted", shortHash(txHash));
    setChainState({
      funding: "Submitted",
      resolver: "Waiting",
      tx: shortHash(txHash)
    });

    await readClient.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.ACCEPTED
    });

    escrowFunded = true;
    statePill.textContent = "Funded";
    metaEscrow.textContent = formatGenAmount(Number(amount.value) || 0);
    lockedHero.textContent = formatGenAmount(Number(amount.value) || 0);
    clearPayoutMetrics();
    renderOutcome("partial", "Escrow funded", `${formatGenAmount(amount.value)} locked on Bradbury`);
    setFundingAdvice("safe", "Escrow funded", "Now wait for delivery evidence before payout.");
    showSuccess("Escrow funded on Bradbury", txHash);
    setChainState({
      funding: "Funded",
      resolver: "Ready",
      tx: shortHash(txHash)
    });
    setLifecycle("fund");
    escrowNote.textContent = "Escrow is funded. Add evidence, then resolve it onchain.";
  } catch (error) {
    statePill.textContent = escrowFunded ? "Funded" : "Draft";
    renderOutcome("warning", "Funding failed", chainErrorMessage(error));
    escrowNote.textContent = "No escrow state was changed unless your wallet produced a transaction hash.";
  }
}

async function resolveOnChain() {
  setButtonBusy(resolveDealButton, "Checking...");
  const validationError = validateResolveInput();
  if (validationError) {
    renderOutcome("warning", "Evidence needed", validationError);
    escrowNote.textContent = validationError;
    setButtonReady(resolveDealButton, "Resolve Onchain");
    return;
  }

  const previewVerdict = resolveDispute({
    amount: amount.value,
    evidence: evidence.value
  });
  const previewLabel = previewVerdict.action === "refund"
    ? "Refund candidate"
    : previewVerdict.action === "partial"
      ? "Partial candidate"
      : "Release candidate";
  const previewAmount = previewVerdict.action === "refund"
    ? `${formatGenAmount(previewVerdict.refund)} can return to client`
    : `${formatGenAmount(previewVerdict.release)} can release to worker`;
  renderOutcome("pending", previewLabel, "Wallet will write this verdict");
  escrowNote.textContent = `Bad evidence is allowed here. DealGuard will ask GenLayer to write: ${previewAmount}.`;

  const provider = await requireConnectedBradburyWallet();
  if (!provider) {
    setButtonReady(resolveDealButton, "Resolve Onchain");
    return;
  }

  if (!latestAudit) await runAudit();

  try {
    setButtonBusy(resolveDealButton, "Open Rabby");
    statePill.textContent = "Resolving";
    renderOutcome("pending", "Wallet confirmation", "Approve the resolver call in Rabby");
    escrowNote.textContent = "Rabby should open now. After you sign, GenLayer will write the verdict.";

    const { readClient, writeClient, TransactionStatus } = await createGenLayerClients(provider);
    const write = {
      address: DEALGUARD_ESCROW_ADDRESS,
      functionName: "resolve_dispute",
      args: [evidence.value.trim()]
    };

    const txHash = await writeClient.writeContract(write);
    setButtonBusy(resolveDealButton, "Waiting");
    setContractProof("resolve_dispute", txHash);
    renderOutcome("pending", "Submitted", shortHash(txHash));
    setChainState({
      funding: "Funded",
      resolver: "Submitted",
      tx: shortHash(txHash)
    });

    const accepted = await waitForAcceptedOrPending(readClient, txHash, TransactionStatus);
    if (!accepted) {
      statePill.textContent = "Waiting";
      renderOutcome("pending", "Waiting consensus", "Payout stays pending until accepted");
      escrowNote.textContent = "Resolve tx was submitted. Pending clears after GenLayer accepts the verdict.";
      setChainState({
        funding: "Funded",
        resolver: "Waiting consensus",
        tx: shortHash(txHash)
      });
      setButtonReady(resolveDealButton, "Resolve Onchain");
      return;
    }

    const state = await readEscrowState(readClient);
    latestVerdict = verdictFromChainState(state);
    escrowFunded = false;
    renderVerdict();
    setContractProof("resolve_dispute", txHash);
    showSuccess("Verdict accepted on Bradbury", txHash);
    setChainStateFromContract(state, txHash);
    setLifecycle("resolve");
    escrowNote.textContent = "Onchain verdict accepted on GenLayer Bradbury.";
  } catch (error) {
    statePill.textContent = escrowFunded ? "Funded" : "Draft";
    renderOutcome("warning", "Resolve failed", chainErrorMessage(error));
    escrowNote.textContent = "If no tx hash appeared, the contract was not called.";
  } finally {
    setButtonReady(resolveDealButton, "Resolve Onchain");
  }
}

function renderOutcome(mode, title, detail) {
  outcomeBanner.className = `outcome-banner ${mode}`;
  outcomeBanner.innerHTML = `
    <span>${escapeHtml(title)}</span>
    <strong>${escapeHtml(detail)}</strong>
  `;
}

function clearPayoutMetrics() {
  releaseAmount.textContent = "Pending";
  refundAmount.textContent = "Pending";
  confidence.textContent = "Awaiting verdict";
  payoutCaption.textContent = "Payout appears after Resolve Onchain.";
  releaseBar.style.width = "0%";
  refundBar.style.width = "0%";
  workerShare.textContent = "Worker pending";
  clientShare.textContent = "Client pending";
}

async function waitForAcceptedOrPending(readClient, txHash, TransactionStatus) {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve("pending"), 25000);
  });
  const receipt = readClient.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED
  });
  return (await Promise.race([receipt, timeout])) !== "pending";
}

function setFundingAdvice(mode, title, text) {
  fundingAdvice.className = `funding-advice ${mode}`;
  fundingAdviceTitle.textContent = title;
  fundingAdviceText.textContent = text;
  fundEscrowButton.dataset.risk = mode === "danger" ? "blocked" : "ready";
  fundEscrowButton.textContent = mode === "danger" ? "Rewrite First" : "Fund Escrow";
}

function showSuccess(title, txHash) {
  successTitle.textContent = title;
  successExplorer.href = explorerTxUrl(txHash);
  successExplorer.textContent = `Open explorer ${shortHash(txHash)}`;
  successPanel.classList.remove("hidden");
}

function hideSuccess() {
  successPanel.classList.add("hidden");
  successTitle.textContent = "Transaction accepted";
  successExplorer.href = explorerTxUrl(DEALGUARD_DEPLOY_TX);
  successExplorer.textContent = "Open explorer";
}

function setLifecycle(active) {
  const order = ["draft", "audit", "fund", "resolve"];
  const items = {
    draft: lifeDraft,
    audit: lifeAudit,
    fund: lifeFund,
    resolve: lifeResolve
  };
  const activeIndex = order.indexOf(active);

  for (const [index, name] of order.entries()) {
    items[name].classList.toggle("active", index === activeIndex);
    items[name].classList.toggle("done", activeIndex > index);
  }
}

function setChainState({ funding, resolver, tx }) {
  chainFunding.textContent = funding;
  chainResolver.textContent = resolver;
  chainLastTx.textContent = tx;
  dealId.textContent = currentDealId;
}

function setChainStateFromContract(state, txHash) {
  const funded = state?.resolved ? "Settled" : state?.funded ? "Funded" : "Not funded";
  const resolved = state?.resolved ? "Resolved" : "Pending";
  setChainState({
    funding: funded,
    resolver: resolved,
    tx: shortHash(txHash)
  });
}

function setSteps(active) {
  const order = { audit: 0, terms: 1, resolve: 2 };
  const activeIndex = order[active] ?? 0;
  [stepAudit, stepTerms, stepResolve].forEach((step, index) => {
    step.classList.toggle("active", index === activeIndex);
    step.classList.toggle("done", index < activeIndex);
  });
}

function renderSplit() {
  const locked = Number(amount.value) || 0;
  const releasePercent = locked > 0 ? Math.round((latestVerdict.release / locked) * 100) : 0;
  releaseBar.style.width = `${releasePercent}%`;
  refundBar.style.width = `${Math.max(0, 100 - releasePercent)}%`;
  workerShare.textContent = `Worker ${releasePercent}%`;
  clientShare.textContent = `Client ${Math.max(0, 100 - releasePercent)}%`;
}

function renderReasonChips() {
  const text = evidence.value.toLowerCase();
  const duplicateMatch = text.match(/\b(\d+)\b[^.]{0,32}duplicate/);
  const bounceMatch = text.match(/\b(\d+)\b[^.]{0,32}bounced/);
  const sourcesMissing = text.includes("no source") || text.includes("without source");
  const chips = [
    duplicateMatch ? `${duplicateMatch[1]} duplicates` : "duplicates checked",
    bounceMatch ? `${bounceMatch[1]} bounced` : "email checked",
    !sourcesMissing && (text.includes("source") || text.includes("url") || text.includes("linkedin")) ? "sources present" : "sources missing"
  ];
  reasonChips.innerHTML = chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("");
}

function validateFundingInput() {
  if (!brief.value.trim()) return "Add deal terms first.";
  if ((Number(amount.value) || 0) <= 0) return "Enter a GEN amount to lock.";
  if (!isEvmAddress(workerAddress.value)) return "Enter a valid worker wallet address.";
  if (latestAudit?.riskScore >= 60) return `Risk ${latestAudit.riskScore}: rewrite the agreement before funding.`;
  return "";
}

function validateResolveInput() {
  if (!evidence.value.trim()) return "Add delivery evidence first. Weak or failed delivery evidence is allowed for refund.";
  if ((Number(amount.value) || 0) <= 0) return "Enter the funded GEN amount.";
  return "";
}

async function requireConnectedBradburyWallet() {
  const provider = getWalletProvider();
  if (!provider?.request) {
    renderOutcome("warning", "Wallet missing", "Open this app in Rabby/browser wallet.");
    escrowNote.textContent = "A browser wallet is required for real GenLayer transactions.";
    return null;
  }

  try {
    if (!connectedWalletAddress) {
      walletManuallyDisconnected = false;
      await provider.request({ method: "eth_requestAccounts" });
    }
    await ensureBradbury(provider);
    await syncWallet(provider);
    if (!connectedWalletAddress) {
      renderOutcome("warning", "Wallet not connected", "Connect Rabby first");
      return null;
    }
    return provider;
  } catch (error) {
    renderOutcome("warning", "Wallet blocked", walletErrorMessage(error));
    escrowNote.textContent = "The contract was not called.";
    return null;
  }
}

async function createGenLayerClients(provider) {
  const [{ createClient }, { testnetBradbury }, { TransactionStatus }] = await Promise.all([
    import("genlayer-js"),
    import("genlayer-js/chains"),
    import("genlayer-js/types")
  ]);

  return {
    TransactionStatus,
    readClient: createClient({ chain: testnetBradbury }),
    writeClient: createClient({
      chain: testnetBradbury,
      account: connectedWalletAddress,
      provider
    })
  };
}

async function estimateWriteFees(writeClient, write) {
  if (typeof writeClient.estimateTransactionFeesForWrite !== "function") return null;
  return writeClient.estimateTransactionFeesForWrite(write);
}

function addFees(write, estimate) {
  if (!estimate?.distribution || !estimate?.feeValue) return write;
  return {
    ...write,
    fees: {
      distribution: estimate.distribution,
      feeValue: estimate.feeValue
    }
  };
}

async function readEscrowState(readClient) {
  const stateJson = await readClient.readContract({
    address: DEALGUARD_ESCROW_ADDRESS,
    functionName: "get_escrow_state",
    args: []
  });
  return JSON.parse(String(stateJson || "{}"));
}

function verdictFromChainState(state) {
  const lockedWei = state.escrow_amount ?? 0;
  const releaseBps = Number(state.release_bps || 0);
  const lockedGen = Number(formatGenFromWei(lockedWei).replace(" GEN", "")) || (Number(amount.value) || 0);
  const release = roundUiAmount(lockedGen * releaseBps / 10000);
  const refund = roundUiAmount(Math.max(0, lockedGen - release));
  const action = releaseBps >= 9500 ? "release" : releaseBps <= 500 ? "refund" : "partial";
  const verdict = safeJsonParse(state.latest_verdict);
  const reason = verdict?.reason || "Consensus verdict written by DealGuard escrow contract.";

  return {
    action,
    release,
    refund,
    confidence: 100,
    reasons: [reason]
  };
}

function setContractProof(method, txHash = DEALGUARD_DEPLOY_TX) {
  contractMethod.textContent = method;
  contractAddress.textContent = shortAddress(DEALGUARD_ESCROW_ADDRESS);
  contractAddress.title = DEALGUARD_ESCROW_ADDRESS;
  contractTx.textContent = txHash === DEALGUARD_DEPLOY_TX ? `deploy ${shortHash(txHash)}` : shortHash(txHash);
  contractTx.title = txHash;
  explorerLink.href = explorerTxUrl(txHash);
  explorerLink.textContent = txHash === DEALGUARD_DEPLOY_TX ? "View deploy tx on explorer" : `View ${method} tx on explorer`;
  if (txHash && txHash !== DEALGUARD_DEPLOY_TX) {
    contractTx.innerHTML = `<a href="${escapeHtml(explorerTxUrl(txHash))}" target="_blank" rel="noreferrer">${escapeHtml(shortHash(txHash))}</a>`;
  }
}

function shortHash(hash) {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function makeDealId(txHash) {
  return `DG-${txHash.slice(2, 8).toUpperCase()}`;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(String(value || "{}"));
  } catch {
    return null;
  }
}

function roundUiAmount(value) {
  return Number(value.toFixed(6));
}

function chainErrorMessage(error) {
  if (error?.code === 4001) return "Wallet request rejected.";
  if (String(error?.message || "").includes("wallet_getSnaps")) {
    return "Rabby does not support MetaMask Snap methods. Network switch now uses Rabby's normal EVM flow.";
  }
  return error?.shortMessage || error?.message || "GenLayer transaction failed.";
}

function setButtonBusy(button, label) {
  button.setAttribute("aria-busy", "true");
  button.dataset.originalLabel ||= button.textContent;
  button.textContent = label;
}

function setButtonReady(button, label) {
  button.removeAttribute("aria-busy");
  button.textContent = label || button.dataset.originalLabel || button.textContent;
}

function activateTab(name) {
  for (const tab of document.querySelectorAll(".tab")) {
    tab.classList.toggle("active", tab.dataset.tab === name);
  }
  for (const panel of document.querySelectorAll(".tab-panel")) {
    panel.classList.toggle("active", panel.id === name);
  }
}

function getWalletProvider() {
  return window.ethereum || window.rabbyWallet || null;
}

async function initWallet() {
  const provider = getWalletProvider();
  if (!provider?.request) {
    setWalletUi({
      address: "No wallet",
      network: "Offline",
      status: "Install/open Rabby to connect.",
      mode: "missing"
    });
    return;
  }

  provider.on?.("accountsChanged", () => syncWallet(provider));
  provider.on?.("chainChanged", () => syncWallet(provider));
  await syncWallet(provider);
}

async function connectWalletFlow() {
  const provider = getWalletProvider();
  if (!provider?.request) {
    setWalletUi({
      address: "No wallet",
      network: "Offline",
      status: "Wallet not detected in this browser.",
      mode: "missing"
    });
    return;
  }

  if (connectWallet.dataset.connected === "true") {
    await disconnectWalletFlow(provider);
    return;
  }

  try {
    connectWallet.disabled = true;
    walletManuallyDisconnected = false;
    setWalletUi({
      address: "Requesting...",
      network: "Checking",
      status: "Approve the wallet request.",
      mode: "pending"
    });
    await provider.request({ method: "eth_requestAccounts" });
    await ensureBradbury(provider);
    await syncWallet(provider);
  } catch (error) {
    setWalletUi({
      address: "Not connected",
      network: "Check wallet",
      status: walletErrorMessage(error),
      mode: "error"
    });
  } finally {
    connectWallet.disabled = false;
  }
}

async function disconnectWalletFlow(provider) {
  connectWallet.disabled = true;
  try {
    walletManuallyDisconnected = true;
    await provider.request?.({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }]
    });
  } catch {
    // Some wallets do not expose revoke permissions; local disconnect still keeps this app clean.
  } finally {
    connectedWalletAddress = "";
    setWalletUi({
      address: "Not connected",
      network: "Bradbury",
      status: "Disconnected. Reconnect to choose another wallet.",
      mode: "ready"
    });
    connectWallet.disabled = false;
  }
}

async function syncWallet(provider) {
  try {
    const [accounts, chainId] = await Promise.all([
      provider.request({ method: "eth_accounts" }),
      provider.request({ method: "eth_chainId" })
    ]);
    const address = accounts?.[0];
    const onBradbury = isBradburyChain(chainId);

    if (walletManuallyDisconnected && address) {
      connectedWalletAddress = "";
      setWalletUi({
        address: "Not connected",
        network: onBradbury ? "Bradbury" : "Wrong network",
        status: "Disconnected. Reconnect to choose another wallet.",
        mode: onBradbury ? "ready" : "warning"
      });
      return;
    }

    connectedWalletAddress = address || "";
    setWalletUi({
      address: address ? shortAddress(address) : "Not connected",
      network: onBradbury ? "Bradbury" : "Wrong network",
      status: address
        ? onBradbury
          ? "Wallet connected."
          : "Switch to Bradbury before demo."
        : "Connect Rabby to sign demo actions.",
      mode: address ? (onBradbury ? "connected" : "warning") : "ready"
    });
  } catch (error) {
    connectedWalletAddress = "";
    setWalletUi({
      address: "Wallet error",
      network: "Unknown",
      status: walletErrorMessage(error),
      mode: "error"
    });
  }
}

async function ensureBradbury(provider) {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (isBradburyChain(chainId)) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BRADBURY_CHAIN.chainId }]
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [BRADBURY_CHAIN]
    });
  }
}

function setWalletUi({ address, network, status, mode }) {
  walletAddress.textContent = address;
  walletNetwork.textContent = network;
  walletStatus.textContent = status;
  walletStatus.dataset.mode = mode;
  walletNetwork.dataset.mode = mode;
  connectWallet.dataset.connected = mode === "connected" || mode === "warning" ? "true" : "false";
  connectWallet.textContent = connectWallet.dataset.connected === "true" ? "Disconnect" : "Connect Wallet";
}

function walletErrorMessage(error) {
  if (error?.code === 4001) return "Wallet request rejected.";
  return error?.message || "Wallet connection failed.";
}

function drawConsensus() {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#090806");
  gradient.addColorStop(0.48, "#21150c");
  gradient.addColorStop(1, "#063f39");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const stages = [
    { x: 52, title: "Brief", meta: "raw deal", tone: "#211915" },
    { x: 300, title: "Terms", meta: "clear rules", tone: "#211915" },
    { x: 548, title: "Proof", meta: "delivery data", tone: "#211915" },
    { x: 796, title: latestVerdict ? latestVerdict.action.toUpperCase() : "CHECK", meta: latestVerdict ? "verdict" : "pending", tone: latestVerdict ? "#ff9f1c" : "#24d2ba" }
  ];

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 189, 102, 0.34)";
  ctx.beginPath();
  ctx.moveTo(178, 116);
  ctx.lineTo(922, 116);
  ctx.stroke();

  for (const [index, stage] of stages.entries()) {
    const isFinal = index === stages.length - 1;
    const w = isFinal ? 210 : 178;
    const h = 62;
    const y = 85;
    ctx.fillStyle = stage.tone;
    ctx.strokeStyle = isFinal ? "#ffbd66" : "rgba(255,189,102,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(stage.x, y, w, h, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isFinal ? "#06100e" : "#f5efe6";
    ctx.font = "800 22px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(stage.title, stage.x + 22, y + 27);
    ctx.fillStyle = isFinal ? "rgba(6,16,14,0.7)" : "rgba(245,239,230,0.54)";
    ctx.font = "800 11px Inter, sans-serif";
    ctx.fillText(stage.meta.toUpperCase(), stage.x + 22, y + 46);
  }

  ctx.fillStyle = "rgba(245,239,230,0.76)";
  ctx.font = "800 16px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Review pipeline", 34, 36);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emptyPanel(title, detail) {
  return `
    <article class="term">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
    </article>`;
}

resetWorkspace();
initWallet();
