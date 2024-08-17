import { GLOBALS } from "../globals";
import IncrementalBlock from "../IncrementalBlock";
import { renderMedxMacro } from "../medx/macro";
import { dateDiffInDays, formatDate } from "../utils";

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
    priorityHtml = `<span>${mean} (± ${std})`;
    if (ib.sample && (ib.dueDays() ?? 1) <= 0) {
      priorityHtml += `<span class="muted"> [${(ib.sample*100).toFixed(2)}%]</span>`;
    }
    priorityHtml += '</span>';
  } else {
    priorityHtml = '<span class="text-red-800">Not set</span>';
  }
  priorityHtml = `
  <div class="border flex space-x-1">
    <span class="font-semibold text-indigo-700">P</span>${priorityHtml}
  </div>
  `;

  let scheduleHtml = '';
  if (ib.dueDate) {
    const dateNice = formatDate(ib.dueDate);
    const diff = dateDiffInDays(new Date(), ib.dueDate);
    scheduleHtml = `${dateNice} (${diff}d)`;
    if (ib.interval) {
      scheduleHtml += `<span class="muted"> [${ib.interval}d]</span>`;
    }
    scheduleHtml = `
    <div class="border flex space-x-1">
      <span class="font-semibold text-yellow-900">S</span>
      <span>${scheduleHtml}</span>
    </div>
    `;
  }

  let repHtml = '';
  const current = GLOBALS.queue.current;
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

  logseq.provideUI({
    key: `ib__${slot}`,
    slot,
    reset: true,
    template: `
    <div class="text-sm bg-gray-100/20 text-gray-700 flex">
      <button
        class="rounded-lg border flex" 
        data-on-click="toggleIbPopover" 
        data-block-uuid="${payload.uuid}"
        data-slot-id="${slot}"
      >
        ${priorityHtml}
        ${scheduleHtml}
      </button>

      ${repHtml}
    </div>
    `
  });
}
