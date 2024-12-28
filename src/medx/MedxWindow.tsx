import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { reloadBlock } from "./medxSlice";
import ExtractionView from "./ExtractionView";
import PlayerView from "./PlayerView";

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
    className="flex flex-col p-2 text-sm"
  >
    <PlayerView data={medxData} />
    <hr className="my-2 dark:border-gray-800"></hr>
    <ExtractionView />
  </div>
  );
}
