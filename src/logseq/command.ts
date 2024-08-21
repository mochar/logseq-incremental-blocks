import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import Beta from "../algorithm/beta";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { RENDERER_MACRO_NAME } from "../globals";
import IncrementalBlock from "../IncrementalBlock";
import { average } from "../utils/utils";
import { addContentAndProps } from "../utils/logseq";
import { queryPathRefPages } from "./query";

function pathRefsToBeta(pathRefs: Record<string, any>[]) : Beta | null {
  const as: number[] = [];
  const bs: number[] = [];
  pathRefs.forEach((ref) => {
      const props = ref.properties ?? {};
      const a = parseFloat(props['ib-a']);
      const b = parseFloat(props['ib-b']);
      if (a && b) {
        as.push(a);
        bs.push(b);
      }
  });
  if (as.length > 0) {
    return new Beta(average(as), average(bs));
  }
  return null;
}

interface BlockToIb {
  uuid: string,
  priorityOnly?: boolean,
  block?: BlockEntity | null
}

async function convertBlockToIb({ uuid, block, priorityOnly=false  }: BlockToIb) {
  let content: string = '';

  if (!block) {
    // If editing, get content
    content = await logseq.Editor.getEditingBlockContent();
    block = await logseq.Editor.getBlock(uuid);
  }

	if (!block) return;

  if (!content) content = block.content;

  // Add properties.
  const ib = IncrementalBlock.fromBlock(block);
  const props: Record<string, any> = {};
  if (!priorityOnly) {
    props['ib-reps'] = ib.reps ?? 0;
  }
  let beta = ib.beta;
  if (!beta) {
    // Try to calculate initial beta by inheriting from refs
    const pathRefs = await queryPathRefPages(uuid);
    if (pathRefs.length > 0) {
      beta = pathRefsToBeta(pathRefs);
    } 
    // If none, use default priority 
    if (!beta) {
      beta = new Beta(1, 1);
      beta.mean = logseq.settings?.defaultPriority as number ?? 0.5;
    }
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
  // await logseq.Editor.updateBlock(uuid, content, { properties: props });

  // TODO: This doesn't update existing params
  let addition = '';
  if (!content.includes(RENDERER_MACRO_NAME)) addition = RENDERER_MACRO_NAME;
  const newContent = addContentAndProps(content, { addition, props });
  await logseq.Editor.updateBlock(uuid, newContent);
  await logseq.Editor.exitEditingMode();
}

export async function onCreateIbCommand({ uuid }: { uuid: string }) {
  await convertBlockToIb({ uuid });
}

export async function onCreatePbCommand({ uuid }: { uuid: string }) {
  await convertBlockToIb({ uuid, priorityOnly: true });
}

export async function onCreateIbWithSiblingsCommand({ uuid }: { uuid: string }) {
  // Siblings are children of parent block. 
  // However block data contains db id of parent rather than uuid.
  // Using getBlock with db id of page doesn't work.
  // So if top-level block (parent=page), get page blocks instead.
  const block = await logseq.Editor.getBlock(uuid);
  if (!block) return;
  let siblings: BlockEntity[];
  if (block.parent.id == block.page.id) {
    // Even with includeChildren doesn't return children.
    const page = await logseq.Editor.getPage(block.page.id, { includeChildren: true });
    if (!page) return;
    // Neither getPage nor getBlock works.. So just get page tree.
    siblings = await logseq.Editor.getPageBlocksTree(page.uuid);
  } else {
    const parentBlock = await logseq.Editor.getBlock(block.parent.id, { includeChildren: true });
    if (!parentBlock) return;
    siblings = parentBlock.children as BlockEntity[];
  }
  for (let sibling of siblings) {
    if (sibling.uuid == uuid) {
      // If this is the block the command was run on, dont pass the block itself
      // so that the editing content is retrieved.
      convertBlockToIb({ uuid: sibling.uuid });
    } else {
      convertBlockToIb({ uuid: sibling.uuid, block: sibling });
    }
  }
}

export async function onCreateIbWithChildrenCommand({ uuid }: { uuid: string }) {
}

export async function onCreateSelectedIbsCommand({ uuid }: { uuid: string }) {
  const selected = await logseq.Editor.getSelectedBlocks();
  if (!selected) return;
  for (const block of selected) {
    convertBlockToIb({ uuid: block.uuid, block: block });
  }
}