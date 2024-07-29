import { jStat } from "jstat";

function toBetaParams(mean: number, variance: number): {a: number, b: number} {
  let a = ((1 - mean) / variance - 1 / mean) * mean * mean;
  let b = a * (1 / mean - 1);
  // Ensure the parameters are non-negative
  a = Math.max(1e-10, a);
  b = Math.max(1e-10, b);
  return { a, b };
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

  static fromProps(props: {ibA: any, ibB: any}) {
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

  private setMoments() {
    this._mean = jStat.beta.mean(this._a, this._b);
    this._variance = jStat.beta.variance(this._a, this._b);
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

  public sample(): number {
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

  public varianceBound(): number {
    return this._mean * (1 - this._mean);
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
    // TODO: Should throw error instead of silently adjusting?
    const varBound = this.varianceBound();
    if (this._variance > varBound) {
      this.variance = varBound;
    }
    this.setParams();
  }

  public get variance() {
    return this._variance;
  }

  public set variance(variance) {
    this._variance = variance;
    this.setParams();
  }
}

export default Beta;