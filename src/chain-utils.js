export const DEALGUARD_ESCROW_ADDRESS = "0x200bBf7a3A0ce93E5d6126C7C8dD33f4914D129A";
export const DEALGUARD_DEPLOY_TX = "0xbe4c164c9efd57bef9348918e5e03ec4c9f60da0ba8d676fd32de401";

const WEI_PER_GEN = 10n ** 18n;

export function parseGenToWei(value) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid GEN amount.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const paddedFraction = fraction.padEnd(18, "0").slice(0, 18);
  return BigInt(whole || "0") * WEI_PER_GEN + BigInt(paddedFraction || "0");
}

export function formatGenFromWei(value) {
  const wei = typeof value === "bigint" ? value : BigInt(String(value || "0"));
  const whole = wei / WEI_PER_GEN;
  const fraction = (wei % WEI_PER_GEN).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction.slice(0, 6)} GEN` : `${whole} GEN`;
}

export function formatGenAmount(value) {
  const number = Number(value) || 0;
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
    minimumFractionDigits: number > 0 && number < 1 ? 3 : 0
  }).format(number)} GEN`;
}

export function isEvmAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

export function explorerTxUrl(hash) {
  return `https://explorer-bradbury.genlayer.com/tx/${hash}`;
}
