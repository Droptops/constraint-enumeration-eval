import { assertPatchedNode } from "./lib/nodeRuntime.js";

// Also covers direct next dev/build/start invocation without npm hooks.
assertPatchedNode();

export default {};
