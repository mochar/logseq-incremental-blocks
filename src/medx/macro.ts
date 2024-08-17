import { TemporalDimension } from "@kitaitimakoto/media-fragment";

export interface MedxArgs {
  url: string,
  start: number | undefined,
  end: number | undefined,
  rate: number,
  loop: boolean,
}

export function parseArgs(args: string[]) : MedxArgs | null {
  if (args.length < 2) return null;
  const url = args[1];
  let start, end;
  if (args.length > 2) {
    const td = new TemporalDimension(args[2].replace('-', ','));
    start = parseFloat(td.s.toString());
    end = parseFloat(td.e.toString());
  }
  return { url, start, end, rate: 1., loop: false };
}

//@ts-ignore
export async function renderMedxMacro({ slot, payload }) {
  const [type, url] = payload.arguments

  logseq.provideUI({
    key: `medx__${slot}`,
    slot,
    reset: true,
    template: `
    <div class="text-sm bg-gray-100/20 text-gray-700 flex">
      <audio controls src="${url}"></audio>
      <button
        class="rounded-lg border flex" 
        data-on-click="toggleMedxPopover" 
        data-block-uuid="${payload.uuid}"
        data-slot-id="${slot}"
        data-macro-args="${payload.arguments}"
      >
        Extract
      </button>
    </div>
    `
  });
}