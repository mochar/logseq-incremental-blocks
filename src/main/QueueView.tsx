import React from "react";
import { getUserRefs, RefFilterMode, refFilterModes, refsSelected, removeRef, selectFilteredDueIbs, startLearning, setRefFilterMode, toggleRef, TypeFilter, typeFilters, typeFilterSelected, refreshLearn } from "../learn/learnSlice";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import * as theme from "../utils/theme";
import { Virtuoso } from "react-virtuoso";
import IbItem from "../widgets/IbItem";
import { setView, ViewType } from "../state/viewSlice";
import Select from "../widgets/Select";
import { capitalize } from "../utils/utils";
import RefButton from "../widgets/RefButton";

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
      dispatch(refreshLearn()),
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

    {queue.length > 0 &&
      <div className="mt-2 flex items-center justify-between">
        <span>{queue.length} ibs</span>
        <button
          className={`self-end bg-blue-500 hover:bg-blue-400 text-white py-1 px-6 border-b-2 border-blue-700 hover:border-blue-500 rounded ${queue.length == 0 && "cursor-not-allowed"}`}
          disabled={queue.length == 0}
          onClick={learn}
        >
           Learn
        </button>
      </div>}
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
    return (
      <RefButton
        key={r.id}
        label={r.name}
        selected={selected}
        onClick={() => dispatch(toggleRef(r.name))}
      />);
  });

  return (
  <div className="p-1 space-y-1 bg-gray-50 dark:bg-gray-800 border rounded">
    {refButtons}
  </div>
  );
}
