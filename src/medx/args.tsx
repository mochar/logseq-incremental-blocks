import { TemporalDimension } from "@kitaitimakoto/media-fragment";
import { secondsToString } from "../utils/datetime";
import React from "react";

interface IMedxArgs {
  flag?: ':medx' | ':medx_ref',
  url: string,
  format: 'audio' | 'video' | 'youtube',
  start?: number | undefined,
  end?: number | undefined,
  urlTimed?: string | undefined,
  volume?: number,
  rate?: number,
  loop?: boolean
}

export default class MedxArgs {
  public flag: ':medx' | ':medx_ref';
  public url: string;
  public format: 'audio' | 'video' | 'youtube';
  public start?: number | undefined;
  public end?: number | undefined;
  public urlTimed?: string | undefined;
  public volume: number;
  public rate: number;
  public loop: boolean;

  constructor(args: IMedxArgs) {
    this.flag = args.flag ?? ':medx';
    this.url = args.url;
    this.format = args.format;
    this.start = args.start;
    this.end = args.end;
    this.urlTimed = args.urlTimed;
    this.volume = args.volume ?? 1.;
    this.rate = args.rate ?? 1.;
    this.loop = args.loop ?? false;
  }

  static parse(args: any[]) : MedxArgs | null {
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
    return new this({ flag, url, format, start, end, urlTimed, volume, rate, loop });
  }

  public render(asMacro: boolean = true) : string {
    let range = '-';
    if (this.start || this.end) {
      const start = this.start ? secondsToString(this.start) : '';
      const end = this.end ? secondsToString(this.end) : '';
      range = `${start}-${end}`;
    }
    const loop = this.loop.toString();
    const str = `${this.flag}, ${this.url}, ${this.format}, ${range}, ${this.volume}, ${this.rate}, ${loop}`;
    if (asMacro) return `{{renderer ${str}}}`;
    return str;
  }

  public createElement() : JSX.Element {
    if (this.format == 'audio') {
      return <audio controls src={this.urlTimed}></audio>;
    } 
    if (this.format == 'video') {
      return <video style={{ maxWidth: 400 }} controls src={this.urlTimed}></video>;
    }
    if (this.format == 'youtube') {
      const url = (this.start || this.end) ? `https://www.youtube.com/embed/${this.url}?autoplay=0` : this.urlTimed;
      return <iframe width={640} height={360} src={url}></iframe>;
    }
    return <></>;
  }
}