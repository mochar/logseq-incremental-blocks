import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { getPriorityUpdates, postponeRep } from "./learnSlice";

export default function PostponePopover() {
  const dispatch = useAppDispatch();
  const currentIbData = useAppSelector(state => state.learn.current);
  const [interval, setInterval] = useState<number>(currentIbData?.newInterval ?? 1);

  async function postpone() {
    await dispatch(postponeRep({ interval }));
    await dispatch(getPriorityUpdates());
  }
  
  if (!currentIbData) return <></>;
  
  return (
    <div className="p-1">
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
          className="border px-1"
          style={{
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--secondary))"
          }}
          onClick={postpone}
        >
           Postpone
        </button>
      </div>
    </div>
  );
}
