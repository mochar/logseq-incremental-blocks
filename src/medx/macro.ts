import { TemporalDimension } from "@kitaitimakoto/media-fragment";
import { secondsToString } from "../utils";

// url, timerange, vol, rate, loop, playing
export interface MedxArgs {
  url: string,
  start?: number | undefined,
  end?: number | undefined,
  urlTimed?: string | undefined,
  volume: number,
  rate: number,
  loop: boolean,
}

export function parseArgs(args: any[]) : MedxArgs | null {
  if (args.length < 2) return null;
  let [flag, url, range, volume, rate, loop] = args;
  let start, end, urlTimed = url;
  if (range) {
    const td = new TemporalDimension(range.replace('-', ','));
    start = parseFloat(td.s.toString());
    end = parseFloat(td.e.toString());
    if (end == Infinity) end = undefined;
    urlTimed = `${url}#t=${td.toString().replace('npt:', '')}`;
  }
  volume = volume ? parseFloat(volume) : 1.0;
  rate = rate ? parseFloat(rate) : 1.0;
  loop = loop ? loop == 'true' : false;
  return { url, start, end, urlTimed, volume, rate, loop };
}

export function renderArgs({args, asMacro=true }: { args: MedxArgs, asMacro?: boolean }) : string {
  let range = '-';
  if (args.start || args.end) {
    const start = args.start ? secondsToString(args.start) : '';
    const end = args.end ? secondsToString(args.end) : '';
    range = `${start}-${end}`;
  }
  const loop = args.loop.toString();
  const str = `:medx, ${args.url}, ${range}, ${args.volume}, ${args.rate}, ${loop}`;
  if (asMacro) return `{{renderer ${str}}}`;
  return str;
}

//@ts-ignore
export async function renderMedxMacro({ slot, payload }) {
  const args = parseArgs(payload.arguments);
  console.log(args);
  if (args == null) return;
  const html = `
  <div class="text-sm bg-gray-100/20 text-gray-700 flex">
    <button class="medx-player"></button>
    
    <button
      class="rounded-lg border flex items-center h-8 ml-2"
      data-on-click="toggleMedxPopover" 
      data-block-uuid="${payload.uuid}"
      data-slot-id="${slot}"
      data-macro-args="${payload.arguments}"
    >
      <span class="ti ti-layers-subtract text-base px-1"></span>
    </button>
  </div>
  `;

  logseq.provideUI({
    key: slot,
    slot: slot,
    reset: true,
    template: html,
  });

  setTimeout(() => {
    const playerDiv = top?.document.querySelector(`#${slot} .medx-player`);
    if (!playerDiv) return;
    const media = new Audio(args.urlTimed);
    media.controls = true;
    media.onloadedmetadata = function() {
      media.playbackRate = args.rate;
      media.loop = args.loop;
    };
    media.ontimeupdate = function() {
      if (args.end && media.currentTime >= args.end) {
        media.pause();
        media.currentTime = args.start ?? 0;
        if (args.loop) media.play();
      }
      if (args.start && media.currentTime <= args.start) {
        media.currentTime = args.start;
      }
    };
    playerDiv.appendChild(media);
  }, 100);
}
