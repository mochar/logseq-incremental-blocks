import React from "react";
import { Virtuoso } from "react-virtuoso";
import IbItem from "../widgets/IbItem";
import DatePicker from "react-datepicker";
import { todayMidnight } from "../utils/datetime";
import { queryDueIbs } from "../logseq/query";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { QueueIb, refreshDueIbs, removeRef, selectFilteredDueIbs, toggleRef } from "./learnSlice";
import * as theme from "../utils/theme";

export default function QueueView({ onLearn } : { onLearn: () => void }) {
  const [busy, setBusy] = React.useState<boolean>(false);
  const [queue, setQueue] = React.useState<QueueIb[]>([]);
  const [date, setDate] = React.useState<Date>(todayMidnight());
  const [showDatePicker, setShowDatePicker] = React.useState<boolean>(false);

  const dispatch = useAppDispatch();
  const refreshState = useAppSelector(state => state.learn.refreshState);
  const refreshDate = useAppSelector(state => state.learn.refreshDate);
  const dueIbs = useAppSelector(selectFilteredDueIbs);
  const refs = useAppSelector(state => state.learn.refs);

  React.useEffect(() => {
    if (refreshState == 'fulfilled' || refreshState == 'failed') {
      // Minutes since last refresh
      const diff = (new Date()).getTime() - refreshDate!.getTime();
      const minutesSinceLastRefresh = diff / (1000 * 60);

      const minutesThreshold = logseq.settings?.queueTimer as number ?? 1.;

      if (minutesSinceLastRefresh != null && minutesSinceLastRefresh > minutesThreshold) {
        refresh();
      } else {
        setQueue(dueIbs);
      }
    } else {
      setQueue(dueIbs);
    }
  }, []);

  React.useEffect(() => {
    if (refreshState == null) {
      refresh();
    } else if (refreshState == 'loading') {
      setBusy(true);
    } else {
      setBusy(false);
      setQueue(dueIbs);
    }
  }, [refreshState, dueIbs]);

  /*
   * Optional queueDate can be passed to show queue of given date.
   */
  async function refresh(queueDate?: Date) {
    setBusy(true);
    queueDate = queueDate ?? date;
    if (queueDate.getTime() == todayMidnight().getTime()) {
      await dispatch(refreshDueIbs());
      setQueue(dueIbs);
    } else {
      const refNames = refs.map((r) => r.name);
      const ibs = await queryDueIbs({ dueAt: queueDate, refs: refNames, includeOutdated: false });
      setQueue(ibs);
    }
    setBusy(false);
  }

  async function loadQueueDate(date: Date) {
    setDate(date);
    refresh(date);
  }

  function toggleDatePicker() {
    const show = !showDatePicker;
    setShowDatePicker(show);
    if (!show) {
      const d = todayMidnight();
      setDate(d);
      refresh(d);
    }
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
          className={`bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded ${queue.length == 0 && "cursor-not-allowed"}`}
          disabled={queue.length == 0}
          onClick={onLearn}
        >
          Learn 
        </button>

        <div>
          <button 
            className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 rounded`}
            onClick={toggleDatePicker}
          >
            📅
          </button>
          <button 
            className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-1 rounded`}
            onClick={() => refresh()}
          >
            🔄
          </button>
        </div>
      </div>

      <div className="flex justify-around mb-1">
        {showDatePicker && <DatePicker
          className={"border" + (showDatePicker ? 'block' : 'hidden')}
          selected={date}
          onChange={(date) => !busy && date && loadQueueDate(date)}
          minDate={busy ? date : todayMidnight()}
          maxDate={busy ? date : undefined}
          monthsShown={1}
          dateFormat="dd/MM/yyyy"
          inline
        />}
      </div>

      <hr className="dark:border-gray-800"></hr>

    {/* {refreshing && 
      <div className="text-neutral-500 flex justify-center">
        <span>Refreshing queue...</span>
      </div>
    } */}

    <RefFilter />

    {queueView}
    </div></fieldset></form>
  );
}

function RefFilter() {
  const refs = useAppSelector(state => state.learn.refs);
  const selectedRefs = useAppSelector(state => state.learn.selectedRefs);
  const filterMode = useAppSelector(state => state.learn.refFilterMode);
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
  <div className="p-2 space-y-1">
    {refButtons}
  </div>
  );
}