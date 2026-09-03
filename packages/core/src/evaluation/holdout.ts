import { makeRng } from "../generator/random.js";

const HOLDOUT_RNG = makeRng("niffler-holdout-v1");
const CONTROL_FRACTION = 0.2; // 20%

export function isControlGroup(orderId: string): boolean {
    return HOLDOUT_RNG.fork(orderId).next() < CONTROL_FRACTION;
}
