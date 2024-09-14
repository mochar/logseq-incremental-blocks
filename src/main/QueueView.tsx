import React from "react";
import { getUserRefs, RefFilterMode, refFilterModes, refreshDueIbs, refsSelected, removeRef, selectFilteredDueIbs, startLearning, setRefFilterMode, toggleRef, TypeFilter, typeFilters, typeFilterSelected } from "../learn/learnSlice";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import * as theme from "../utils/theme";
import { Virtuoso } from "react-virtuoso";
import IbItem from "../widgets/IbItem";
import { setView, ViewType } from "../state/viewSlice";
import Select from "../widgets/Select";
import { capitalize } from "../utils/utils";

export default function QueueView() {
  const dispatch = useAppDispatch();
  const refreshState = useAppSelector(state => state.learn.refreshState);
  const refreshDate = useAppSelector(state => state.learn.refreshDate);
  const typeFilter = useAppSelector(state => state.learn.typeFilter);
  const refFilterMode = useAppSelector(state => state.learn.refFilterMode);
  const queue = useAppSelector(selectFilteredDueIbs);

  React.useEffect(() => {
    if (refreshState == 'fulfilled' || refreshState == 'failed') {
      // Minutes since last refresh
      const diff = (new Date()).getTime() - refreshDate!.getTime();
      const minutesSinceLastRefresh = diff / (1000 * 60);

      const minutesThreshold = logseq.settings?.queueTimer as number ?? 1.;

      if (minutesSinceLastRefresh != null && minutesSinceLastRefresh > minutesThreshold) {
        refresh();
      }
    } else if (refreshState == null) {
      refresh();
    }
  }, []);

  async function refresh() {
    await Promise.all([
      dispatch(refreshDueIbs()),
      dispatch(getUserRefs()),
    ]);
  }

  function learn() {
    dispatch(startLearning());
    dispatch(setView({ type: ViewType.learn }));
  }

  function check() {
    dispatch(setView({ type: ViewType.learn }));
  }

  function refFilterModeSelected(filterMode: string) {
    dispatch(setRefFilterMode(filterMode as RefFilterMode));
    if (filterMode == 'off') dispatch(refsSelected([]));
  }

  let queueView;
  if (queue.length > 0) {
    queueView = (
    <div className="mt-1">
      <Virtuoso
        style={{ height: '380px', overflowX: 'clip' }}
        totalCount={queue.length}
        itemContent={(i) => IbItem({ qib: queue[i] })}
      ></Virtuoso>
    </div>
    );
  } else {
    queueView = (
      <div className="text-neutral-500 flex justify-center mt-2">
        <span>Queue is empty</span>
      </div>
    );
  }

  return (
  <div className="flex flex-col h-full"> 
    <div className="flex justify-between mb-1">
      <div className="flex space-x-2">
        <Select
          options={typeFilters}
          isSelected={(f) => f == typeFilter}
          selected={(f) => dispatch(typeFilterSelected(f as TypeFilter))}
          textBuilder={capitalize}
        ></Select>
        <span className="text-xs pl-1">Ref filter</span>
        <Select
          options={refFilterModes}
          isSelected={(f) => f == refFilterMode}
          selected={refFilterModeSelected}
          textBuilder={capitalize}
        ></Select>
      </div>

      <div>
        <button 
          className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-1 rounded`}
          onClick={() => check()}
        >
          👁️ Preview
        </button>
        <button 
          className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-1 rounded`}
          onClick={() => refresh()}
        >
          🔄 Refresh
        </button>
      </div>
    </div>

    {refFilterMode != 'off' && <RefFilter />}

    {queueView}

    <div className="grow"></div>

    {queue.length > 0 && <button 
        className={`self-end bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded ${queue.length == 0 && "cursor-not-allowed"}`}
        disabled={queue.length == 0}
        onClick={learn}
      >
        Learn 
    </button>}
  </div>
  );
}


function RefFilter() {
  const refs = useAppSelector(state => state.learn.refs);
  const selectedRefs = useAppSelector(state => state.learn.selectedRefs);
  const dispatch = useAppDispatch();

  if (refs.length == 0) return <></>;

  const refButtons = refs.map((r) => {
    const selected = selectedRefs.includes(r);
    const classes = selected ? 'bg-gray-200 ring-1 ring-offset-1 ring-gray-500' : '';
    return (
      <span 
        key={r.id}
        className={"inline-flex items-center text-xs px-2 py-1 me-2 font-medium text-gray-900 bg-gray-100 rounded hover:bg-gray-200 hover:text-gray-900" + classes}
      >
        <button 
          type="button" 
          onClick={() => dispatch(toggleRef(r.name))} 
          className="inline-flex items-center text-xs bg-transparent rounded-sm hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {r.name}
        </button>
        <button type="button" onClick={() => dispatch(removeRef(r.name))} className="inline-flex items-center p-1 ms-2 text-xs text-gray-400 bg-transparent rounded-sm hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-300">
          <svg className="w-2 h-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
        </button>
      </span>
    );
  });

  return (
  <div className="p-1 space-y-1 bg-gray-50 dark:bg-gray-800 border rounded">
    {refButtons}
  </div>
  );
}