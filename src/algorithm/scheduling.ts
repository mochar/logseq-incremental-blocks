import { jStat } from "jstat";
import { IncrementalBlock } from "../types";

export function initialIntervalFromMean(mean: number) : number {
  const rate = (1 - mean) * 25;
  const interval = jStat.poisson.sample(rate) + 1;
  return interval;
}

export function nextInterval(ib: IncrementalBlock) : number {
  return Math.ceil(ib.scheduling!.interval * ib.scheduling!.multiplier);
}
