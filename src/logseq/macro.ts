import IncrementalBlock from "../IncrementalBlock";
import { format } from 'date-fns';
import { dateDiffInDays } from "../utils";

//@ts-ignore
export async function handleMacroRendererSlotted({ slot, payload }) {
  const [type] = payload.arguments
  if (!type?.startsWith(':ib')) return;
  console.log('IB MACRO SLOTTED');
  const ib = await IncrementalBlock.fromUuid(payload.uuid);

  let sampleHtml = '';
  if (ib.sample && (ib.dueDays() ?? 1) <= 0) {
    sampleHtml = `
      <div class="border px-px">
        <span>${(ib.sample*100).toFixed(2)}</span>
      </div>
    `;
  }

  let priorityHtml = '';
  if (ib.beta) {
    const mean = (ib.beta.mean*100).toFixed(2);
    const std = (ib.beta.std()*100).toFixed(1);
    priorityHtml = `<span>${mean} (± ${std})</span>`;
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
    const dateNice = format(ib.dueDate, 'yyyy-MM-dd');
    const diff = dateDiffInDays(new Date(), ib.dueDate);
    scheduleHtml = `
    <div class="border flex space-x-1">
      <span class="font-semibold text-yellow-900">S</span>
      <span>${dateNice} (${diff}d)</span>
    </div>
    `;
  }

  logseq.provideUI({
    key: `ib__${slot}`,
    slot,
    reset: true,
    template: `
    <button
      class="ib__container rounded-lg border text-sm flex" 
      data-on-click="togglePopover" 
      data-on-focusout="hidePopover"
      data-block-uuid="${payload.uuid}"
      data-slot-id="${slot}"
    >
      ${sampleHtml}
      ${priorityHtml}
      ${scheduleHtml}
    </button>`
  });
}