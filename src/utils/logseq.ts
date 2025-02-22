import { AppGraphInfo, BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import removeMarkdown from 'remove-markdown';
import { toDashCase } from "./utils";
import { PROP_REGEX } from "../globals";
import { RootState } from "../state/store";

export async function isDark(): Promise<boolean> {
  const config = await logseq.App.getUserConfigs();
  return config.preferredThemeMode == 'dark';
}

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
  let propIndex = 1;
  for (let i = 1; i <= lines.length; i++) {
    propIndex = i;
    if (PROP_REGEX.test(lines[i])) break;
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

export function removePropsFromContent(content: string) : string {
  let lines = content.split(/\r?\n/);
  lines = lines.filter((line) => !PROP_REGEX.test(line));
  return lines.join('\n');
}

export function removeIbPropsFromContent(content: string) : string {
  let lines = content.split(/\r?\n/);
  lines = lines.filter((line) => !(PROP_REGEX.test(line) && line.startsWith('ib-')));
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

export function getFilterRefs() : string[] {
  const refsString = logseq.settings?.subsetQueries;
  if (!refsString) return [];
  const refs = (refsString as string).split(',')
    .filter((r) => !/^\s*$/.test(r))
    .map((r) => r.trim().toLowerCase());
  return refs;
}

export function updateVisiblity(state: RootState) {
  const shouldHide = state.view.main == null && state.view.popover == null;// && !state.learn.learning;
  console.log('shouldHide', shouldHide);
  if (shouldHide) {
    logseq.hideMainUI();
  } else {
    logseq.showMainUI();
  }
}

export function assetToPath(filename: string) : string {
  // https://github.com/logseq/logseq/pull/6488
  // file stored in `${current_graph_root}/assets/storages/${Plugin_ID}/data.json`
  const pluginId = logseq.baseInfo.id;
  return `../assets/storages/${pluginId}/${filename}`;
}
