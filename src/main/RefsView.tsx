import { useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import useCalculateHeight from "../hooks/useCalculateHeight";
import React from "react";
import { toggleRef, toggleRefMode } from "./mainSlice";

export default function RefsView() {
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLDivElement>(null);
  const height = useCalculateHeight(ref.current);
  const busy = useAppSelector(state => state.main.busy);
  const all = useAppSelector(state => state.main.refs);
  const selected = useAppSelector(state => state.main.filters.refs ?? []);
  const unselected = useMemo(() => {
    const selectedIds = selected.map(r => r.id);
    return all.filter(r => !selectedIds.includes(r.id));
  }, [all, selected]);
  const filterMode = useAppSelector(state => state.main.filters.refsMode);

  const selectedView = (
    <div className="flex-wrap space-y-1">
      {selected.map(ref => (
        <button
          key={ref.id}
            className="text-left bg-secondary rounded px-1 border mr-1"
            onClick={() => dispatch(toggleRef(ref))}
          >
            {ref.name}
          </button>
      ))}
      <hr />
    </div>
  );
  
  return (
    <div className="h-full">
      <div className="flex">
        <span>Tags</span>
        <button
          className="hover:bg-secondary rounded w-9 ml-auto"
          onClick={() => dispatch(toggleRefMode())}
        >
          <span className="font-medium text-sm" style={{letterSpacing: '-0.05em'}}>
            {filterMode.toUpperCase()}
          </span>
        </button>
      </div>
      <hr className="m-0" />
      {selected.length > 0 && selectedView}
      <div ref={ref}>
        <ul className="overflow-y-scroll m-0" style={{ height: height-10, minHeight: 100 }}>
          {unselected.map(ref => (
            <li key={ref.id}>
              <button
                className="text-left w-full hover:bg-secondary"
                onClick={() => dispatch(toggleRef(ref))}
              >
                {ref.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
