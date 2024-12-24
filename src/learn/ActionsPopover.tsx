import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { doneRep, getPriorityUpdates, postponeRep } from "./learnSlice";

export default function ActionsPopover() {
  const dispatch = useAppDispatch();
  const currentIbData = useAppSelector(state => state.learn.current);
  const [interval, setInterval] = useState<number>(currentIbData?.newInterval ?? 1);

  async function postpone() {
    await dispatch(postponeRep({ interval }));
    await dispatch(getPriorityUpdates());
  }
  
  if (!currentIbData) return <></>;
  
  return (
    <div className="p-1 space-y-2">
      <div>
        <div className="flex items-center justify-center space-x-1">
          <div>
            <input
              className="border bg-transparent text-right p-0 w-10 border-[color:var(--ls-border-color)]"
              type="number"
              value={interval}
              onChange={(e) => setInterval(parseFloat(e.target.value))}
              min="1" 
              step="1"
            />
            <span>d</span>
          </div>
          <div className="grow"></div>
          <button
            className="border border-b-2 px-1 grow hover:bg-secondary space-x-1"
            style={{borderBottomWidth: 3}}
            onClick={postpone}
          >
            <i className="ti ti-player-skip-forward"></i>
            <span>Postpone</span>
          </button>
        </div>
      </div>

      <div className="border"></div>

      <div>
        <button
          className="border border-b-2 px-1 w-full hover:bg-secondary space-x-1"
          style={{borderBottomWidth: 3}}
          onClick={() => dispatch(doneRep())}
        >
          <i className="ti ti-circle-check"></i>
          <span>Mark as done</span>
        </button>
      </div>
    </div>
  );
}
