import React, { useRef } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import * as theme from "../utils/theme";
import { refreshCollections, selectDueDate } from "./mainSlice";
import IbsView from "./IbsView";
import DatePicker from "react-datepicker";
import { todayMidnight } from "../utils/datetime";

export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const busy = useAppSelector((state) => state.main.busy);

  React.useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    await dispatch(refreshCollections());
  }

  return (
    <div
      id="ib-main"
      style={{ minHeight: '30rem' }}
      className={`flex flex-col p-2 h-full ${theme.TXT}`}
    >
      <div>
      </div>

      <div className="h-full flex space-x-2" ref={ref}>
        <div className="flex flex-col px-2.5 space-y-4" style={{flex: "2 1 0%"}}>
          <DueDateView />          
          
          <span>Tags</span>
        </div>
        <div className="w-full h-full" style={{flex: "4 1 0%"}}>
          <IbsView />
        </div>
      </div>
    </div>
  );
}

function DueDateView() {
  const dispatch = useAppDispatch();
  const date = useAppSelector(state => state.main.dueDate);
  const busy = useAppSelector(state => state.main.busy);

  async function dateSelected(date: Date | null) {
    if (busy) return;
    dispatch(selectDueDate(date));
  }
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline">
        <span>Due</span>
        {date && <a className="text-sm" onClick={() => dateSelected(null)}>All</a>}
      </div>
      <DatePicker
        className={`${theme.BORDER} bg-transparent grow`}
        selected={date}
        onChange={dateSelected}
        minDate={busy ? date ?? undefined : todayMidnight()}
        maxDate={busy ? date ?? undefined : undefined}
        monthsShown={1}
        disabled={busy}
        dateFormat="dd/MM/yyyy"
      />
    </div>
  );
}
