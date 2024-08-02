import IncrementalBlock from "./IncrementalBlock";
import { queryDueIbs } from "./logseq/query";
import { getBlockHierarchyContent } from "./logseq/utils";
import { Completer } from "./utils";

export interface CurrentIBData {
  ib: IncrementalBlock,
  start: Date,
  contents: Record<string, string>,
  newContents: Record<string, string>,
  manualPriority?: number,
  manualInterval?: number,
}

class IbQueue {
  private _ibs: IncrementalBlock[] = [];
  private _refreshDate: Date | undefined;
  private _refreshed = (new Completer()).complete(true);
  // Public because edited from outside, find better way?
  public current?: CurrentIBData;

  public async refresh() {
    this._refreshed = new Completer();
    // await new Promise(resolve => setTimeout(resolve, 5000));
    let ibs = await queryDueIbs();
    ibs = ibs.sort((a, b) => b.sample! - a.sample!);
    this._ibs = ibs;
    this._refreshDate = new Date();
    this._refreshed.complete(true);
  }

  public async next() {
    // Make sure ib has not been moved to another day
    let ib = this._ibs.shift();
    while (ib && !ib.dueToday()) {
      ib = this._ibs.shift();
    }

    // Populate the current ib data
    if (ib) {
      const contents = await getBlockHierarchyContent(ib.uuid, 3);
      this.current = {
        ib: ib,
        start: new Date(),
        contents: contents,
        newContents: contents
      }
    } else {
      this.current = undefined;
    }
  }

  public add(ib: IncrementalBlock) {
    if (!ib.dueToday() || !ib.beta) return;
    const sample = ib.beta.sample({ seedToday: true });
    for (let i = 0; i < this.ibs.length; i++) {
      if (this.ibs[i].sample! < sample) {
        this.ibs.splice(i, 0, ib);
        break;
      }
    }
  }

  public remove(uuid: string) {
    for (let i = 0; i < this._ibs.length; i++) {
      if (this._ibs[i].uuid == uuid) {
        this._ibs.splice(i, 1);
      }
    }
  }
  
  public currentBackToQueue() {
    if (this.current) {
      this._ibs.splice(0, 0, this.current.ib);
    }
    this.current = undefined;
  }

  public get ibs() {
    return this._ibs;
  }

  public get length() : number {
    return this._ibs.length;
  }

  public get refreshed() {
    return this._refreshed;
  }

  public get refreshDate() : Date | undefined {
    return this._refreshDate;
  }

  public minutesSinceLastRefresh() : number | undefined {
    if (!this._refreshDate) return;
    const diff = (new Date()).getTime() - this._refreshDate.getTime();
    return diff / (1000 * 60);
  }
}

export default IbQueue;