import React from "react";
import { addDays, dateDiffInDays, formatDate, todayMidnight } from "../utils/datetime";
import * as theme from "../utils/theme";

interface Scheduled {
  intervalToday: number,
  intervalPrevious?: number,
  date: Date,
}

interface IScheduleView {
  multiplier: number,
  interval: number,
  dueDate: Date,
  nDays: number
}

export default function ScheduleView({ multiplier, interval, dueDate, nDays }: IScheduleView) {

  const schedule = React.useMemo(() : Scheduled[] => {
    const schedule : Scheduled[] = [];

    // First the interval from now to due date, which may differ from interval.
    const today = todayMidnight();
    let diff = dateDiffInDays(today, dueDate);
    schedule.push({ intervalToday: diff, date: dueDate });
    if (diff < 0) { // past due date
      return schedule;
    }

    // Then the scheduled review dates after the due date
    let _interval = interval;
    let _due = new Date(dueDate);
    for (let i = 0; i < nDays; i++) {
      diff = diff + _interval;
      _due = addDays(_due, diff);
      schedule.push({ intervalToday: diff, intervalPrevious: _interval, date: _due });
      _interval = Math.ceil(_interval * multiplier);
    }
    return schedule;
  }, [multiplier, interval, dueDate]);

  const scheduleWidgets = schedule.map((scheduled) => ScheduledWidget({ scheduled }));

  return (
    <>{scheduleWidgets}</>
  );
}

function ScheduledWidget({ scheduled }: { scheduled: Scheduled }) {
  return (
  <div className="flex flex-col">
    { scheduled.intervalPrevious != undefined && 
    <div className={`${theme.TXT_MUTED} flex items-center justify-center py-1`}>
      <span style={{ fontSize: '1.25rem' }}>↓</span> 
      <span>({scheduled.intervalPrevious}d)</span> 
    </div>}
    <div className={`flex justify-between px-1 rounded-lg ${theme.BORDER}`}>
      <span className="mr-1">{formatDate(scheduled.date)}</span>
      <span className={`${theme.TXT_MUTED}`}>({scheduled.intervalToday}d)</span>
    </div>
  </div>
  );
}
