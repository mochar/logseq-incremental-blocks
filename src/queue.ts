import IncrementalBlock from "./IncrementalBlock";
import { queryDueIbs } from "./logseq/query";

class IbQueue {
  private _ibs: IncrementalBlock[] = [];

  public async refresh() {
    let ibs = await queryDueIbs();
    ibs = ibs.sort((a, b) => b.sample! - a.sample!);
    this._ibs = ibs;
  }

  public next() : IncrementalBlock | undefined {
    // Make sure ib has not been moved to another day
    let ib = this._ibs.shift();
    while (ib && ib.dueDays() != 0) {
      ib = this._ibs.shift();
    }
    return ib;
  }

  public get current() : IncrementalBlock {
    return this._ibs[0];
  }

  public get ibs() {
    return this._ibs;
  }

  public get length() : number {
    return this._ibs.length;
  }
}

export default IbQueue;