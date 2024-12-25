import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { addDays, dateDiffInDays, todayMidnight } from "../utils/datetime";
import { selectDueDate } from "./mainSlice";
import React from "react";
import Select from "../widgets/Select";
import { equalities, Equality } from "../types";
import DatePicker from "react-datepicker";

export default function DueDateView() {
  const dispatch = useAppDispatch();
  const date = useAppSelector(state => state.main.filters.dueDate);
  const equality = useAppSelector(state => state.main.filters.dueDateEq);
  const busy = useAppSelector(state => state.main.busy);
  const days = useMemo(
    () => date ? dateDiffInDays(todayMidnight(), new Date(date)) : 1,
    [date]);

  async function dateSelected(date: Date | null) {
    if (busy) return;
    dispatch(selectDueDate({date}));
  }

  function daysSelected(val: number | null) {
    if (val != null && Number.isNaN(val)) return;
    const date = addDays(todayMidnight(), val!);
    dateSelected(date);
  }

  return (
    <div className="w-full">
      <label className="flex space-x-1 items-center" style={{width: 'max-content'}}>
        <input
          type="checkbox"
          checked={date != null}
          onChange={() => dateSelected(date ? null : todayMidnight())}
          disabled={busy}
        />
        <span>Due</span>
      </label>
      {date && (
        <div className="flex space-x-1">
          <Select
            options={equalities}
            isSelected={s => (s as Equality) == equality}
            selected={s => dispatch(selectDueDate({eq: s as Equality}))}
          />
          <DatePicker
            className="p-0 border border-[color:var(--ls-border-color)] w-full"
            selected={date}
            onChange={dateSelected}
            minDate={busy ? date ?? undefined : todayMidnight()}
            maxDate={busy ? date ?? undefined : undefined}
            monthsShown={1}
            disabled={busy}
            dateFormat="dd/MM/yyyy"
          />
          <div className="flex">
            <input
              className="border bg-transparent text-right p-0 w-10 border-[color:var(--ls-border-color)]"
              type="number" 
              value={days}
              onChange={(e) => daysSelected(parseFloat(e.target.value))}
              step="1"
            />
            <span>d</span>
          </div>
        </div>
      )}
    </div>
  );
}
