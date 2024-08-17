import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";
import { MedxArgs } from "./macro";
import RangeSelector from "./RangeSelector";

export default function MedxPopover({ block, slot, args }: { block: BlockEntity, slot: string, args: MedxArgs }) {
  const ref = React.useRef<HTMLDivElement>(null);
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
      setDuration(audio.duration);
    }
  }, [block]);

  function updateRange(range: number[]) {
  }

  return (
  <div 
    ref={ref} 
    id="ib-medx" 
    style={{position: "fixed"}} 
    className="flex flex-col rounded-lg border bg-white shadow-md p-2 divide-x text-sm"
  >
    {duration && <RangeSelector 
      length={duration}
      url={args.url}
      onChange={updateRange}
    ></RangeSelector>}
  </div>
  );
}