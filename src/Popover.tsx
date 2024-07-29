import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import Beta from "./beta";
import IncrementalBlock from "./IncrementalBlock";
import { jStat } from "jstat";

import "react-datepicker/dist/react-datepicker.css";
import { dateDiffInDays } from "./utils";

export default function Popover({ block, slot }: { block: BlockEntity, slot: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement>();
  const height = 60;
  const width = 120;
  const [meanPriority, setMeanPriority] = useState<number>(.5);
  const [dueDate, setDueDate] = useState<Date>();
  const [multiplier, setMultiplier] = useState<number>(2.);
  const [interval, setInterval] = useState<number>();
  const [schedule, setSchedule] = useState<number[]>([]);
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    // Set position above bar
    const div = top?.document.getElementById(slot);
    if (!div) return;
    const elemBoundingRect = div.getBoundingClientRect();
    ref.current!.style.top = `${elemBoundingRect.top - (ref.current?.clientHeight ?? 0) - 10}px`;
    ref.current!.style.left = `${elemBoundingRect.left}px`;

    // Block properties
    const props = block.properties!;
    const ib = new IncrementalBlock(props);
    if (ib.beta) {
      setMeanPriority(ib.beta.mean);
      updateCanvas(ib.beta);
    }
    if (ib.dueDate) {
      setDueDate(ib.dueDate);
    } else {
      updatePriority();
    }
    if (ib.interval) setInterval(ib.interval);
    setMultiplier(ib.multiplier);

    // Schedule
    updateSchedule();
  }, [block]);

  useEffect(() => {
    updateSchedule();
  }, [multiplier, interval, dueDate]);

  function updateCanvas(beta: Beta) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      let ctx = canvas.getContext("2d")!;

      const h = height;
      const w = width;
      const hOffset = 3;
      const lingradPath = ctx.createLinearGradient(w/2, hOffset, w/2, h);
      lingradPath.addColorStop(0, "#4682B4");
      // lingradPath.addColorStop(0.3, "#4682B4");
      lingradPath.addColorStop(1, "rgba(256, 256, 256, 0.98)");
      ctx.strokeStyle = lingradPath;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h);

      const nBins = 100;
      // let pdMode = beta.pdf(beta.mode());
      const ps = [0, ...[...Array(nBins-1).keys()].map((i) => beta.pdf((i+1) / nBins))];
      const pdMax = Math.max(...ps);
      for (let i = 0; i < nBins; i++) {
        const x = i / nBins;
        // const pd = beta.pdf(x);
        const pd = ps[i];
        ctx.lineTo(x*w, h - h*(pd/pdMax) + hOffset);
        // ctx.stroke();
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.stroke();
      ctx.clip()

      const lingrad = ctx.createLinearGradient(w/2, hOffset, w/2, h);
      lingrad.addColorStop(0, "#F2F2F2");
      lingrad.addColorStop(0.3, "#F2F2F2");
      lingrad.addColorStop(1, "rgba(256, 256, 256, 0.9)");
      ctx.fillStyle = lingrad;
      ctx.fillRect(0, 0, w, h);
      setCanvas(canvas);

  }

  function updateSchedule() {
    if (!dueDate || !interval) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let diff = dateDiffInDays(today, dueDate);
    setSchedule([diff]);
    if (diff < 0) { // past due date
      return;
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
    setSchedule(schedule);

  }

  async function updatePriority() {
    setBusy(true);
    const ib = await IncrementalBlock.fromUuid(block.uuid);

    const minMean = 0.2;
    const maxMean = 0.8;
    const mean = minMean + (maxMean-minMean)*meanPriority;

    let beta = ib.beta ? new Beta(ib.beta.a, ib.beta.b) : null;
    if (beta) {
      // Has valid params, update
      beta.mean = mean;
    } else {
      let a: number, b: number;
      // No or invalid params, set
      if (mean == 0.5) {
        a = 1;
        b = 1;
      } else if (mean > 0.5) {
        a = 1;
        b = a * (1 / mean - 1);
      } else {
        b = 1;
        a = b * (mean / (1 - mean));
      }
      beta = new Beta(a, b);
    }
    await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-a', beta.a);
    await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-b', beta.b);
    updateCanvas(beta);

    // Update interval.
    // For now only the initial interval.
    // See topic_interval.ipynb
    if (ib.reps === 0) {
      const rate = (1-meanPriority)*25;
      const interval = jStat.poisson.sample(rate) + 1;
      const due = new Date();
      due.setDate(due.getDate() + interval);
      await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-due', due.toISOString());
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
    await logseq.Editor.upsertBlockProperty(block.uuid, 'ib-due', date.toISOString());
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
          {canvas && <img className="border" width={width} height={height} src={canvas.toDataURL()} />}
          <div className="flex">
            <input 
              className="w-32"
              type="range" min="0" max="10000" step="1" 
              value={meanPriority*10000} 
              onChange={(e) => setMeanPriority(parseFloat(e.target.value)/10000)}
              onMouseUp={updatePriority}
            ></input>
            <p className="w-14">{(meanPriority*100).toFixed(2)}%</p>
          </div>
        </div>

        <div className="p-2 py-0">
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
          <p>Multiplier</p>
          <input 
            className="border" 
            type="number" 
            value={multiplier}
            onChange={(e) => updateMultiplier(parseFloat(e.target.value))}
            min="1" 
            max="5" 
            step="0.1"
          ></input>
          <p className="text-neutral-400 text-xs">{scheduleList}</p>
        </div>
      </div></fieldset></form>
    </div>
  );
}