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
