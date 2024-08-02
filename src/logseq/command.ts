import Beta from "../algorithm/beta";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import IncrementalBlock from "../IncrementalBlock";

export async function onCreateIbCommand({ uuid }: { uuid: string }) {
	const block = await logseq.Editor.getBlock(uuid);
	if (!block) return;
  let content = block.content;

  // Make sure contains macro.
  const rendererMacro = '{{renderer :ib}}';
  if (!block.content.includes(rendererMacro)) {
    content = content + `\n${rendererMacro}`;

    // This returns the cursor back to original position, but doesn't
    // work reliably.
    // const blockPos = await logseq.Editor.getEditingCursorPosition();
    // await logseq.Editor.updateBlock(uuid, content);
    // if (blockPos) {
    //   setTimeout(async () => { 
    //     await logseq.Editor.editBlock(uuid, { pos: blockPos.pos });
    //   }, 200);
    // }

    await logseq.Editor.updateBlock(uuid, content);
    await logseq.Editor.exitEditingMode();
  }

  // Add properties.
  const ib = IncrementalBlock.fromBlock(block);
  const props: Record<string, any> = {
    'ib-reps': ib.reps
  };
  let beta = ib.beta;
  if (!beta) {
    beta = new Beta(1, 1);
    beta.mean = logseq.settings?.defaultPriority as number ?? 0.5;
  }
  props['ib-a'] = beta.a;
  props['ib-b'] = beta.b;
  if (!ib.interval || !ib.dueDate) {
    const interval = initialIntervalFromMean(beta.mean);
    const due = new Date();
    due.setDate(due.getDate() + interval);
    props['ib-due'] = due.getTime();
    props['ib-interval'] = interval;
  }

  // Update. Want to use updateBlock here to fill all props at once,
  // but doesn't seem to work.
  for (const [key, val] of Object.entries(props)) {
    await logseq.Editor.upsertBlockProperty(uuid, key, val);
  }
  await logseq.Editor.exitEditingMode();
}