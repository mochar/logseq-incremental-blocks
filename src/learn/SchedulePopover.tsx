import React from "react";
import DatePicker from "react-datepicker";
import { addDays, dateDiffInDays, formatDate, todayMidnight } from "../utils/datetime";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { manuallyScheduled } from "./learnSlice";
import ScheduleView from "../widgets/ScheduleView";

export default function SchedulePopover() {
  const dispatch = useAppDispatch();
  const currentIbData = useAppSelector(state => state.learn.current);

  function updateManualInterval(date: Date | null) {
    if (!date) return;
    const interval = dateDiffInDays(todayMidnight(), date);
    dispatch(manuallyScheduled(interval));
  }
  
  if (!currentIbData) return <></>;

  const scheduling = currentIbData.ib.scheduling!;

  const nextDue = addDays(todayMidnight(), currentIbData.newInterval);
  
  return (
    <div className="p-1">
      <span>Schedule</span>

      <div className="flex space-x-2">
        <div>
          <div className="flex items-center justify-between">
            <p className="border grow">
              {formatDate(new Date(scheduling.dueDate))}
            </p>
            <p className="text-neutral-400 px-2">🠲</p>
            <p className="border grow">
              {formatDate(nextDue)}
            </p>
          </div>
    
          <div>
            <DatePicker
              className="border block grow"
              selected={nextDue}
              onChange={updateManualInterval}
              minDate={addDays(new Date(), 1)}
              monthsShown={1}
              dateFormat="dd/MM/yyyy"
              inline
            />
          </div>
        </div>

        <div className="text-sm">
          <ScheduleView
            multiplier={scheduling.multiplier}
            interval={scheduling.interval}
            dueDate={nextDue}
            nDays={4}
          />
        </div>
      </div>      
    </div>
  );
}
