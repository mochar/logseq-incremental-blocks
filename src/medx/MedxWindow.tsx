import React from "react";
import * as theme from "../utils/theme";
import ExtractionView from "./ExtractionView";
import JumpView from "./jump/JumpView";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { reloadBlock } from "./medxSlice";

export default function MedxWindow() {
  const ref = React.useRef<HTMLDivElement>(null);
  const medxData = useAppSelector(state => state.medx.active)!;
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    dispatch(reloadBlock());
  }, []);

  // This should never be reached
  if (medxData == null) {
    return <p>No media selected.</p>
  }
  
  return (
  <div 
    ref={ref} 
    id="ib-medx" 
    className={`fixed flex h-full justify-between space-x-2 p-2 text-sm ${theme.TXT}`}
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
