import React, { useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { gotBusy, refreshAll, selectInterval } from "./mainSlice";
import IbsView from "./IbsView";
import { startLearning } from "../learn/learnSlice";
import { queryIncrementalBlocks } from "../logseq/query";
import { db } from "../db";
import DueDateView from "./DueDateView";
import RefsView from "./RefsView";
import { EditorView, ModalView, setEditorView, setModalView } from "../state/viewSlice";
import IntervalView from "./IntervalView";
import { readFile } from "../import/Import";


export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const busy = useAppSelector((state) => state.main.busy);
  const totalDue = useAppSelector(state => state.main.totalDue);
  const collections = useAppSelector(state => state.main.collections);
  
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

  async function test() {
    dispatch(setEditorView({ view: EditorView.web }));    
  }

  return (
    <div
      id="ib-main"
      style={{ minHeight: '30rem' }}
      className="flex flex-col p-2 h-full space-y-3"
    >
      <div className="flex space-x-1 items-center">
        <button
          className="bg-primary/90 hover:bg-primary py-1 px-6 border-b-2 border-primary-700 hover:border-primary-500 rounded text-primary-foreground border"
          onClick={() => dispatch(startLearning('due'))}
          disabled={busy}
        >
          <span>Review { totalDue && totalDue > 0 && <span>({totalDue})</span> }</span>
        </button>

        <button onClick={test}>Test</button>

        <SelectionActions />
       
        <div className="flex-1"></div>

        <button
          className="hover:bg-secondary border px-1 rounded"
          onClick={() => dispatch(setModalView({ view: ModalView.import }))}
          disabled={busy}
        >
          <i className={`ti ti-download`}></i>          
        </button>
        
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
          <IntervalView />
          <RefsView />
        </div>
        <div className="w-full h-full" style={{flex: "4 1 0%"}}>
          <IbsView />
        </div>
      </div>
    </div>
  );
}

function SelectionActions() {
  const dispatch = useAppDispatch();
  const busy = useAppSelector((state) => state.main.busy);
  const collections = useAppSelector(state => state.main.collections);
  const totalIbs = useMemo(() => collections.reduce((s, c) => s + c.count, 0), [collections]);

  if (totalIbs == 0) return <></>;

 return (
    <>
      <div className="w-1 border h-full m-2"></div>
      <span>Subset selection: {totalIbs}</span>
            
      <button
        className="hover:bg-secondary py-1 px-2 border-b-2 border-secondary-700 hover:border-secondary-500 rounded border"
        onClick={() => dispatch(startLearning('subset'))}
        disabled={busy}
      >
        <span>Review</span>
      </button>
        
      <button
        className="hover:bg-secondary py-1 px-1 border-secondary-700 hover:border-secondary-500 rounded border"
        onClick={() => dispatch(setModalView({ view: ModalView.ibActions }))}
        disabled={busy}
      >
        <span>Postpone</span>
      </button>
    </>
 );
}
