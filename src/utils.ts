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
