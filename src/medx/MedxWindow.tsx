import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import ExtractionView from "./ExtractionView";
import PlayerView from "./PlayerView";

export default function MedxWindow() {
  const ref = React.useRef<HTMLDivElement>(null);
  const media = useAppSelector(state => state.medx.media);

  // This should never be reached
  if (media == null) {
    return <p>No media selected.</p>
  }
  
  return (
  <div 
    ref={ref} 
    id="ib-medx" 
    className="flex flex-col p-2"
  >
    <PlayerView />
    <hr className="my-2 dark:border-gray-800"></hr>
    {/* <ExtractionView /> */}
  </div>
  );
}
