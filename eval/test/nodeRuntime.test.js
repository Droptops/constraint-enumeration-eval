import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  assertPatchedNode,
  fetchWithPatchedNode,
  isPatchedNodeVersion,
  SUPPORTED_NODE_RANGE
} from "../lib/nodeRuntime.js";

test("requires the security fix on each supported Node release line", () => {
  for (const version of ["22.23.4", "v22.23.4", "22.23.5", "22.24.0", "24.22.1", "24.23.0", "26.12.1", "26.13.0"]) {
    assert.equal(isPatchedNodeVersion(version), true, version);
    assert.doesNotThrow(() => assertPatchedNode(version));
  }
  for (const version of ["20.20.0", "22.23.3", "24.0.0", "24.22.0", "26.0.0", "26.12.0", "23.99.0", "25.99.0", "27.0.0", "28.0.0", "24.22.1-rc.1", "24.22", "024.22.1", "garbage", undefined]) {
    assert.equal(isPatchedNodeVersion(version), false, String(version));
    if (version !== undefined) {
      assert.throws(() => assertPatchedNode(version), { code: "ERR_UNPATCHED_NODE_RUNTIME" });
    }
  }
});

test("both packages and their lockfiles use the enforced release-line policy", () => {
  for (const packagePath of ["../package.json", "../package-lock.json", "../../agentic-eval/package.json", "../../agentic-eval/package-lock.json"]) {
    const data = JSON.parse(fs.readFileSync(new URL(packagePath, import.meta.url), "utf8"));
    const root = data.packages ? data.packages[""] : data;
    assert.equal(root.engines.node, SUPPORTED_NODE_RANGE, packagePath);
  }
});

test("blocks outbound fetch before transport on an unpatched runtime", () => {
  const descriptor = Object.getOwnPropertyDescriptor(process.versions, "node");
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    Object.defineProperty(process.versions, "node", { ...descriptor, value: "24.22.0" });
    globalThis.fetch = () => { calls += 1; throw new Error("transport must not run"); };
    assert.throws(() => fetchWithPatchedNode("https://example.invalid"), { code: "ERR_UNPATCHED_NODE_RUNTIME" });
    assert.equal(calls, 0);
  } finally {
    Object.defineProperty(process.versions, "node", descriptor);
    globalThis.fetch = originalFetch;
  }
});

test("preserves fetch arguments and response on a patched runtime", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process.versions, "node");
  const originalFetch = globalThis.fetch;
  const options = { method: "POST", body: "{}" };
  const response = { ok: true };
  let received;
  try {
    Object.defineProperty(process.versions, "node", { ...descriptor, value: "24.22.1" });
    globalThis.fetch = (...args) => { received = args; return Promise.resolve(response); };
    assert.equal(await fetchWithPatchedNode("https://example.invalid", options), response);
    assert.deepEqual(received, ["https://example.invalid", options]);
  } finally {
    Object.defineProperty(process.versions, "node", descriptor);
    globalThis.fetch = originalFetch;
  }
});
