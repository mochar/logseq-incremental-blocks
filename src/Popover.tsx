import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import Beta from "./beta";

import "react-datepicker/dist/react-datepicker.css";

export default function Popover({ block, slot }: { block: BlockEntity, slot: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement>();
  const height = 40;
  const width = 100;
  const [meanPriority, setMeanPriority] = useState<number>(.5);
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
      // Set position above bar
      const div = top?.document.getElementById(slot);
      if (!div) return;
      const elemBoundingRect = div.getBoundingClientRect();
      ref.current!.style.top = `${elemBoundingRect.top - (ref.current?.clientHeight ?? 0) - 10}px`;
      ref.current!.style.left = `${elemBoundingRect.left}px`;

      // Set mean priority
      //@ts-ignore
      const beta = Beta.fromProps(block.properties);
      if (beta) setMeanPriority(beta.mean);
  }, [block]);

  // Priority beta graph
  useEffect(() => {
    const props = block.properties!;
    const beta = new Beta(parseFloat(props['ibA']), parseFloat(props['ibB']));
    updateCanvas(beta);
  }, [block]);

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
      console.log(pdMax);
      console.log(ps);
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

  async function updatePriority() {
    setBusy(true);
    const props = await logseq.Editor.getBlockProperties(block.uuid);

    const minMean = 0.2;
    const maxMean = 0.8;
    const mean = minMean + (maxMean-minMean)*meanPriority;

    let beta = Beta.fromProps(props);
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
    setBusy(false);
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
            onChange={(date) => setDueDate(date!)}
            minDate={new Date()}
            monthsShown={1}
            dateFormat="dd/MM/yyyy"
          />
          <p>Multiplier</p>
          
        </div>

        <div>
        </div>
      </div></fieldset></form>
    </div>
  );
}