import IncrementalBlock from "../IncrementalBlock";
import { renderMedxMacro } from "../medx/macro";
import { AppStore } from "../state/store";
import { dateDiffInDays } from "../utils/datetime";
import { isDark } from "../utils/logseq";

let store: AppStore;
export const injectStore = (_store: AppStore) => {
  store = _store
}

//@ts-ignore
export async function handleMacroRendererSlotted({ slot, payload }) {
  const [type] = payload.arguments
  if (!type) return;
  if (type.startsWith(':ib')) renderIbMacro({ slot, payload });
  if (type.startsWith(':medx')) renderMedxMacro({ slot, payload });
}

//@ts-ignore
async function renderIbMacro({ slot, payload }) {
  const ib = await IncrementalBlock.fromUuid(payload.uuid);

  let priorityHtml = '';
  if (ib.beta) {
    const mean = (ib.beta.mean*100).toFixed(2);
    const std = (ib.beta.std()*100).toFixed(1);
    priorityHtml = `<span>${mean}%`;
    if (ib.sample && (ib.dueDays() ?? 1) <= 0) {
      priorityHtml += `<span class="muted"> [${(ib.sample*100).toFixed(2)}%]</span>`;
    }
    priorityHtml += '</span>';
  } else {
    priorityHtml = '<span class="text-red-800">Not set</span>';
  }
  priorityHtml = `
  <div class="mx-1 flex px-1" style="border-width: 0 2px">
    ${priorityHtml}
  </div>
  `;

  let scheduleHtml = '';
  if (ib.dueDate) {
    const diff = dateDiffInDays(new Date(), ib.dueDate);
    scheduleHtml = `<span>${diff}d</span>`;
  }
  scheduleHtml = `
  <div class="mx-1 flex">
    ${scheduleHtml}
  </div>
  `;

  let repHtml = '';
  const current = store.getState().learn.current;
  if (current && current.ib.uuid == ib.uuid) {
    repHtml = `
      <button 
        class="rounded bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 hover:border-blue-500 flex items-center ml-2"
        data-on-click="nextRep"
      >
        <span class="px-2">Next rep</span>
      </button>
    `;
  }

  const dark = await isDark();
  logseq.provideUI({
    key: `ib__${slot}`,
    slot,
    reset: true,
    template: `
    <div class="text-xs flex">
      <button
        class="rounded-lg border flex px-1.5 py-0.5 items-center ${dark ? "bg-gray-700 text-gray-300" : "bg-gray-100/10 text-gray-600"}" 
        data-on-click="toggleIbPopover" 
        data-block-uuid="${payload.uuid}"
        data-slot-id="${slot}"
      >
        <div class="flex font-semibold">
          <span>IB</span>
        </div>
        ${priorityHtml}
        ${scheduleHtml}
      </button>
    </div>
    `
  });
}
