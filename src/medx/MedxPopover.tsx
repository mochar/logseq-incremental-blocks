import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";
import IncrementalBlock from "../IncrementalBlock";
import Beta from "../algorithm/beta";
import MedxArgs from "./args";
import * as theme from "../utils/theme";
import ExtractionView from "./ExtractionView";

export default function MedxPopover({ block, slot, args }: { block: BlockEntity, slot: string, args: MedxArgs }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const ib = IncrementalBlock.fromBlock(block);
  const [medxArgs, setMedxArgs] = React.useState(args);
  const [beta, setBeta] = React.useState(ib.beta ?? new Beta(1, 1));
  
  return (
  <div 
    ref={ref} 
    id="ib-medx" 
    className={`fixed flex justify-between rounded shadow-md p-2 text-sm sm:w-9/12 md:w-8/12 lg:w-7/12 ${theme.BG} ${theme.TXT} ${theme.BORDER}`}
  >
    <div className="w-full space-x-2">
      <ExtractionView
        blockUuid={block.uuid}
        priority={beta}
        medxArgs={medxArgs}
      />
    </div>

    <button
      className={`w-3 rounded ${theme.BG_ACTIVE}`}
    >  
    </button>
  </div>
  );
}
