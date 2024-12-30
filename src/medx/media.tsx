import { TemporalDimension } from "@kitaitimakoto/media-fragment";
import { secondsToString } from "../utils/datetime";
import React from "react";

export interface MediaFragment {
  start: number,
  end: number,
  volume?: number,
  rate?: number,
  loop?: boolean
}

export const mediaTypes = ['audio', 'video', 'youtube'];
export declare type MediaType = typeof mediaTypes[number];

export interface MediaSource extends Partial<MediaFragment> {
  url: string,
  type: MediaType,
}

export interface Media {
  pageUuid: string,
  source: MediaSource
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

function parsePotentialFloat(value: any) : number | undefined {
  const float = parseFloat(value);
  if (Number.isNaN(float)) return undefined;
  return float;
}

export function parseFragmentProperties(properties: Record<string, any>) : MediaFragment | null {
  const td = new TemporalDimension(`${properties['start']},${properties['end']}`);
  const start = parseFloat(td.s.toString());
  const end = parseFloat(td.e.toString());
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const volume = parsePotentialFloat(properties['volume']);
  const rate = parsePotentialFloat(properties['rate']);
  let loop = properties['loop'];
  if (loop) {
    // Not sure if always read as boolean type or string
    loop = loop.toString() == 'true'
      ? true : (loop.toString() == 'false' ? false : undefined)
  }
  return { start, end, volume, rate, loop };
}

export function parseSourceProperties(properties: Record<string, any>) : MediaSource | null {
  if (!properties) return null;
  const url = properties['url'];
  const type = properties['media'];
  if (!(url && mediaTypes.includes(type))) return null;
  const fragment = parseFragmentProperties(properties);
  return { url, type, ...fragment };
}

export function getTimedUrl(fragment: MediaSource) : string {
  let urlTimed = '';
  if (fragment.type == 'youtube') {
    urlTimed = `https://www.youtube.com/embed/${fragment.url}?autoplay=0`;
    if (fragment.start) {
      urlTimed = `${urlTimed}&start=${fragment.start}`;
    }
    if (fragment.end) {
      urlTimed = `${urlTimed}&end=${fragment.end}`;
    }
  } else {
    const td = new TemporalDimension();
    if (fragment.start) td.s = fragment.start;
    if (fragment.end) td.e = fragment.end;
    urlTimed = `${fragment.url}#t=${td.toString().replace('npt:', '')}`;
  }
  return urlTimed;
}
