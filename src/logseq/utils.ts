import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";

export async function getBlockHierarchyContent(uuid: string, maxDepth: number): Promise<Record<string, string>> {
  const contents: Record<string, string> = {};
  const block = await logseq.Editor.getBlock(uuid, { includeChildren: true });
  if (!block) return contents;

  function helper(currentBlock: BlockEntity, currentDepth: number) {
    if (currentDepth > maxDepth || !currentBlock.children) {
      return;
    }

    if (currentBlock.content) {
      contents[currentBlock.uuid] = currentBlock.content;
    }

    // Recursively process each child block
    for (let childBlock of currentBlock.children) {
      helper(childBlock as BlockEntity, currentDepth + 1);
    }
  }

  helper(block, 1);
  return contents;
}

// export async function findNearestParentIb(block: BlockEntity) : IncrementalBlock {
//   // First check if parent is ib.


//   const page = await logseq.Editor.getPage(block.page.id);
//   const tree = await logseq.Editor.getPageBlocksTree(page!.uuid);
// }