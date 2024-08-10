import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import removeMarkdown from 'remove-markdown';

// https://stackoverflow.com/questions/3224834/get-difference-between-2-dates-in-javascript
export function dateDiffInDays(a: Date, b: Date) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

// https://github.com/ahonn/logseq-plugin-todo/
export function trimContent(block: BlockEntity): string {
  let content = block.content;
  content = content.replace(block.marker as string, '');
  content = content.replace(`[#${block.priority}]`, '');
  content = content.replace(/SCHEDULED: <[^>]+>/, '');
  content = content.replace(/DEADLINE: <[^>]+>/, '');
  content = content.replace(/(:LOGBOOK:)|(\*\s.*)|(:END:)|(CLOCK:.*)/gm, '');
  content = content.replace(/id::[^:]+/, '');
  content = removeMarkdown(content);
  return content.trim();
}

export function todayMidnight(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(date: Date, days: number) : Date {
  const newDate = new Date(date.getTime());
  newDate.setDate(date.getDate() + days);
  return newDate;
}

export function toStartOfDay(date: Date) : Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

export function toEndOfDay(date: Date) : Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

export function formatDate(date: Date) : string {
  return date.toLocaleDateString('en-GB');
}

export function toCamelCase(str: string) : string {
  return str.replace(/-./g, (m) => m[1].toUpperCase());
}

export function toDashCase(str: string) : string {
  return str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

export function average(array: number[]) : number {
  return array.reduce((a, b) => a + b) / array.length;
}

// https://stackoverflow.com/questions/66123016/interpolate-between-two-colours-based-on-a-percentage-value
export function interpolateColor(palette: string[], percent: number) {
  // Get bucket
  const palSize = palette.length;
  const rightIndex = Math.ceil((palSize-1) * percent);
  if (rightIndex == 0) return palette[0];
  const color1 = palette[rightIndex-1];
  const color2 = palette[rightIndex];

  // Convert the hex colors to RGB values
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  // Interpolate the RGB values
  const r = Math.round(r1 + (r2 - r1) * percent);
  const g = Math.round(g1 + (g2 - g1) * percent);
  const b = Math.round(b1 + (b2 - b1) * percent);

  // Convert the interpolated RGB values back to a hex color
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// https://stackoverflow.com/questions/34673902/typescript-equivalent-to-dart-completer
export class Completer<T> {
  public readonly promise: Promise<T>;
  private _complete!: (value: (PromiseLike<T> | T)) => void;
  private reject!: (reason?: any) => void;
  public completed = false;

  public constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
        this._complete = resolve;
        this.reject = reject;
    })
  }

  public complete(value: (PromiseLike<T> | T)) : Completer<T> {
    this.completed = true;
    this._complete(value);
    return this;
  }
}

export function addContentAndProps(content: string, { addition, props }: { addition?: string, props?: Record<string, any> }) : string {
  const lines = content.split(/\r?\n/);
  const propRegex = /[a-zA-Z0-9-_]+:: [^:]+/;
  let propIndex = 1;
  for (let i = 1; i <= lines.length; i++) {
    propIndex = i;
    if (propRegex.test(lines[i])) break;
  }
  if (addition) {
    lines.splice(propIndex, 0, addition);
  }
  if (props) {
    for (let prop of Object.keys(props)) {
      const propDash = toDashCase(prop);
      if (!content.includes(`${propDash}::`)) {
        lines.push(`${propDash}:: ${props[prop]}`)
      }
    }
  }
  return lines.join('\n');
}
