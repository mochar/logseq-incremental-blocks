import { TemporalDimension } from "@kitaitimakoto/media-fragment";
import { secondsToString } from "../utils";

interface IMedxArgs {
  url: string,
  format: 'audio' | 'video' | 'youtube',
  start?: number | undefined,
  end?: number | undefined,
  urlTimed?: string | undefined,
  volume: number,
  rate: number,
  loop: boolean
}

export default class MedxArgs {
  public url: string;
  public format: 'audio' | 'video' | 'youtube';
  public start?: number | undefined;
  public end?: number | undefined;
  public urlTimed?: string | undefined;
  public volume: number;
  public rate: number;
  public loop: boolean;

  constructor(args: IMedxArgs) {
    this.url = args.url;
    this.format = args.format;
    this.start = args.start;
    this.end = args.end;
    this.urlTimed = args.urlTimed;
    this.volume = args.volume;
    this.rate = args.rate;
    this.loop = args.loop;
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
      urlTimed = `${url}#t=${td.toString().replace('npt:', '')}`;
    }
    volume = volume ? parseFloat(volume) : 1.0;
    rate = rate ? parseFloat(rate) : 1.0;
    loop = loop ? loop == 'true' : false;
    return new this({ url, format, start, end, urlTimed, volume, rate, loop });
  }

  public render(asMacro: boolean = true) : string {
    let range = '-';
    if (this.start || this.end) {
      const start = this.start ? secondsToString(this.start) : '';
      const end = this.end ? secondsToString(this.end) : '';
      range = `${start}-${end}`;
    }
    const loop = this.loop.toString();
    const str = `:medx, ${this.url}, ${this.format}, ${range}, ${this.volume}, ${this.rate}, ${loop}`;
    if (asMacro) return `{{renderer ${str}}}`;
    return str;
  }
}