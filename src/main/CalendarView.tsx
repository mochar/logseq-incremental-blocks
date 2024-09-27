import React from "react";
import { QueueIb } from "../learn/learnSlice";
import { formatDate, todayMidnight } from "../utils/datetime";
import { useAppSelector } from "../state/hooks";
import * as theme from "../utils/theme";
import DatePicker from "react-datepicker";
import { queryDueIbs } from "../logseq/query";
import { Virtuoso } from "react-virtuoso";
import IbItem from "../widgets/IbItem";

export default function CalendarView() {
  const [busy, setBusy] = React.useState<boolean>(false);
  const [queue, setQueue] = React.useState<QueueIb[]>([]);
  const [date, setDate] = React.useState<Date>();
  const [showDatePicker, setShowDatePicker] = React.useState<boolean>(true);
  const refs = useAppSelector(state => state.learn.selectedRefs);

  async function loadQueue(queueDate?: Date) {
    queueDate = queueDate ?? date;
    if (!queueDate) return;
    setBusy(true);
    const refNames = refs.map((r) => r.name);
    // Only show outdated for today
    const ibs = await queryDueIbs({ 
      dueAt: queueDate, 
      refs: refNames, 
      includeOutdated: queueDate.getTime() == todayMidnight().getTime()
    });
    setQueue(ibs);
    setBusy(false);
  }

  async function loadQueueDate(date: Date) {
    setDate(date);
    loadQueue(date);
    setShowDatePicker(false);
  }

  let queueView;
  if (queue.length > 0) {
    queueView = (
      <div className="mt-1 w-full">
        <Virtuoso
          style={{ height: '380px', overflowX: 'clip' }}
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
  <div>
    <div className="flex justify-between items-center mb-1">
      <div>
        { date && queue
          ? <span>{queue.length} scheduled for {formatDate(date)}</span>
          : <span>View scheduled ibs at date</span>
        }
      </div>
      <div>
        <button 
          className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-1 rounded`}
          onClick={() => setShowDatePicker(!showDatePicker)}
        >
          📅
        </button>
      </div>
    </div>

    <hr className="dark:border-gray-800"></hr> 

    <div className="flex justify-around my-1">
      {showDatePicker && <DatePicker
        className={"border" + (showDatePicker ? 'block' : 'hidden')}
        selected={date}
        onChange={(date) => !busy && date && loadQueueDate(date)}
        minDate={busy ? date : todayMidnight()}
        maxDate={busy ? date : undefined}
        monthsShown={2}
        dateFormat="dd/MM/yyyy"
        inline
      />}
      {!showDatePicker && queueView}
    </div>      
  </div>
  );
}
