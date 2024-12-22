import React from "react";
import { Virtuoso } from "react-virtuoso";
import IbItem from "../widgets/IbItem";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { startLearning } from "./learnSlice";
import * as theme from "../utils/theme";
import { MainView, setMainView } from "../state/viewSlice";

export default function QueueView() {
  const dispatch = useAppDispatch();
  const busy = useAppSelector(state => state.main.busy);
  const queue = useAppSelector(state => state.learn.queue);

  function learn() {
    dispatch(startLearning());
  }

  let queueView;
  if (queue.length > 0) {
    queueView = (
    <div className="mt-1">
      <Virtuoso
        style={{ height: '250px', overflowX: 'clip' }}
        totalCount={queue.length}
        itemContent={(i) => IbItem({ qib: queue[i] })}
      ></Virtuoso>
    </div>
    );
  } else {
    queueView = (
      <div className="text-neutral-500 flex justify-center">
        <span>Queue is empty.</span>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
    <fieldset disabled={busy}>
    <div className={busy ? 'animate-pulse': ''}>

      <div className="flex justify-between mb-1">
        <button 
          className={`bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 border-b-2 border-blue-700 hover:border-blue-500 rounded ${queue.length == 0 && "cursor-not-allowed"}`}
          disabled={queue.length == 0}
          onClick={learn}
        >
           Learn ({queue.length})
        </button>

        <div>
          <button 
            className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-1 rounded`}
            onClick={() => dispatch(setMainView({ view: MainView.main }))}
          >
            🔙
          </button>
        </div>
      </div>

      <hr className="dark:border-gray-800"></hr>

      {queueView}
    </div></fieldset></form>
  );
}
