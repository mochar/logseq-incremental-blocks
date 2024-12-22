import React, { useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import * as theme from "../utils/theme";
import { refreshCollections, selectDueDate, toggleRef } from "./mainSlice";
import IbsView from "./IbsView";
import DatePicker from "react-datepicker";
import { todayMidnight } from "../utils/datetime";

export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const busy = useAppSelector((state) => state.main.busy);
  const collections = useAppSelector(state => state.main.collections);
  const totalIbs = useMemo(() => collections.reduce((s, c) => s + c.count, 0), [collections]);
  
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
          <button
            className={`bg-blue-500 hover:bg-blue-400 text-white py-1 px-6 border-b-2 border-blue-700 hover:border-blue-500 rounded`}
            onClick={() => {}}
          >
             Review ({totalIbs})
          </button>

          <DueDateView />                    
          <RefsView />
        </div>
        <div className="w-full h-full" style={{flex: "4 1 0%"}}>
          <IbsView />
        </div>
      </div>
    </div>
  );
}

function RefsView() {
  const dispatch = useAppDispatch();
  const busy = useAppSelector(state => state.main.busy);
  const all = useAppSelector(state => state.main.refs);
  const selected = useAppSelector(state => state.main.selectedRefs);
  const unselected = useMemo(() => {
    const selectedIds = selected.map(r => r.id);
    return all.filter(r => !selectedIds.includes(r.id));
  }, [all, selected]);

  const selectedView = (
    <>
      <ul>
        {selected.map(ref => (
          <li key={ref.id}>
            <button
              className="text-left w-full"
              onClick={() => dispatch(toggleRef(ref))}
            >
              {ref.name}
            </button>
          </li>
        ))}
      </ul>
      <hr />
    </>
  );
  
  return (
    <div className="h-full">
      <p>Tags</p>
      <hr />
      {selected.length > 0 && selectedView}
      <ul className="overflow-y-scroll" style={{ maxHeight: "70%" }}>
        {unselected.map(ref => (
          <li key={ref.id}>
            <button
              className="text-left w-full"
              onClick={() => dispatch(toggleRef(ref))}
            >
              {ref.name}
            </button>
          </li>
        ))}
      </ul>
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
      <label className="flex space-x-1">
        <input
          type="checkbox"
          checked={date != null}
          onChange={() => dateSelected(date ? null : todayMidnight())}
          disabled={busy}
        />
        <span>Due</span>
      </label>
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
