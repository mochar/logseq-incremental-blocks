import React from "react";
import * as theme from "../utils/theme";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { manuallyScheduled, Popover, popoverVisible } from "./learnSlice";
import { addDays, formatDate, todayMidnight } from "../utils/datetime";

export default function ScheduleComponent() {
  const dispatch = useAppDispatch();
  const currentIbData = useAppSelector(state => state.learn.current);

  function updateManualInterval(val: number | null) {
    if (val != null && (Number.isNaN(val) || val <= 0)) return;
    dispatch(manuallyScheduled(val));
  }

  if (!currentIbData) return <></>;

  const nextDue = addDays(todayMidnight(), currentIbData.newInterval);

  return (
    <div
      className="flex border px-1 hover:bg-secondary"
      style={{ borderWidth: '0px 1px 0px 1px' }}
      onMouseEnter={() => dispatch(popoverVisible(Popover.schedule))}
    >
      <div className="self-center flex items-center space-x-1">
        <span>{formatDate(new Date(nextDue))}</span>

        <div>
          <input
            className="border bg-transparent text-right p-0 w-10 border-[color:var(--ls-border-color)]"
            type="number" 
            value={currentIbData.newInterval}
            onChange={(e) => updateManualInterval(parseFloat(e.target.value))}
            min="1" 
            step="1"
          />
          <span>d</span>
        </div>

        {currentIbData.manualInterval &&
          <button
            className={`${theme.BORDER} ${theme.BG.hover} text-neutral-600`}
            onClick={() => updateManualInterval(null)}
          >
            <span>⮌</span>
          </button>
        }
      </div>
    </div>
  );
}
