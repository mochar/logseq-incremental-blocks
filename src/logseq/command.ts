import Beta from "../algorithm/beta";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { RENDERER_MACRO_NAME } from "../globals";
import IncrementalBlock from "../IncrementalBlock";

async function convertBlockToIb({ uuid, priorityOnly=false }: { uuid: string, priorityOnly?: boolean }) {
  // If editing, get content
  let content = await logseq.Editor.getEditingBlockContent();

	const block = await logseq.Editor.getBlock(uuid);
	if (!block) return;
  await logseq.Editor.exitEditingMode();

  // If not editing, get block content.
  if (!content) content = block.content;

  // Make sure contains macro.
  if (!content.includes(RENDERER_MACRO_NAME)) {
    content = content + `\n${RENDERER_MACRO_NAME}`;

    // This returns the cursor back to original position, but doesn't
    // work reliably.
    // const blockPos = await logseq.Editor.getEditingCursorPosition();
    // await logseq.Editor.updateBlock(uuid, content);
    // if (blockPos) {
    //   setTimeout(async () => { 
    //     await logseq.Editor.editBlock(uuid, { pos: blockPos.pos });
    //   }, 200);
    // }
  }

  // Add properties.
  const ib = IncrementalBlock.fromBlock(block);
  const props: Record<string, any> = {};
  if (!priorityOnly) {
    props['ib-reps'] = ib.reps ?? 0;
  }
  let beta = ib.beta;
  if (!beta) {
    beta = new Beta(1, 1);
    beta.mean = logseq.settings?.defaultPriority as number ?? 0.5;
  }
  props['ib-a'] = beta.a;
  props['ib-b'] = beta.b;
  if (!priorityOnly && (!ib.interval || !ib.dueDate)) {
    const interval = initialIntervalFromMean(beta.mean);
    const due = new Date();
    due.setDate(due.getDate() + interval);
    props['ib-due'] = due.getTime();
    props['ib-interval'] = interval;
  }
  await logseq.Editor.updateBlock(uuid, content, { properties: props });
}

export async function onCreateIbCommand({ uuid }: { uuid: string }) {
  await convertBlockToIb({ uuid });
}

export async function onCreatePbCommand({ uuid }: { uuid: string }) {
  await convertBlockToIb({ uuid, priorityOnly: true });
}