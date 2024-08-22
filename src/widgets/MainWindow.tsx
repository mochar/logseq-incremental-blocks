import React, { useRef } from "react";
import LearnView from "../learn/LearnView";
import QueueView from "../learn/QueueView";
import { logseq as PL } from "../../package.json";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { startLearning, stopLearning } from "../learn/learnSlice";

export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  const dueIbs = useAppSelector(state => state.learn.dueIbs);
  const learning = useAppSelector(state => state.learn.learning);

  function toggleLearning(state?: boolean) {
    const newLearning = state == undefined ? !learning : state;
    if (newLearning) {
      dispatch(startLearning());
    } else {
      dispatch(stopLearning());
    }

    const color = newLearning ? 'hotpink' : 'dimgrey';
    logseq.provideStyle(`
      #${PL.id} {
        color: ${color};
      }
    `);

    refreshIbMacro();
  }

  async function refreshIbMacro() {
    // Refresh the macro to add/remove the "next rep" button.
    // This is hacky. Should probably use macro.ts/onMacroSlotted
    // but this requires slot id and I dont know how to get it rn.
    if (dueIbs.length > 0) {
      const uuid = dueIbs[0].uuid;
      await logseq.Editor.editBlock(uuid);
      await logseq.Editor.exitEditingMode();
    }
  }

  return (
    <div 
      ref={ref} 
      id="ib-main" 
      className="absolute top-10 right-10 bg-white rounded-lg p-2 w-96 border border-gray-400 rounded shadow flex flex-col text-sm"
    >
      {!learning && <QueueView onLearn={() => toggleLearning(true)}></QueueView>}
      {learning && <LearnView offLearn={() => toggleLearning(false)}></LearnView>}
    </div>
  );
}