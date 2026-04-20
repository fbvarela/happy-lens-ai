import { IPHONE_16_PRO } from "./iphone-16-pro";
import { PENTAX_K5 } from "./pentax-k5";

export const BUILT_IN_GEAR = [IPHONE_16_PRO, PENTAX_K5];

export function findBuiltIn(id) {
  return BUILT_IN_GEAR.find((g) => g.id === id);
}
