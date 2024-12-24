import React, { useEffect, useState } from "react";
import { useAppSelector } from "../state/hooks";
import { Virtuoso } from "react-virtuoso";
import { QueueIb } from "../types";
import IbItem from "../widgets/IbItem";
import { queryQueueIbs } from "../logseq/query";

export default function QueuePopover() {
  const queue = useAppSelector(state => state.learn.queue);
  const [qibs, setQibs] = useState<QueueIb[]>([]);

  async function loadMore() {
    if (qibs.length === queue.length) return;
    const uuids = queue.slice(qibs.length, qibs.length+20).map(i => i.uuid);
    const newQibs = await queryQueueIbs({ uuids, sortByPriority: true });
    setQibs([...qibs, ...newQibs]);
  }

  useEffect(() => {
    loadMore();
  }, []);
  
  return (
    <div className="p-1 space-y-1">
      <span>Da queue</span>
      {qibs.length > 0 &&
        <div className="border">
          <IbItem qib={qibs[0]} />          
        </div>
      }
      <Virtuoso
        style={{ height: 300, overflowX: 'clip' }}
        data={qibs.slice(1)}
        increaseViewportBy={200}
        endReached={loadMore}
        itemContent={(i, qib) => <IbItem qib={qib} />}
      ></Virtuoso>
    </div>
  );
}
