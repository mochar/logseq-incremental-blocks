import Beta from "../algorithm/beta";
import { IncrementalBlock } from "../types";
import { dateDiffInDays, todayMidnight } from "../utils/datetime";

const sepDiv = `<div
  class="h-full"
  style="background: #00000015; width: 2px"
></div>`;

export function generateIbUI(ib: IncrementalBlock): string {
 
  // Priority 
  const beta = Beta.fromParams(ib.betaParams);
  const mean = (beta.mean * 100).toFixed(2);
  const std = (beta.std() * 100).toFixed(1);
  const dueDays = ib.scheduling && dateDiffInDays(
    todayMidnight(), new Date(ib.scheduling.dueDate));
  let priorityHtml = `${sepDiv}<div class="flex px-1"><span>${mean}%`;
  if (ib.sample && (dueDays ?? 1) <= 0) {
    priorityHtml += `<span class="muted"> [${(ib.sample * 100).toFixed(2)}%]</span>`;
  }
  priorityHtml += '</span></div>';

  // Scheduling
  let scheduleHtml = '';
  if (dueDays) {
    scheduleHtml = `
    ${sepDiv}
    <div class="flex px-1">
      <span>${dueDays}d</span>
    </div>
    `;
  }

  // Document extract
  let extractHtml = '';
  if (!ib.extractData) {
  } else if ('readpoint' in ib.extractData) {
    console.log(ib);
    extractHtml = `    
    ${sepDiv}
    <button
      class="flex items-center rounded py-0.5 bg-base-4 hover:bg-secondary/70"
      style="font-size: .85rem"
      data-block-uuid="${ib.uuid}"
      data-on-click="openDoc"
    >
      <div class="flex px-1">
        <span>View extract</span>
      </div>
    </button>
    `;    
  }
  
  const id = logseq.baseInfo.id;
  let html = `
  <button
    class="flex items-center rounded py-0.5 bg-base-4 hover:bg-secondary/70"
    style="font-size: .85rem"
    data-block-uuid="${ib.uuid}"
    data-on-click="toggleIbPopover"
  >
    <div class="flex font-semibold px-1">
      <span>IB</span>
    </div>
    ${priorityHtml}
    ${scheduleHtml}
  </button>
  ${extractHtml}
  `;
  return html;
}
