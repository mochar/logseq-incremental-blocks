import { ibFromUuid } from "../ib";
import { IncrementalBlock } from "../types";
import { generateIbUI } from "./block-ui";

const BLOCK_OBSERVERS = new Map<string, MutationObserver>();

function clearBlockObservers() {
  BLOCK_OBSERVERS.forEach((observer) => observer.disconnect());
  BLOCK_OBSERVERS.clear();
}

export function generateBlockRenderKey(uuid: string) : string {
  return `ib-${uuid}`;
}

function renderIb(ib: IncrementalBlock) {
  const id = logseq.baseInfo.id;
  logseq.provideUI({
    key: generateBlockRenderKey(ib.uuid),
    path: `.ls-block[blockid="${ib.uuid}"]`,// .block-content-wrapper`,
    style: {
      width: 'fit-content',
      height: 'fit-content',
      marginLeft: '2.5rem',
    },
    attrs: {
      class: 'flex',
      onclick: `logseq.api.invoke_external_plugin_cmd('${id}', 'models', 'toggleIbPopover', ['${ib.uuid}'])`
    },
    template: generateIbUI(ib),
  });
}

export async function renderIfIb(blockUuid: string) {  
  const ib = await ibFromUuid(blockUuid);
  if (ib) {
    renderIb(ib);
  } else {
    BLOCK_OBSERVERS.delete(blockUuid);
  }
}

function createBlockMutationCallback(blockUuid: string) : MutationCallback {
  function blockMutationCallback(mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
      if (mutation.type !== 'childList') continue;
      for (const node of mutation.addedNodes) {
        const el = node as Element;
        if (!el.classList) continue;

        if (el.classList.contains('block-editor')) {
          // Editing
        } else if ((mutation.target as Element).classList.contains('block-content-wrapper')) {
          //Rendered
          renderIfIb(blockUuid);
        }
      }
    }
  }
  return blockMutationCallback;
}

async function renderAndObserveBlock(ib: IncrementalBlock, el: Element) {
  renderIb(ib);
  if (BLOCK_OBSERVERS.has(ib.uuid)) return;
  const blockObserver = new MutationObserver(createBlockMutationCallback(ib.uuid));
  blockObserver.observe(el.firstChild, { childList: true, subtree: true });
  BLOCK_OBSERVERS.set(ib.uuid, blockObserver);
}

async function renderAndObserveEl(el: Element) {
  const blockUuid = el.getAttribute('blockid');
  if (!blockUuid) return;
  const ib = await ibFromUuid(blockUuid);
  if (!ib) return;
  renderAndObserveBlock(ib, el);
}

export async function renderAndObserveUuid(blockUuid: string) {
  const el = parent.document.querySelector(`.ls-block[blockid="${blockUuid}"]`);
  if (!el) return;
  const ib = await ibFromUuid(blockUuid);
  if (!ib) return;
  renderAndObserveBlock(ib, el);
}

export function setupBlockRenderObserver() {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      // Child noded added/removed
      if (mutation.type !== 'childList') continue;
      for (const node of mutation.addedNodes) {
        const el = node as Element;
        if (!el.classList || !el.classList.contains('ls-block')) continue;
        renderAndObserveEl(el);
      }
    }
  });

  observer.observe(
    parent.document.getElementById('main-content-container'),
    { childList: true, subtree: true });
}

export function renderIbsInPage() {
  const blockEls = parent.document.querySelectorAll('.ls-block');
  blockEls.forEach(renderAndObserveEl);
}

export function setupBlockRendering() {
  // Set up only once
  setupBlockRenderObserver();

  // For current page on setup
  renderIbsInPage();
  
  logseq.App.onRouteChanged(e => {
    clearBlockObservers();
    renderIbsInPage();
  });
}
