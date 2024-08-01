import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import Beta from "./algorithm/beta";
import { dateDiffInDays, todayMidnight } from "./utils";

class IncrementalBlock {
  readonly uuid: string;
  readonly properties: Record<string, any>;
  readonly block: BlockEntity | null;
  readonly beta: Beta | null;
  readonly dueDate: Date | null;
  readonly sample: number | null;
  readonly multiplier: number;
  readonly interval: number | null;
  readonly reps: number;

  constructor(uuid: string, props: Record<string, any>, block?: BlockEntity) {
    this.uuid = uuid;
    this.properties = props;
    this.block = block ?? null;
    this.beta = Beta.fromProps(props);

    const sample = parseFloat(props['ibSample']);
    if (Beta.isValidSample(sample)) {
      this.sample = sample;
    } else if (this.beta) {
      this.sample = this.beta.sample({ seedToday: true });
    } else {
      this.sample = null;
    }
    
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
      this.reps = 0;
    }

    const interval = parseFloat(props['ibInterval']);
    if (typeof interval === 'number' && interval >= 0) {
      this.interval = interval;
    } else {
      this.interval = null;
    }
  }

  static async fromUuid(uuid: string) {
    const props = await logseq.Editor.getBlockProperties(uuid);
    return new this(uuid, props);
  }

  static fromBlock(block: BlockEntity) {
    return new this(block.uuid, block.properties!, block);
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
}

export default IncrementalBlock;