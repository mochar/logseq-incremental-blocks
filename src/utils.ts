import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import { LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";
import removeMarkdown from 'remove-markdown';

let _visible = logseq.isMainUIVisible;

function subscribeLogseqEvent<T extends LSPluginUserEvents>(
  eventName: T,
  handler: (...args: any) => void
) {
  logseq.on(eventName, handler);
  return () => {
    logseq.off(eventName, handler);
  };
}

const subscribeToUIVisible = (onChange: () => void) =>
  subscribeLogseqEvent("ui:visible:changed", ({ visible }) => {
    _visible = visible;
    onChange();
  });

export const useAppVisible = () => {
  return React.useSyncExternalStore(subscribeToUIVisible, () => _visible);
};

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
  console.log(content);
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