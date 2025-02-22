import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { intervalChanged, priorityChanged } from "./importSlice";
import PrioritySlider from "../widgets/PrioritySlider";
import Beta from "../algorithm/beta";

export default function ExtractPanel({ importThing }: { importThing: Function }) {
  const busy = useAppSelector(state => state.import.busy);
  const interval = useAppSelector(state => state.import.interval);
  const betaParams = useAppSelector(state => state.import.betaParams);
  const dispatch = useAppDispatch();

  function update(priority: number) {
    dispatch(priorityChanged(priority));
  }

  return (
    <div className="flex items-center space-x-1">
      <p>Priority</p>
      
      <div className="">
        <PrioritySlider
          beta={Beta.fromParams(betaParams)}
          varianceSlider={false}
          onMeanChange={update}
        ></PrioritySlider>
      </div>

      <p className="">Interval</p>
      <input 
        className="w-16 p-0 ml-2"
        type="number" 
        value={interval}
        onChange={(e) => dispatch(intervalChanged(parseFloat(e.target.value)))}
        min="1" 
        step="1"
      ></input>

      <div className="flex-1"></div>

      <button 
        className="py-1 px-2 rounded bg-primary/90 hover:bg-primary border-b-2 border-primary-700 hover:border-primary-500 text-primary-foreground border" 
        onClick={() => importThing()}
      >
         Import
      </button>
    </div>
  );
}
