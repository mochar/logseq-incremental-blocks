import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import { LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";

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

export async function queryIncrementalBlocks(): Promise<BlockEntity[]> {
  // TODO: Figure out this sorting query
  const ret = await logseq.DB.datascriptQuery(`
  [
    :find (pull ?b [*])
    :where
      [?b :block/properties ?prop]
      [(get ?prop :ib-sample) ?priority-str]
    :result-transform (fn [result]
      (sort-by 
        ; (fn [d] (get-in d [:block/properties :ib-sample]))
        (fn [d] 
          (* 1 (get-in d [:block/properties :ib-sample]))
        )
        result
      )
    )
  ]
  `)
  let bs = (ret || []).flat() as BlockEntity[];
  for (let b of bs) {
    for (let p of ['ib-a', 'ib-b', 'ib-sample']) {
      //@ts-ignore
      b.properties[p] = parseFloat(b.properties[p]);
    }
  }
  return bs;
}

// https://stackoverflow.com/questions/3224834/get-difference-between-2-dates-in-javascript
export function dateDiffInDays(a: Date, b: Date) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}