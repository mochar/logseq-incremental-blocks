import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import { RENDERER_MACRO_NAME } from "../globals";
import { removePropsFromContent } from "../utils/logseq";
import { convertBlockToIb, generateIbPropsFromBlock } from "../ib/create";

export async function onCreateIbCommand({ uuid }: { uuid: string }) {
  await convertBlockToIb({ uuid });
}

export async function onCreateIbShortcut() {
  const block = await logseq.Editor.getCurrentBlock();
  if (!block) return;
  await convertBlockToIb({ uuid: block.uuid, block })
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

export async function extractSelectionCommand() {
  const isEditing = await logseq.Editor.checkEditing();
  if (!isEditing) return;
  const selection = top?.window.getSelection()?.toString();
  if (!selection) return;
  const block = await logseq.Editor.getCurrentBlock();
  if (!block) return;
  const properties = await generateIbPropsFromBlock({ uuid: block.uuid, priorityOnly: false, block });
  if (!properties) return;
  // const content = `${selection}\n${RENDERER_MACRO_NAME}`;
  const content = `${selection}`;
  const extractUuid = await logseq.Editor.newBlockUUID()
  const extractBlock = await logseq.Editor.insertBlock(block.uuid, content, { 
    focus: false, customUUID: extractUuid, properties });
  if (!extractBlock) return;
  const reffedContent = block.content.replace(selection, `((${extractUuid}))`);
  await logseq.Editor.updateBlock(block.uuid, reffedContent);
}

export async function extractClozeCommand(asIb: boolean = true) {
  const isEditing = await logseq.Editor.checkEditing();
  if (!isEditing) return;
  const selection = top?.window.getSelection()?.toString();
  if (!selection) return;
  const block = await logseq.Editor.getCurrentBlock();
  if (!block) return;
  let properties: Record<string, any> = {};
  let content = removePropsFromContent(block.content);
  content = content.replace(selection, ` {{cloze ${selection}}} `);
  if (asIb) {
    // Child block will be ib
    properties = await generateIbPropsFromBlock({ uuid: block.uuid, priorityOnly: false, block }) || {};
    if (Object.keys(properties).length == 0) return;
    // if (!content.includes(RENDERER_MACRO_NAME)) {
    //   content = `${content}\n${RENDERER_MACRO_NAME}`;
    // }
  } else {
    // Child block will be cloze card
    content = content.replace(RENDERER_MACRO_NAME, '');
    content = `${content} #card`;
  }
  const extractBlock = await logseq.Editor.insertBlock(block.uuid, content, { 
    focus: false, properties });
}
