import { BETA_BOUNDS } from "../globals";
import { CurrentIBData } from "../learn/learnSlice";
import { unixTimestampToDate } from "../utils/datetime";
import Beta from "./beta";
import stringComparison from "string-comparison";

// Update priority manually
export function betaFromMean(mean: number, opts: { currentBeta?: Beta | null } = {}) : Beta {
  mean = Math.min(Math.max(mean, BETA_BOUNDS.meanLower), BETA_BOUNDS.meanUpper);

  let beta : Beta;
  if (opts.currentBeta) {
    beta = opts.currentBeta.copy();
    beta.mean = mean;
  } else {
    let a: number, b: number;
    if (mean == 0.5) {
      a = 1;
      b = 1;
    } else if (mean > 0.5) {
      b = BETA_BOUNDS.paramLower;
      a = (mean * b) / (1 - mean);
    } else {
      a = BETA_BOUNDS.paramLower;
      b = a * (1 - mean) / mean;
    }
    beta = new Beta(a, b);
  }

  return beta;
}

// Update priority from session data
function logistic(max: number, mid: number, rate: number, offset: number): (x: number) => number {
  const l = (x: number) => ((max  + offset) / (1 + Math.exp(-rate * (x - mid)))) - offset;
  return l;
}

export interface PriorityUpdate {
  scoreContent: number,
  aContent: number,
  a: number,
  scoreTime: number,
  bTime: number,
  b: number,
}

export function getPriorityUpdate(data: CurrentIBData) : PriorityUpdate {
  // Time component
  const now = new Date();
  const start = unixTimestampToDate(data.start);
  const durationSeconds = (now.getTime() - start.getTime()) / 1000;
  const timeBeta = logistic(1., 30, -.1, .2)(durationSeconds);

  // Content component
  const uuids = new Set([...Object.keys(data.contents), ...Object.keys(data.newContents)]);
  let totalContentDistance = 0;
  for (let uuid of uuids) {
    const distance = stringComparison.levenshtein.distance(
      data.contents[uuid]??'', data.newContents[uuid]??'');
    totalContentDistance += distance;
  }
  const contentAlpha = logistic(1, 50, .1, 0)(totalContentDistance);

  return { 
    scoreTime: durationSeconds, 
    bTime: timeBeta,
    b: timeBeta,
    scoreContent: totalContentDistance,
    aContent: contentAlpha, 
    a: contentAlpha
  };
}
