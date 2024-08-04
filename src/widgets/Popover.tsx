import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import Beta from "../algorithm/beta";
import IncrementalBlock from "../IncrementalBlock";

import "react-datepicker/dist/react-datepicker.css";
import { dateDiffInDays, todayMidnight } from "../utils";
import { betaFromMean } from "../algorithm/priority";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import BetaGraph from "./BetaGraph";
import PrioritySlider from "./PrioritySlider";
import { GLOBALS } from "../globals";

export default function Popover({ block, slot }: { block: BlockEntity, slot: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [priorityOnly, setPriorityOnly] = useState<boolean>(true);
  const baseBeta = useRef<Beta>();
  const [beta, setBeta] = useState<Beta>();
  const [dueDate, setDueDate] = useState<Date>();
  const [multiplier, setMultiplier] = useState<number>(2.);
  const [interval, setInterval] = useState<number>();
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    // Set position above bar
    const div = top?.document.getElementById(slot);
    // if (!div) return;
    if (div) {
      const elemBoundingRect = div.getBoundingClientRect();
      ref.current!.style.top = `${elemBoundingRect.top - (ref.current?.clientHeight ?? 0) - 10}px`;
      ref.current!.style.left = `${elemBoundingRect.left}px`;
    }

    // Block properties
    const ib = IncrementalBlock.fromBlock(block);
    const priorityOnly = ib.reps == null;
    setPriorityOnly(priorityOnly);

    const beta = ib.beta ?? new Beta(1, 1);
    setBeta(beta);
    // TODO this should later be fleshed out more.
    baseBeta.current = ib.reps == 0 ? new Beta(1, 1) : beta;

    if (!priorityOnly) {
      if (ib.dueDate) {
        setDueDate(ib.dueDate);
      } else {
        updatePriority({ mean: beta.mean });
      }
      if (ib.interval) setInterval(ib.interval);
      setMultiplier(ib.multiplier);
    }
  }, [block]);

  const schedule = React.useMemo(() : number[] => {
    if (!dueDate || !interval) return [];

    const today = todayMidnight();
    let diff = dateDiffInDays(today, dueDate);
    if (diff < 0) { // past due date
      return [diff];
    }

    const schedule = [diff];
    const nPred = 4;
    let _interval = interval;
    for (let i=0; i < nPred; i++) {
      _interval = Math.ceil(_interval * multiplier);
      diff = diff + _interval;
      // schedule.push(diff);
      schedule.push(_interval);
    }
    return schedule;
  }, [multiplier, interval, dueDate]);

  async function updatePriority({mean, variance} : {mean?: number, variance?: number}) {
    if (!mean && !variance) return;

    setBusy(true);
    const ib = await IncrementalBlock.fromUuid(block.uuid);
    let newBeta: Beta;
    if (variance) {
      newBeta = beta!.copy();
      newBeta.variance = variance;
    } else {
      newBeta = betaFromMean(mean!, { currentBeta: baseBeta.current });
    }
    await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-a', newBeta.a);
    await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-b', newBeta.b);
    setBeta(newBeta);

    // Update interval.
    // For now only the initial interval.
    // See topic_interval.ipynb
    if (ib.reps === 0) {
      const interval = initialIntervalFromMean(newBeta.mean);
      const due = new Date();
      due.setDate(due.getDate() + interval);
      await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-due', due.getTime());
      await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-interval', interval);
      await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-reps', 0);
      setDueDate(due);
      setInterval(interval);
    }
    setBusy(false);
  }

  async function updateDueDate(date: Date | null) {
    if (date === null) return;
    setBusy(true);
    // Set the time of 'today' to midnight to only compare dates, not times
    date.setHours(0, 0, 0, 0);
    await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-due', date.getTime());

    // Update queue
    const today = todayMidnight();
    const curIsToday = dueDate && dateDiffInDays(today, dueDate) == 0;
    const newIsToday = dateDiffInDays(today, date) == 0;
    if (curIsToday && !newIsToday) {
      GLOBALS.queue.remove(block.uuid);
    } else if (!curIsToday && newIsToday) {
      const ib = await IncrementalBlock.fromUuid(block.uuid, { propsOnly: false });
      GLOBALS.queue.add(ib);
    }

    setDueDate(date);
    setBusy(false);
  }

  async function updateMultiplier(multiplier: number) {
    setBusy(true);
    if (!isFinite(multiplier)) multiplier = logseq.settings?.defaultMultiplier as number ?? 2.;
    await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-multiplier', multiplier);
    setMultiplier(multiplier);
    setBusy(false);
  }

  async function updateInterval(interval: number) {
    setBusy(true);
    if (isFinite(interval)) {
      await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-interval', interval);
      setInterval(interval);
    }
    setBusy(false);
  }

  async function done() {
    setBusy(true)
    const ib = await IncrementalBlock.fromUuid(block.uuid, { propsOnly: false });
    await ib.done()
    setBusy(false)
    logseq.hideMainUI();
  }

  const scheduleList = [];
  if (schedule.length > 0) {
    for (let i = 0; i < schedule.length-1; i++) {
      scheduleList.push(<span>{schedule[i]}d</span>);
      scheduleList.push(<span> →</span>)
    }
    scheduleList.push(<span>{schedule[schedule.length-1]}d</span>);
  }

  return (
    <div 
      ref={ref} 
      id="ib-popover" 
      style={{position: "fixed"}} 
      className="flex rounded-lg border bg-white shadow-md p-1 divide-x text-sm"
    >
      <form><fieldset disabled={busy}><div className="flex divide-x">
        <div className="p-2 py-0">
          <p className="font-semibold text-gray-90">Priority</p>
          <div className="border w-fit">
            {beta && <BetaGraph beta={beta} width={120} height={60}></BetaGraph>}
          </div>
          {beta && <PrioritySlider
            beta={beta}
            varianceSlider={priorityOnly}
            onMeanChange={(mean) => updatePriority({ mean })}
            onVarianceChange={(variance) => updatePriority({ variance })}
          ></PrioritySlider>}
        </div>

        {!priorityOnly && <div className="p-2 py-0">
          <p className="font-semibold text-gray-90">Schedule</p>
          <p>Due</p>
          <DatePicker
            className="border"
            selected={dueDate}
            onChange={(date) => updateDueDate(date)}
            minDate={new Date()}
            monthsShown={1}
            dateFormat="dd/MM/yyyy"
          />
          <div className="flex">
            <div>
              <p>Multiplier</p>
              <input 
                className="border w-16" 
                type="number" 
                value={multiplier}
                onChange={(e) => updateMultiplier(parseFloat(e.target.value))}
                min="1" 
                max="5" 
                step="0.1"
              ></input>
            </div>
            <div className="ml-2">
              <p>Interval</p>
              <input 
                className="border w-16" 
                type="number" 
                value={interval}
                onChange={(e) => updateInterval(parseFloat(e.target.value))}
                min="1" 
                step="1"
              ></input>
            </div>
          </div>
          <div className="text-neutral-400 text-xs flex items-center">
            {scheduleList}
          </div>
        </div>}

        <div className="p-2 py-0">
          <button
            className="hover:bg-gray-100 border py-1 px-1 rounded" 
            onClick={done}
          >
            <span>Done</span>
          </button>
        </div>

      </div></fieldset></form>
    </div>
  );
}