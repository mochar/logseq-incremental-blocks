import React from "react";
import { nextInterval } from "../algorithm/scheduling";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import * as theme from "../utils/theme";
import { getPriorityUpdates, manualIntervention, postponeRep } from "./learnSlice";
import { addDays, dateDiffInDays, formatDate, todayMidnight } from "../utils/datetime";
import DatePicker from "react-datepicker";

export default function ScheduleComponent({ setBusy }: { setBusy: (busy: boolean) => void }) {
  const dispatch = useAppDispatch();
  const currentIbData = useAppSelector(state => state.learn.current!);

  const interval = React.useMemo(() => {
    if (!currentIbData) return undefined;
    return currentIbData.manualInterval ?? nextInterval(currentIbData.ib);
  }, [currentIbData]);

  function updateManualInterval(val: number | null) {
    dispatch(manualIntervention({ interval: val }))
  }

  async function postpone() {
    setBusy(true);
    await dispatch(postponeRep({ interval: interval! }));
    await dispatch(getPriorityUpdates());
    setBusy(false);
  }

  const currentIb = currentIbData.ib;
  const scheduleManually = Boolean(currentIbData.manualInterval);
  let nextDue = todayMidnight();
  if (interval) {
    nextDue = addDays(nextDue, interval);
  }

  return (
  <div className="py-2 pt-1">

    <div className="flex items-center justify-between">
      <p>Schedule</p>
      <p>
        {scheduleManually && <span className="text-neutral-600 dark:text-neutral-300">
          manual
          <button
          className={`button ${theme.BORDER} ${theme.BG.hover}`}
          onClick={() => updateManualInterval(null)}
          >
            <span>⮌</span>
          </button>
        </span>
        }
      </p>
    </div>

    <div className="flex items-center justify-between">
      <p className={`${theme.BORDER} grow`}>
        {formatDate(currentIb.dueDate!)}
      </p>
      <p className="text-neutral-400 px-2">🠲</p>
      <DatePicker
        className={`${theme.BORDER} bg-transparent grow`}
        selected={nextDue}
        onChange={(date) => date && updateManualInterval(dateDiffInDays(todayMidnight(), date))}
        minDate={addDays(new Date(), 1)}
        monthsShown={1}
        dateFormat="dd/MM/yyyy"
      />
    </div>

    <div className="flex items-center py-1">
      <span>Interval</span>
      <input
        className={`${theme.BORDER} bg-transparent px-2`} 
        type="number" 
        value={interval}
        onChange={(e) => updateManualInterval(parseFloat(e.target.value))}
        min="1" 
        step="1"
      >
      </input>
      <div className="grow"></div>
      <button
        className={`${theme.BORDER} ${theme.BG.hover} px-1`}
        onClick={postpone}
      >
        Postpone
      </button>
    </div>

  </div>
  );
}
