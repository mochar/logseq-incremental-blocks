import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin.user";
import Beta from "./algorithm/beta";
import { toDashCase } from "./utils/utils";
import { todayMidnight, dateDiffInDays, toEndOfDay } from "./utils/datetime";
import { RENDERER_MACRO_NAME as MACRO_NAME } from "./globals";
import { removeIbPropsFromContent, removePropsFromContent } from "./utils/logseq";

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
      // Should be the sample of today
      // this.sample = this.sampleAt(this.dueDate ?? todayMidnight());
      this.sample = this.sampleAt(todayMidnight());
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
    // Add uuid prefix as different ibs can have same beta.
    return this.beta.sample({ prefix: this.uuid, seedDate: date });
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

  static fromPage(page: PageEntity) {
    return new this(page.uuid, page.properties ?? {});
  }

  public copy() : IncrementalBlock {
    if (this.block) return IncrementalBlock.fromBlock(this.block);
    return new IncrementalBlock(this.uuid, this.properties);
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
    // Remove properties by content and using removeBlockProperty, since former only
    // works when props are visible and latter when props are hidden.
    const content = removeIbPropsFromContent(this.block.content).replace(MACRO_NAME, '');
    for (let prop of Object.keys(this.properties)) {
      if (prop.startsWith('ib')) {
        logseq.Editor.removeBlockProperty(this.uuid, toDashCase(prop));
      }
    }
    await logseq.Editor.updateBlock(this.uuid, content);
  }

  public get priorityOnly() : boolean {
    return this.dueDate == null || this.interval == null;
  }
}

export default IncrementalBlock;
