import test from "node:test";
import assert from "node:assert/strict";
import { formatGenFromWei, isEvmAddress, parseGenToWei } from "../src/chain-utils.js";

test("GEN helpers preserve token precision", () => {
  assert.equal(parseGenToWei("1.2"), 1200000000000000000n);
  assert.equal(formatGenFromWei(1200000000000000000n), "1.2 GEN");
});

test("EVM address validation rejects malformed values", () => {
  assert.equal(isEvmAddress("0x3db9b6ce30dadb1458a5947954960df866f84ef9"), true);
  assert.equal(isEvmAddress("0x123"), false);
});
