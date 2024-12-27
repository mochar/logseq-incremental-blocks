import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { selectInterval } from "./mainSlice";
import Select from "../widgets/Select";
import { equalities, Equality } from "../types";

export default function IntervalView() {
  const dispatch = useAppDispatch();
  const busy = useAppSelector(state => state.main.busy);
  const interval = useAppSelector(state => state.main.filters.interval);
  const equality = useAppSelector(state => state.main.filters.intervalEq);

  function intervalSelected(val: number | null) {
    if (val != null && (Number.isNaN(val) || val < 0)) return;
    dispatch(selectInterval({ interval: val }));
  }

  return (
    <div className="w-full">
      <label className="flex space-x-1 items-center" style={{width: 'max-content'}}>
        <input
          type="checkbox"
          checked={interval != null}
          onChange={() => dispatch(selectInterval({ interval: interval ? null : 1 }))}
          disabled={busy}
        />
        <span>Interval</span>
      </label>
      {interval && (
        <div className="flex space-x-1">
          <Select
            options={equalities}
            isSelected={s => (s as Equality) == equality}
            selected={s => dispatch(selectInterval({eq: s as Equality}))}
          />
          <div className="flex">
            <input
              className="border bg-transparent text-right p-0 w-20 border-[color:var(--ls-border-color)]"
              type="number" 
              value={interval}
              onChange={(e) => intervalSelected(parseFloat(e.target.value))}
              step="1"
            />
            <span>d</span>
          </div>
        </div>
      )}
    </div>
  );
}
