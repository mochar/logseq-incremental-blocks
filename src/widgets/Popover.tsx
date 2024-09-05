import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import Beta from "../algorithm/beta";
import IncrementalBlock from "../IncrementalBlock";
import * as theme from "../utils/theme";

import "react-datepicker/dist/react-datepicker.css";
import { addDays, formatDate, todayMidnight } from "../utils/datetime";
import { dateDiffInDays } from "../utils/datetime";
import { betaFromMean } from "../algorithm/priority";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import BetaGraph from "./BetaGraph";
import PrioritySlider from "./PrioritySlider";
import { useAppDispatch } from "../state/hooks";
import { dueIbAdded, dueIbRemoved } from "../learn/learnSlice";

enum SideView { none, priority, schedule }

export default function IbPopover({ block, slot }: { block: BlockEntity, slot: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ib, setIb] = React.useState<IncrementalBlock>(IncrementalBlock.fromBlock(block));
  const [visible, setVisible] = React.useState<boolean>(false);
  const [sideView, setSideView] = React.useState<SideView>(SideView.none);
  const baseBeta = useRef<Beta>();
  const [beta, setBeta] = useState<Beta>();
  const [dueDate, setDueDate] = useState<Date>();
  const [multiplier, setMultiplier] = useState<number>(2.);
  const [interval, setInterval] = useState<number>();
  const [busy, setBusy] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    // Set position above bar
    const div = top?.document.getElementById(slot);
    if (div && ref.current) {
      let height = ref.current.clientHeight;
      if (height == 0) height =  ib.priorityOnly ? 80 : 160;
      const elemBoundingRect = div.getBoundingClientRect();
      ref.current.style.top = `${elemBoundingRect.top - height/2}px`;
      ref.current.style.left = `${elemBoundingRect.right + 5}px`;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    resetProps(IncrementalBlock.fromBlock(block));
  }, [block]);

  function resetProps(ib: IncrementalBlock) {
    setIb(ib);
    const beta = ib.beta ?? new Beta(1, 1);
    setBeta(beta);
    // TODO this should later be fleshed out more.
    baseBeta.current = ib.reps == 0 ? new Beta(1, 1) : beta;

    if (!ib.priorityOnly) {
      if (ib.dueDate) {
        setDueDate(ib.dueDate);
      } else {
        updatePriority({ mean: beta.mean });
      }
      if (ib.interval) setInterval(ib.interval);
      setMultiplier(ib.multiplier);
    }
  }

  async function addScheduling() {
    const ib = await IncrementalBlock.fromUuid(block.uuid, { propsOnly: false });
    const interval = initialIntervalFromMean(ib.beta!.mean);
    const due = new Date();
    due.setDate(due.getDate() + interval);
    await logseq.Editor.updateBlock(block.uuid, ib.block!.content, { properties: {
      'ib-due': due.getTime(),
      'ib-interval': interval,
    }});
    resetProps(await IncrementalBlock.fromUuid(block.uuid, { propsOnly: false }));
  }

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
      dispatch(dueIbRemoved(block.uuid));
    } else if (!curIsToday && newIsToday) {
      const ib = await IncrementalBlock.fromUuid(block.uuid, { propsOnly: false });
      dispatch(dueIbAdded(ib));
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

  return (
    <div 
      ref={ref} 
      id="ib-popover" 
      className={`fixed flex items-start rounded text-sm text-gray-800 dark:text-gray-200 transition ease-out delay-75 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2  '}`}
      onMouseLeave={() => setSideView(SideView.none)}
    >
      <form 
        className={`flex rounded ${theme.BG} ${theme.BORDER} shadow-md py-1`}
        onSubmit={(e) => e.preventDefault()}
      >
      <fieldset disabled={busy}>
      <div className="flex flex-col divide-y px-1.5">
        <div 
          className="" 
          onMouseEnter={() => setSideView(SideView.priority)}
        >
          <p className="font-semibold text-gray-90">Priority</p>
          {beta && <PrioritySlider
            beta={beta}
            varianceSlider={ib.priorityOnly}
            onMeanChange={(mean) => updatePriority({ mean })}
            onVarianceChange={(variance) => updatePriority({ variance })}
          ></PrioritySlider>}
        </div>

        {ib.priorityOnly && 
        <button
          className="bg-white text-xs hover:bg-gray-100 text-gray-800 py-1 px-4 mb-1 border border-gray-400 rounded shadow"
          onMouseEnter={() => setSideView(SideView.none)}
          onClick={addScheduling}
        >
          Schedule ib
        </button>}

        {!ib.priorityOnly && 
        <div 
          className="py-1 dark:border-gray-600"
          onMouseEnter={() => setSideView(SideView.schedule)}
        >
          <p className="font-semibold text-gray-90">Schedule</p>
          <p>Due</p>
          <DatePicker
            className={`${theme.BG} ${theme.BORDER}`}
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
                className={`w-16 ${theme.BG} ${theme.BORDER}`}
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
                className={`w-16 ${theme.BG} ${theme.BORDER}`}
                type="number" 
                value={interval}
                onChange={(e) => updateInterval(parseFloat(e.target.value))}
                min="1" 
                step="1"
              ></input>
            </div>
          </div>
        </div>}

        <div 
          className="pt-1 dark:border-gray-600"
          onMouseEnter={() => setSideView(SideView.none)}
        >
          <button
            className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 rounded`}
            onClick={done}
          >
            <span>Done</span>
          </button>
        </div>

      </div></fieldset></form>

      <div 
        className={`transition ease-out delay-75 ${sideView != SideView.none ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2  '}`}
      >
        {sideView == SideView.priority && baseBeta.current && beta && <SidePriorityView currentBeta={baseBeta.current} newBeta={beta} />}
        {sideView == SideView.schedule && interval != undefined && dueDate != undefined && <SideScheduleView multiplier={multiplier} interval={interval} dueDate={dueDate} />}
      </div>
    </div>
  );
}

function SidePriorityView({ currentBeta, newBeta } : { currentBeta: Beta, newBeta: Beta }) : React.JSX.Element {
  const betaUpdated = newBeta.a != currentBeta.a || newBeta.b != currentBeta.b;

  let newBetaElements = <span className="text-gray-600"></span>;
  if (betaUpdated) {
    newBetaElements = <>
      <div className="w-full flex flex-col items-center">
        <span className="text-2xl text-gray-600">↓</span>
      </div>
      <div className="border rounded-lg">
        <BetaGraph beta={newBeta} width={120} height={60}></BetaGraph>
      </div>
    </>;
  }

  return (
  <div className={`flex flex-col text-xs content-stretch rounded ${theme.BG} ${theme.BORDER} shadow-md p-1 ml-2`}>
    <p className="font-medium mb-1">Priority</p>
    <div className="border rounded-lg max-w-fit">
      <BetaGraph beta={currentBeta} width={120} height={60}></BetaGraph>
    </div>
    {newBetaElements}
  </div>
  );
}

interface Scheduled {
  intervalToday: number,
  intervalPrevious?: number,
  date: Date
}

function SideScheduleView({ multiplier, interval, dueDate }: { multiplier: number, interval: number, dueDate: Date }) {

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
    const nPred = 4;
    let _interval = interval;
    let _due = new Date(dueDate);
    for (let i = 0; i < nPred; i++) {
      diff = diff + _interval;
      _due = addDays(_due, diff);
      schedule.push({ intervalToday: diff, intervalPrevious: _interval, date: _due });
      _interval = Math.ceil(_interval * multiplier);
    }
    return schedule;
  }, [multiplier, interval, dueDate]);

  const scheduleWidgets = schedule.map((scheduled) => ScheduledWidget({ scheduled }));

  return (
  <div className={`flex flex-col text-xs rounded ${theme.BG} ${theme.BORDER} shadow-md p-1 ml-2`}>
    <p className="font-medium mb-1">Schedule</p>
    {scheduleWidgets}
  </div>
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