import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";
import { MedxArgs } from "./macro";
import RangeSelector from "./RangeSelector";
import IncrementalBlock from "../IncrementalBlock";
import Beta from "../algorithm/beta";
import { initialIntervalFromMean } from "../algorithm/scheduling";

export default function MedxPopover({ block, slot, args }: { block: BlockEntity, slot: string, args: MedxArgs }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const range = React.useRef<number[]>();
  const [duration, setDuration] = React.useState<number>();

  React.useEffect(() => {
    // Set position above bar
    const div = top?.document.getElementById(slot);
    if (div) {
      const elemBoundingRect = div.getBoundingClientRect();
      ref.current!.style.top = `${elemBoundingRect.top - (ref.current?.clientHeight ?? 0) - 10}px`;
      ref.current!.style.left = `${elemBoundingRect.left}px`;
    }

    const audio = new Audio(args.url);
    audio.onloadedmetadata = function() {
      const start = args.start ?? 0;
      const end = args.end ?? audio.duration;
      range.current = [start, end];
      setDuration(audio.duration);
    }
  }, [block]);

  function updateRange(newRange: number[]) {
    range.current = newRange;
  }
  
  async function extract() {
    const ib = IncrementalBlock.fromBlock(block);
    let content = `{{renderer :medx, ${args.url}, ${range.current![0]}-${range.current![1]}}}`;
    content += '\n{{renderer :ib}}';
    let beta = ib.beta;
    if (!beta) {
      beta = new Beta(1, 1);
      beta.mean = logseq.settings?.defaultPriority as number ?? 0.5;
    }
    const interval = initialIntervalFromMean(beta.mean);
    const due = new Date();
    due.setDate(due.getDate() + interval);
    const properties = { 'ib-reps': 0, 'ib-a': beta.a, 'ib-b': beta.b, 'ib-due': due.getTime(), 'ib-interval': interval };
    const b = await logseq.Editor.insertBlock(block.uuid, content, { properties, focus: false });
  }

  let content;
  if (!duration) {
    content = <p>Loading...</p>;
  } else {
    content = <>
      <RangeSelector 
        length={duration}
        url={args.url}
        initStart={range.current![0]}
        initEnd={range.current![1]}
        onChange={updateRange}
      ></RangeSelector>
      <button 
        className="w-fit mt-2 bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded" 
        onClick={extract}
      >
        Extract
      </button>
    </>;
  }

  return (
  <div 
    ref={ref} 
    id="ib-medx" 
    style={{position: "fixed"}} 
    className="flex flex-col rounded-lg border bg-white shadow-md p-2 divide-x text-sm"
  >
    {content}
  </div>
  );
}