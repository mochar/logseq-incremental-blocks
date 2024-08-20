import MedxArgs from "./args";

//@ts-ignore
export async function renderMedxMacro({ slot, payload }) {
  const args = MedxArgs.parse(payload.arguments);
  if (args == null) return;

  const isYoutube = args.format == 'youtube';
  let maybeYtEmbed = '';
  if (isYoutube) {
    const loop = args.loop ? '1' : '0';
    maybeYtEmbed = `
    <iframe 
      id="ytplayer-${slot}" 
      type="text/html" 
      width="640" 
      height="360"
      style="width: 640px; height: 360px; margin: 0"
      src="${args.urlTimed}&loop=${loop}"
      frameborder="0">
    </iframe>
    `;
  }

  const html = `
  <div class="text-sm bg-gray-100/20 text-gray-700 flex items-center">
    <div class="medx-player flex">${maybeYtEmbed}</div>
    
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

  if (isYoutube) return;

  setTimeout(() => {
    const playerDiv = top?.document.querySelector(`#${slot} .medx-player`);
    if (!playerDiv) return;
    let media: HTMLMediaElement;
    if (args.format == 'audio') {
      media = new Audio(args.urlTimed);
    } else if (args.format == 'video') {
      media = document.createElement('video');
      media.src = args.urlTimed || args.url;
    } else {
      return;
    }
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
