import test from "node:test";
import assert from "node:assert/strict";
import { BRADBURY_CHAIN, isBradburyChain, shortAddress } from "../src/wallet-config.js";

test("Bradbury wallet config matches GenLayer testnet", () => {
  assert.equal(BRADBURY_CHAIN.chainId, "0x107d");
  assert.equal(BRADBURY_CHAIN.nativeCurrency.symbol, "GEN");
  assert.deepEqual(BRADBURY_CHAIN.rpcUrls, ["https://rpc-bradbury.genlayer.com"]);
});

test("wallet helpers identify Bradbury and shorten addresses", () => {
  assert.equal(isBradburyChain("0x107d"), true);
  assert.equal(isBradburyChain("4221"), true);
  assert.equal(isBradburyChain("0x1"), false);
  assert.equal(shortAddress("0x82F8D476e7caC1d3B788e465c9c3e2beAc709c64"), "0x82F8...9c64");
});
