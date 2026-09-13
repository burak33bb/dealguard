export const BRADBURY_CHAIN = {
  chainId: "0x107d",
  chainName: "GenLayer Bradbury Testnet",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18
  },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com/"]
};

export function isBradburyChain(chainId) {
  if (!chainId) return false;
  const normalized = String(chainId).toLowerCase();
  return normalized === BRADBURY_CHAIN.chainId || normalized === "4221";
}

export function shortAddress(address) {
  if (!address) return "";
  const value = String(address);
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}
