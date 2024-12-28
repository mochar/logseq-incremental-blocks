import { TemporalDimension } from "@kitaitimakoto/media-fragment";
import { secondsToString } from "../utils/datetime";
import React from "react";

export interface MediaFragment {
  flag?: ':medx' | ':medx_ref',
  url: string,
  format: 'audio' | 'video' | 'youtube',
  start?: number | undefined,
  end?: number | undefined,
  urlTimed?: string | undefined,
  volume: number,
  rate: number,
  loop: boolean
}

export function parseFragment(args: any[]) : MediaFragment | null {
  if (args.length < 3) return null;
  let [flag, url, format, range, volume, rate, loop] = args;
  let start, end, urlTimed = url;
  if (range) {
    const td = new TemporalDimension(range.replace('-', ','));
    start = parseFloat(td.s.toString());
    end = parseFloat(td.e.toString());
    if (end == Infinity) end = undefined;
    if (format == 'youtube') {
      urlTimed = `https://www.youtube.com/embed/${url}?autoplay=0`;
      if (start) {
        urlTimed = `${urlTimed}&start=${start}`;
      }
      if (end) {
        urlTimed = `${urlTimed}&end=${end}`;
      }
    } else {
      urlTimed = `${url}#t=${td.toString().replace('npt:', '')}`;
    }
  }
  volume = volume ? parseFloat(volume) : 1.0;
  rate = rate ? parseFloat(rate) : 1.0;
  loop = loop ? loop == 'true' : false;
  return { flag, url, format, start, end, urlTimed, volume, rate, loop };
}

export function renderFragment(frag: MediaFragment, asMacro: boolean = true) : string {
  let range = '-';
  if (frag.start || frag.end) {
    const start = frag.start ? secondsToString(frag.start) : '';
    const end = frag.end ? secondsToString(frag.end) : '';
    range = `${start}-${end}`;
  }
  const loop = frag.loop.toString();
  const str = `${frag.flag}, ${frag.url}, ${frag.format}, ${range}, ${frag.volume}, ${frag.rate}, ${loop}`;
  if (asMacro) return `{{renderer ${str}}}`;
  return str;
}

export function createFragmentElement(frag: MediaFragment) : JSX.Element {
  if (frag.format == 'audio') {
    return <audio controls src={frag.urlTimed}></audio>;
  } 
  if (frag.format == 'video') {
    return <video style={{ maxWidth: 400 }} controls src={frag.urlTimed}></video>;
  }
  if (frag.format == 'youtube') {
    const url = (frag.start || frag.end) ? `https://www.youtube.com/embed/${frag.url}?autoplay=0` : frag.urlTimed;
    return <iframe width={640} height={360} src={url}></iframe>;
  }
  return <></>;
}
