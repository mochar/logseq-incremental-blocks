import IncrementalBlock from "../IncrementalBlock";
import { average } from "../utils/utils";
import { addContentAndProps } from "../utils/logseq";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import Beta from "../algorithm/beta";
import { queryBlockRefs } from "../logseq/query";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { renderAndObserveUuid } from "../logseq/blockrender";
import { ibFromProperties } from "./read";
import { addDays, todayMidnight } from "../utils/datetime";

function blockRefsToBeta(refIbs: IncrementalBlock[]) : Beta | null {
  const as: number[] = [];
  const bs: number[] = [];
  for (const refIb of refIbs) {
    if (refIb.beta) {
      as.push(refIb.beta.a);
      bs.push(refIb.beta.b);
    }
  }
  if (as.length > 0) {
    return new Beta(average(as), average(bs));
  }
  return null;
}

export async function generateNewIbProps() : Promise<Record<string, any>> {
  const uuid = await logseq.Editor.newBlockUUID();
  const multiplier = logseq.settings?.defaultMultiplier as number ?? 2.;
  const interval = initialIntervalFromMean(.5);
  const due = addDays(todayMidnight(), interval);
  return {
    id: uuid,
    'ib-a': 1, 'ib-b': 1,
    'ib-reps': 0, 'ib-multiplier': multiplier,
    'ib-interval': interval, 'ib-due': due.getTime()
  };
}

/*
Generate ib properties from block. If some of them already exist, keep them.
 */
type PriorityOnly = boolean | 'inherit';

interface IGenProps {
  uuid: string,
  priorityOnly?: PriorityOnly,
  block?: BlockEntity | null
}

export async function generateIbPropsFromBlock({ uuid, priorityOnly=false, block } : IGenProps) : Promise<Record<string, any> | null> {
  if (!block) block = await logseq.Editor.getBlock(uuid);
  if (!block) return null;

  // Parse the existing ib related properties
  const ib = IncrementalBlock.fromBlock(block);

  // If priorityOnly flag is boolean, then respect it. Otherwise, determine
  // from existing ib properties (if they exist) if it has scheduling.
  if (priorityOnly == 'inherit') {
    priorityOnly = !(ib.dueDate && ib.interval);
  }
  
  const props: Record<string, any> = { id: uuid };
  if (priorityOnly == false) {
    props['ib-multiplier'] = ib.multiplier;
    props['ib-reps'] = ib.reps ?? 0;
  }
  let beta = ib.beta;
  if (!beta) {
    // Try to calculate initial beta by inheriting from refs
    const refs = await queryBlockRefs({ uuid });
    if (refs && refs.refs.length > 0) {
      const refPages = await Promise.all(
        refs.refs.map(r => logseq.Editor.getPage(r.uuid)));
      const refIbs = refPages
        .filter(p => p?.properties)
        .map(p => IncrementalBlock.fromPage(p!));
      if (refIbs.length > 0) {
        beta = blockRefsToBeta(refIbs);
      }
    } 
    // If none, use default priority 
    if (!beta) {
      beta = new Beta(1, 1);
      beta.mean = logseq.settings?.defaultPriority as number ?? 0.5;
    }
  }
  props['ib-a'] = beta.a;
  props['ib-b'] = beta.b;

  if (priorityOnly == false) {
    const interval = initialIntervalFromMean(beta.mean);
    const due = new Date();
    due.setDate(due.getDate() + interval);
    props['ib-due'] = due.getTime();
    props['ib-interval'] = interval;
  }
  return props;
}

/*
*/
interface BlockToIb {
  uuid: string,
  priorityOnly?: PriorityOnly,
  block?: BlockEntity | null,
  backToEditing?: boolean
}

export async function convertBlockToIb({ uuid, block, priorityOnly=false, backToEditing=false }: BlockToIb) {
  let content: string = '';
  let isEditing = false;
  const cursorPos = await logseq.Editor.getEditingCursorPosition();

  if (!block) {
    // If editing, get content
    content = await logseq.Editor.getEditingBlockContent();
    if (content) isEditing = true;
    block = await logseq.Editor.getBlock(uuid);
  }

  if (!block) {
    logseq.UI.showMsg('Block not found', 'error');
    return;
  }

  if (!content) content = block.content;

  const props = await generateIbPropsFromBlock({ uuid, priorityOnly, block });
  if (!props) {
    logseq.UI.showMsg('Failed to generate ib properties', 'error');
    return;
  }

  // await logseq.Editor.updateBlock(uuid, content, { properties: props });

  // TODO: This doesn't update existing params
  let addition = '';
  //  if (!content.includes(RENDERER_MACRO_NAME)) addition = RENDERER_MACRO_NAME;
  const newContent = addContentAndProps(content, { addition, props });
  await logseq.Editor.updateBlock(uuid, newContent);
  await logseq.Editor.exitEditingMode();

  renderAndObserveUuid(uuid);
  
  if (backToEditing) {
    setTimeout(() => {
      logseq.Editor.editBlock(uuid, { pos: cursorPos?.pos ?? 0 });
    }, 100);
  } 
}

