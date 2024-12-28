import ReactPlayer from 'react-player/lazy';
import { createRoot } from 'react-dom/client';
import React from "react";
import { secondsToString } from "../utils/datetime";
import { isDark } from "../utils/logseq";
import { MediaFragment, parseFragment } from './MediaFragment';

//@ts-ignore
export async function renderMedxMacro({ slot, payload }) {
  const args = parseFragment(payload.arguments);
  if (args == null) return;
  const isRef = args.flag!.endsWith('_ref') && (args.start || args.end);
  const dark = await isDark();
  const txtColor = dark ? "text-gray-300" : "text-gray-600";
  const bgColor = dark ? "bg-gray-700" : "bg-gray-100/10";

  let refHtml = '';
  if (isRef) {
    refHtml = `
    <button
      class="flex ${bgColor}"
      data-on-click="playRange"
      data-slot-id="${slot}"
      data-media-url="${args.url}"
      data-macro-args="${payload.arguments}"
    >
      <span>[${secondsToString(args.start ?? 0)}-${args.end ? secondsToString(args.end) : 'end'}]</span>
    </button>

    <button
      class="rounded-lg border flex items-center h-8 ml-2 ${bgColor}"
      data-on-click="refToMedia" 
      data-block-uuid="${payload.uuid}"
    >
      <span class="ti ti-code-plus text-base px-1"></span>
    </button>
    `;
  }

  const html = `
  <div class="text-sm flex items-center ${txtColor}">
    <div id="medx-player-${args.url}" class="medx-player flex"></div>

    ${refHtml}
    
    <button
      class="rounded-lg border flex items-center h-8 ml-2 ${bgColor}"
      data-on-click="toggleMedxPopover" 
      data-block-uuid="${payload.uuid}"
      data-slot-id="${slot}"
      data-macro-args="${payload.arguments}"
    >
      <span class="ti ti-quote text-base px-1"></span>
    </button>
  </div>
  `;

  logseq.provideUI({
    key: slot,
    slot: slot,
    reset: true,
    template: html,
  });

  if (!isRef) {
    setTimeout(() => {
      const playerDiv = top?.document.querySelector(`#${slot} .medx-player`);
      if (!playerDiv) return;
      return renderMediaEmbed({ playerDiv, args });
    }, 100);
  } 
}

interface RenderMediaProps {
  playerDiv: Element, 
  args: MediaFragment,
  play?: boolean
}

export function renderMediaEmbed({ playerDiv, args, play=false } : RenderMediaProps) {
  if (args.format == 'youtube') {
    const root = createRoot(playerDiv);
    const playerUrl = `https://www.youtube.com/watch?v=${args.url}`;
    root.render(<ReactPlayer
      url={playerUrl}
      playing={play}
      loop={args.loop}
      controls={true}
      volume={args.volume}
      playbackRate={args.rate}
      config={{
        youtube: {
          playerVars: {
            start: args.start ?? undefined,
            end: args.end ?? undefined
          }
        },
      }} />);
  } else {
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
    media.onloadedmetadata = function () {
      media.playbackRate = args.rate;
      media.loop = args.loop;
    };
    media.oncanplay = function() {
      if (play) media.play();
    }
    media.ontimeupdate = function () {
      if (args.end && media.currentTime >= args.end) {
        media.pause();
        media.currentTime = args.start ?? 0;
        if (args.loop) media.play();
      }
      if (args.start && media.currentTime <= args.start) {
        media.currentTime = args.start;
      }
    };
    playerDiv.replaceChildren(media);
  }
}
