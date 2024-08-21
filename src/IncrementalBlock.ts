import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import Beta from "./algorithm/beta";
import { toDashCase } from "./utils/utils";
import { todayMidnight, dateDiffInDays } from "./utils/datetime";
import { RENDERER_MACRO_NAME as MACRO_NAME } from "./globals";
import { jStat } from "jstat";
import seedrandom from "seedrandom";

class IncrementalBlock {
  readonly uuid: string;
  readonly properties: Record<string, any>;
  readonly block: BlockEntity | null;
  readonly beta: Beta | null;
  readonly dueDate: Date | null;
  readonly sample: number | null;
  readonly multiplier: number;
  readonly interval: number | null;
  readonly reps: number | null;

  constructor(uuid: string, props: Record<string, any>, block?: BlockEntity) {
    this.uuid = uuid;
    this.properties = props;
    this.block = block ?? null;
    this.beta = Beta.fromProps(props);
    
    const due = new Date(parseFloat(props['ibDue']));
    if (due instanceof Date && !isNaN(due.getTime())) {
      // Set the time to midnight.
      // Should already be the case, but sometimes users are
      // naughty naughty so we need to fix things.
      due.setHours(0, 0, 0, 0);
      this.dueDate = due;
    } else {
      this.dueDate = null;
    }

    const sample = parseFloat(props['ibSample']);
    if (Beta.isValidSample(sample)) {
      this.sample = sample;
    } else if (this.beta) {
      this.sample = this.sampleAt(this.dueDate ?? todayMidnight());
    } else {
      this.sample = null;
    }

    const multiplier = parseFloat(props['ibMultiplier']);
    if (typeof multiplier === 'number' && multiplier >= 1) {
      this.multiplier = multiplier;
    } else {
      this.multiplier = logseq.settings?.defaultMultiplier as number ?? 2.;
    }

    const reps = parseFloat(props['ibReps']);
    if (typeof reps === 'number' && reps >= 0 && Number.isInteger(reps)) {
      this.reps = reps;
    } else {
      this.reps = null;
    }

    const interval = parseFloat(props['ibInterval']);
    if (typeof interval === 'number' && interval >= 0) {
      this.interval = interval;
    } else {
      this.interval = null;
    }
  }

  public sampleAt(date: Date) : number | null {
    if (!this.beta) return null;
    // Add uuid as well because different ibs can have same beta.
    const seed = this.uuid + date.getTime().toString;
    jStat.setRandom(seedrandom(seed));
    return this.beta.sample({ seedToday: false });
  }

  static async fromUuid(uuid: string, opts : { propsOnly?: boolean } = {}) {
    if (opts.propsOnly ?? true) {
      const props = await logseq.Editor.getBlockProperties(uuid);
      return new this(uuid, props);
    } else {
      const block = await logseq.Editor.getBlock(uuid);
      return this.fromBlock(block!);
    }
  }

  static fromBlock(block: BlockEntity) {
    return new this(block.uuid, block.properties ?? {}, block);
  }

  public dueDays(): number | null {
    if (!this.dueDate) return null;
    const today = todayMidnight();
    const diff = dateDiffInDays(today, this.dueDate);
    return diff;
  }

  public dueToday() : boolean {
    const dueDays = this.dueDays();
    if (dueDays == null) return false;
    return dueDays <= 0;
  }

  public async done() {
    if (!this.block) return;
    const content = this.block.content.replace(MACRO_NAME, '');
    await logseq.Editor.updateBlock(this.uuid, content);
    for (let prop of Object.keys(this.properties)) {
      if (prop.startsWith('ib')) {
        await logseq.Editor.removeBlockProperty(this.uuid, toDashCase(prop));
      }
    }
  }
}

export default IncrementalBlock;