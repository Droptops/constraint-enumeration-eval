// CVE-2026-111497 fixes differ by release line. A single >=22.23.4
// lower bound would also accept vulnerable early Node 24 and 26 releases.
const PATCHED_MINIMUMS = new Map([
  [22, [23, 4]],
  [24, [22, 1]],
  [26, [12, 1]]
]);

export const SUPPORTED_NODE_RANGE = "^22.23.4 || ^24.22.1 || ^26.12.1";

export function isPatchedNodeVersion(version) {
  const match = /^(?:v)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(String(version));
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  const minimum = PATCHED_MINIMUMS.get(major);
  return Boolean(minimum && (minor > minimum[0] || (minor === minimum[0] && patch >= minimum[1])));
}

export function assertPatchedNode(version = process.versions.node) {
  if (!isPatchedNodeVersion(version)) {
    const error = new Error(
      `Node ${version} is not supported. Install ${SUPPORTED_NODE_RANGE} and restart ` +
      "the actual service/container to address CVE-2026-111497."
    );
    error.code = "ERR_UNPATCHED_NODE_RUNTIME";
    throw error;
  }
}

// Native fetch can decode Brotli response bodies before callers inspect them.
// Check the running executable even when npm lifecycle scripts were bypassed.
export function fetchWithPatchedNode(...args) {
  assertPatchedNode();
  return globalThis.fetch(...args);
}
