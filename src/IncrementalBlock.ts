import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import Beta from "./beta";

class IncrementalBlock {
  // readonly block: BlockEntity | null;
  readonly properties: Record<string, any>;
  readonly beta: Beta | null;
  readonly dueDate: Date | null;
  readonly sample: number | null;
  readonly multiplier: number;
  readonly interval: number | null;
  readonly reps: number;

  constructor(props: Record<string, any>) {
    this.properties = props;
    this.beta = Beta.fromProps(props);

    const sample = parseFloat(props['ibSample']);
    if (Beta.isValidSample(sample)) {
      this.sample = sample;
    } else {
      this.sample = null;
    }
    
    const due = new Date(props['ibDue']);
    if (due instanceof Date && !isNaN(due.getTime())) {
      // Set the time to midnight.
      // Should already be the case, but sometimes users are
      // naughty naughty so we need to fix things.
      due.setHours(0, 0, 0, 0);
      this.dueDate = due;
    } else {
      this.dueDate = null;
    }

    const multiplier = props['ibMultiplier'];
    if (typeof multiplier === 'number' && multiplier >= 1) {
      this.multiplier = multiplier;
    } else {
      this.multiplier = logseq.settings?.defaultMultiplier as number ?? 2.;
    }

    const reps = props['ibReps'];
    if (typeof reps === 'number' && reps >= 0 && Number.isInteger(reps)) {
      this.reps = reps;
    } else {
      this.reps = 0;
    }

    const interval = props['ibInterval'];
    if (typeof interval === 'number' && interval >= 0) {
      this.interval = interval;
    } else {
      this.interval = null;
    }
  }

  static async fromUuid(uuid: string) {
    const props = await logseq.Editor.getBlockProperties(uuid);
    return new this(props);
  }
}

export default IncrementalBlock;