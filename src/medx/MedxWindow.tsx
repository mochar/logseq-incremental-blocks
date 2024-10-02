import React from "react";
import * as theme from "../utils/theme";
import ExtractionView from "./ExtractionView";
import JumpView from "./jump/JumpView";
import { useAppSelector } from "../state/hooks";

export default function MedxWindow() {
  const ref = React.useRef<HTMLDivElement>(null);
  const medxData = useAppSelector(state => state.medx.active);

  // This should never be reached
  if (medxData == null) {
    return <p>No media selected.</p>
  }
  
  return (
  <div 
    ref={ref} 
    id="ib-medx" 
    className={`fixed flex justify-between rounded shadow-md space-x-2 p-2 text-sm ${theme.BG} ${theme.TXT} ${theme.BORDER}`}
  >
    <div className="w-full">
      <ExtractionView data={medxData} />
    </div>

    <div
      className={`w-64 min-w-64`}
    >
      <JumpView/>
    </div>
  </div>
  );
}
