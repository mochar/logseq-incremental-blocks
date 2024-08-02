import { CurrentIBData } from "../queue";
import Beta from "./beta";
import stringComparison from "string-comparison";

// Update priority manually
export function betaFromMean(mean: number, currentBeta: Beta | null) : Beta {
  const minMean = 0.2;
  const maxMean = 0.8;
  mean = minMean + (maxMean-minMean)*mean;

  let beta : Beta;
  if (currentBeta) {
    beta = new Beta(currentBeta.a, currentBeta.b);
    beta.mean = mean;
  } else {
    let a: number, b: number;
    if (mean == 0.5) {
      a = 1;
      b = 1;
    } else if (mean > 0.5) {
      a = 1;
      b = a * (1 / mean - 1);
    } else {
      b = 1;
      a = b * (mean / (1 - mean));
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
  scoreTime: number,
  aTime: number,
  scoreContent: number,
  aContent: number,
  a: number
}

export function getPriorityUpdate(data: CurrentIBData) : PriorityUpdate {
  // Time component
  const now = new Date();
  const durationSeconds = (now.getTime() - data.start.getTime()) / 1000;
  const timeAlpha = logistic(1, 10, .5, .1)(durationSeconds);

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
    aTime: timeAlpha, 
    scoreContent: totalContentDistance,
    aContent: contentAlpha, 
    a: timeAlpha + contentAlpha
  };
}