import { jStat } from "jstat";
import seedrandom from "seedrandom";
import { todayMidnight } from "../utils/datetime";
import { BETA_BOUNDS } from "../globals";
import { PriorityUpdate } from "./priority";

function toBetaParams(mean: number, variance: number): {a: number, b: number} {
  let a = ((1 - mean) / variance - 1 / mean) * mean * mean;
  let b = a * (1 / mean - 1);
  // Ensure the parameters are non-negative
  a = Math.max(1e-10, a);
  b = Math.max(1e-10, b);
  return { a, b };
}

function toBetaMoments(a: number, b: number) : { mean: number, variance: number } {
  const mean = jStat.beta.mean(a, b);
  const variance = jStat.beta.variance(a, b);
  return { mean, variance };
}

function boundParam(param: number) {
  return Math.min(Math.max(param, BETA_BOUNDS.paramLower), BETA_BOUNDS.paramUpper);
}

class Beta {
  private _a: number;
  private _b: number;
  private _mean!: number;
  private _variance!: number;

  constructor(a: number, b: number) {
    this._a = a;
    this._b = b;
    this.setMoments();
  }

  static fromProps(props: Record<string, any>) {
    const a = parseFloat(props['ibA']);
    if (!Beta.isValidParam(a)) return null;
    const b = parseFloat(props['ibB']);
    if (!Beta.isValidParam(b)) return null;
    return new this(a, b);
  }

  static fromMoments(mean: number, variance: number) {
    const {a, b} = toBetaParams(mean, variance);
    return new this(a, b);
  }

  static fromMeanA(mean: number, a: number) {
    const b = a * (1 / mean - 1);
    return new this(a, b);
  }

  static fromMeanB(mean: number, b: number) {
    const a = mean * b / (1 - mean);
    return new this(a, b);
  } 

  private setMoments() {
    const {mean, variance} = toBetaMoments(this._a, this._b);
    this._mean = mean;
    this._variance = variance;
  }

  private setParams() {
    const {a, b} = toBetaParams(this._mean, this._variance);
    this._a = a;
    this._b = b;
  }

  static isValidParam(p: number) {
    return typeof p === 'number' && p > 0;
  }

  public pdf(x: number): number {
    return jStat.beta.pdf(x, this._a, this._b);
  }

  public sample({ seedToday, seedDate }: { seedToday?: boolean, seedDate?: Date }): number {
    if (seedToday) {
      jStat.setRandom(seedrandom(todayMidnight().getTime().toString()));
    } else if (seedDate) {
      jStat.setRandom(seedrandom(seedDate.getTime().toString()));
    }
    return jStat.beta.sample(this._a, this._b);
  }

  static isValidSample(x: any): boolean {
    return typeof x === 'number' && x >= 0 && x <= 1;
  }

  public mode(): number {
    // TODO: only exists if a > 1 && b > 1
    return jStat.beta.mode(this._a, this._b);
  }

  public std(): number {
    return Math.sqrt(this._variance);
  }

  public varianceUpperBound(): number {
    return this._mean * (1 - this._mean);
  }

  public correctForBounds() {
    if (this._a < BETA_BOUNDS.paramLower || this._b < BETA_BOUNDS.paramLower) {
      const min = Math.min(this._a, this._b);
      const off = BETA_BOUNDS.paramLower - min;
      if (this._a == min) {
        this._a += off;
        this._b = Beta.fromMeanA(this._mean, this._a).b;
      } else {
        this._b += off;
        this._a = Beta.fromMeanB(this._mean, this._b).a;
      }
      this.setMoments();
    } else if (this._a > BETA_BOUNDS.paramUpper || this._b > BETA_BOUNDS.paramUpper) {
      const max = Math.max(this._a, this._b);
      const off = max - BETA_BOUNDS.paramUpper;
      if (this._a == max) {
        this._a -= off;
        this._b = Beta.fromMeanA(this._mean, this._a).b;
      } else {
        this._b -= off;
        this._a = Beta.fromMeanB(this._mean, this._b).a;
      }
      this.setMoments();
    } 
  }

  public get a() { 
    return this._a;
  };

  public set a(a) {
    this._a = a;
    this.setMoments();
  }

  public get b() {
    return this._b;
  }

  public set b(b) {
    this._b = b;
    this.setMoments();
  }

  public get mean() {
    return this._mean;
  }

  public set mean(mean) {
    this._mean = mean;
    // Can change variance bound leading to potentially invalid variance.
    const varUpperBound = this.varianceUpperBound();
    if (this._variance >= varUpperBound) {
      this._variance = varUpperBound - 0.00001;
    }
    this.setParams();
    this.correctForBounds();
  }

  public get variance() {
    return this._variance;
  }

  public set variance(variance) {
    this._variance = variance;
    this.setParams();
    this.correctForBounds();
  }

  public copy() : Beta {
    return new Beta(this._a, this._b);
  }

  public applyPriorityUpdate(priorityUpdate: PriorityUpdate) {
    this._a = this._a + priorityUpdate.a;
    this._b = this._b + priorityUpdate.b;
    this.correctForBounds();
  }

  public static boundParam(param: number) : number {
    return boundParam(param);
  }
}

export default Beta;