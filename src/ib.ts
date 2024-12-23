import Beta from "./algorithm/beta";
import { IncrementalBlock, Scheduling } from "./types";

/*
 * Although no longer store data in properties, used by db importer
 * when converting from older version.
 */
export function ibFromProperties(uuid: string, props: Record<string, any>): IncrementalBlock {
  let scheduling: Scheduling | undefined;
  let due = parseFloat(props['ibDue']);
  if (!isNaN(due)) {
    // Set the time to midnight.
    // Should already be the case, but sometimes users are
    // naughty naughty so we need to fix things.
    const date = new Date(due);
    date.setHours(0, 0, 0, 0);
    due = date.getTime();

    let multiplier = parseFloat(props['ibMultiplier']);
    if (!(typeof multiplier === 'number' && multiplier >= 1)) {
      multiplier = logseq.settings?.defaultMultiplier as number ?? 2.;
    }

    let interval = parseFloat(props['ibInterval']);
    if (!(typeof interval === 'number' && interval >= 0)) {
      interval = 1;
    }

    let reps = parseFloat(props['ibReps']);
    if (!(typeof reps === 'number' && reps >= 0 && Number.isInteger(reps))) {
      reps = 0;
    }
    
    scheduling = { multiplier, interval, reps, dueDate: due };
  }

  const beta = Beta.fromProps(props);

  return {
    uuid,
    scheduling,
    betaParams: beta?.params ?? {a:1, b:1}
  }
}
