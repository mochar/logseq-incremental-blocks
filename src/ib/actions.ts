import { RENDERER_MACRO_NAME } from "../globals";
import { IncrementalBlock } from "../types";
import { removeIbPropsFromContent } from "../utils/logseq";
import { toDashCase } from "../utils/utils";

export async function doneIb(ib: IncrementalBlock) {
  const block = await logseq.Editor.getBlock(ib.uuid, {includeChildren: false});
  if (!block) return;
  // Remove properties by content and using removeBlockProperty, since former only
  // works when props are visible and latter when props are hidden.
  const content = removeIbPropsFromContent(block.content).replace(RENDERER_MACRO_NAME, '');
  for (let prop of Object.keys(block.properties ?? {})) {
    if (prop.startsWith('ib')) {
      logseq.Editor.removeBlockProperty(ib.uuid, toDashCase(prop));
    }
  }
  await logseq.Editor.updateBlock(ib.uuid, content);
}

