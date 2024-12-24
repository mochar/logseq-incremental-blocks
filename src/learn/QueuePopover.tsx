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
    <div className="p-1">
      <span>Da queue</span>
      <Virtuoso
        style={{ height: '380px', overflowX: 'clip' }}
        data={qibs}
        increaseViewportBy={200}
        endReached={loadMore}
        itemContent={(i) => <IbItem qib={qibs[i]} />}
      ></Virtuoso>
    </div>
  );
}
