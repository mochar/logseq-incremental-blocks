import React, { useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { gotBusy, refreshAll } from "./mainSlice";
import IbsView from "./IbsView";
import { startLearning } from "../learn/learnSlice";
import { queryIncrementalBlocks } from "../logseq/query";
import { db } from "../db";
import DueDateView from "./DueDateView";
import RefsView from "./RefsView";

export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const busy = useAppSelector((state) => state.main.busy);
  const totalDue = useAppSelector(state => state.main.totalDue);
  const collections = useAppSelector(state => state.main.collections);
  const totalIbs = useMemo(() => collections.reduce((s, c) => s + c.count, 0), [collections]);
  
  React.useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    await dispatch(refreshAll());
  }

  async function importToDb() {
    dispatch(gotBusy(true));
    try {
      const ibs = await queryIncrementalBlocks();
      await Promise.all([ibs.forEach(async (ib) => {
        console.log(ib.uuid);
        const block = await logseq.Editor.getBlock(ib.uuid);
        if (block) {
          //          await logseq.Editor.upsertBlockProperty(block, 'id', ib.uuid);
          await logseq.Editor.updateBlock(block.uuid, block.content, {properties: {id: ib.uuid}});
        }
      })]);
      await db.ibs.bulkAdd(ibs);
    } catch (e) {
      console.error(e);
    } finally {
      dispatch(gotBusy(false));
    }
  }

  return (
    <div
      id="ib-main"
      style={{ minHeight: '30rem' }}
      className="flex flex-col p-2 h-full space-y-3"
    >
      <div className="flex space-x-1">
        <button
          className="bg-primary/90 hover:bg-primary py-1 px-6 border-b-2 border-primary-700 hover:border-primary-500 rounded text-primary-foreground border"
          onClick={() => dispatch(startLearning('due'))}
          disabled={busy}
        >
          <span>Review { totalDue && <span>({totalDue})</span> }</span>
        </button>

        <button
          className="hover:bg-secondary py-1 px-2 border-b-2 border-secondary-700 hover:border-secondary-500 rounded border"
          onClick={() => dispatch(startLearning('subset'))}
          disabled={busy}
        >
          <span>Subset review ({ totalIbs })</span>
        </button>

        
        <div className="flex-1"></div>
        
        <button
          className="hover:bg-secondary border px-1 rounded"
          onClick={refresh}
          disabled={busy}
        >
          <i className={`ti ti-refresh`}></i>          
        </button>
      </div>

      <div className="h-full flex space-x-2" ref={ref}>
        <div className="flex flex-col px-2.5 space-y-4" style={{flex: "2 1 0%"}}>
          <DueDateView />          
          <RefsView />
        </div>
        <div className="w-full h-full" style={{flex: "4 1 0%"}}>
          <IbsView />
        </div>
      </div>
    </div>
  );
}
