import { assertPatchedNode } from "../lib/nodeRuntime.js";

assertPatchedNode();
console.log(`Node ${process.versions.node}: security version requirement satisfied.`);
