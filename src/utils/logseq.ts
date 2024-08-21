import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import removeMarkdown from 'remove-markdown';
import { toDashCase } from "./utils";

// https://github.com/ahonn/logseq-plugin-todo/
export function trimContent(block: BlockEntity): string {
  let content = block.content;
  content = content.replace(block.marker as string, '');
  content = content.replace(`[#${block.priority}]`, '');
  content = content.replace(/SCHEDULED: <[^>]+>/, '');
  content = content.replace(/DEADLINE: <[^>]+>/, '');
  content = content.replace(/(:LOGBOOK:)|(\*\s.*)|(:END:)|(CLOCK:.*)/gm, '');
  content = content.replace(/id::[^:]+/, '');
  content = removeMarkdown(content);
  return content.trim();
}

export function addContentAndProps(content: string, { addition, props }: { addition?: string; props?: Record<string, any>; }): string {
  const lines = content.split(/\r?\n/);
  const propRegex = /[a-zA-Z0-9-_]+:: [^:]+/;
  let propIndex = 1;
  for (let i = 1; i <= lines.length; i++) {
    propIndex = i;
    if (propRegex.test(lines[i])) break;
  }
  if (addition) {
    lines.splice(propIndex, 0, addition);
  }
  if (props) {
    for (let prop of Object.keys(props)) {
      const propDash = toDashCase(prop);
      if (!content.includes(`${propDash}::`)) {
        lines.push(`${propDash}:: ${props[prop]}`);
      }
    }
  }
  return lines.join('\n');
}

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

