import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { postponeSelected } from "./mainSlice";
import { setModalView } from "../state/viewSlice";

export default function Postpone() {
  const dispatch = useAppDispatch();
  const [start, setStart] = useState<number>(0);
  const [end, setEnd] = useState<number>(10);
  const busy = useAppSelector(state => state.main.busy);

  async function postpone() {
    await dispatch(postponeSelected(start, end));
    dispatch(setModalView(null));
  }
  
  return (
    <div>
      <p>Postpone review randomly between the following range:</p>
      <div className="flex space-x-2 items-center">
        <div className="flex">
          <input
            className="border bg-transparent text-right p-0 w-20 border-[color:var(--ls-border-color)]"
            type="number" 
            value={start}
            onChange={(e) => setStart(parseFloat(e.target.value))}
            step="1"
            disabled={busy}
          />
          <span>d</span>
        </div>

        <span>-</span>
        
        <div className="flex">
          <input
            className="border bg-transparent text-right p-0 w-20 border-[color:var(--ls-border-color)]"
            type="number" 
            value={end}
            onChange={(e) => setEnd(parseFloat(e.target.value))}
            step="1"
            disabled={busy}
          />
          <span>d</span>
        </div>

        <button
          className="bg-primary/90 hover:bg-primary py-1 px-1 border-primary-700 hover:border-primary-500 rounded text-primary-foreground border self-end"
          style={{ marginLeft: 'auto' }}
          onClick={postpone}
          disabled={busy}
        >
          <span>Postpone</span>
        </button>
      </div>
    </div>
  );
}
