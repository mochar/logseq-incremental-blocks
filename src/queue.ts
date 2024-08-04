import { getPriorityUpdate, PriorityUpdate } from "./algorithm/priority";
import { nextInterval } from "./algorithm/scheduling";
import IncrementalBlock from "./IncrementalBlock";
import { queryDueIbs } from "./logseq/query";
import { getBlockHierarchyContent } from "./logseq/utils";
import { addDays, Completer, todayMidnight } from "./utils";

export interface CurrentIBData {
  ib: IncrementalBlock,
  start: Date,
  contents: Record<string, string>,
  newContents: Record<string, string>,
  priorityUpdate?: PriorityUpdate,
  manualPriority?: number,
  manualInterval?: number,
}

export enum RepAction { 
  finish, // Rep finished, update priority and schedule
  postpone, // Move to another day, keep everything as is
  done, // Block is done, clean up and go to next rep
  next, // Simply pop the current ib, without action
}

class LearnQueue {
  private _ibs: IncrementalBlock[] = [];
  private _refreshDate: Date | undefined;
  private _refreshed = (new Completer()).complete(true);
  public refs: string[] = [];
  // Public because edited from outside, probably should change
  public current?: CurrentIBData;

  public async refresh() {
    await this._refreshed.promise;
    this._refreshed = new Completer();
    // await new Promise(resolve => setTimeout(resolve, 5000));

    let where = '';
    //@ts-ignore
    if (this.refs.length > 0) {
      const refString = this.refs.map((r) => `"${r}"`).join(', ');
      where = `
      [?page :block/name ?pagename] 
      [(contains? #{${refString}} ?pagename)] 
      [?b :block/refs ?page]
      `;
    }
    let ibs = await queryDueIbs(where);

    ibs = ibs.sort((a, b) => b.sample! - a.sample!);
    this._ibs = ibs;
    this._refreshDate = new Date();
    this._refreshed.complete(true);
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

  public async getPriorityUpdate() {
    if (!this.current) return;
    this.current.newContents = await getBlockHierarchyContent(this.current.ib.uuid, 3);
    this.current.priorityUpdate = getPriorityUpdate(this.current);
  }

  public async nextRep() {
    // Get next ib, dismissing all that are not due (eg postoned while learning)
    let ib = this._ibs.shift();
    while (ib && !ib.dueToday()) {
      ib = this._ibs.shift();
    }

    // Populate the next ib data
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

  public async finishRep() {
    if (this.current){
      const current = this.current;

      // Update priority 
      const newBeta = current.ib.beta!.copy();
      if (current.manualPriority) {
        newBeta.mean = current.manualPriority;
      } else {
        await this.getPriorityUpdate();
        newBeta.a = newBeta.a + this.current.priorityUpdate!.a;
      }
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-a', newBeta.a);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-b', newBeta.b);

      // Update schedule
      const interval = nextInterval(current.ib);
      const newDue = addDays(todayMidnight(), interval);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-interval', interval);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-due', newDue.getTime());

      // Others
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-reps', current.ib.reps! + 1);
    }

    await this.nextRep();
  }

  public async postponeRep({ postponeInterval }: { postponeInterval: number }) {
    if (this.current) {
      const newDue = addDays(todayMidnight(), postponeInterval);
      await logseq.Editor.upsertBlockProperty(this.current.ib.uuid, 'ib-due', newDue.getTime());
    }
    await this.nextRep();
  }

  public async doneRep() {
    if (this.current) {
      // Get newest content
      const ib = await IncrementalBlock.fromUuid(this.current.ib.uuid, { propsOnly: false });
      await ib.done()
    }
    await this.nextRep();
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

export default LearnQueue;