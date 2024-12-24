import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { doneRep, finishRep, getPriorityUpdates, laterRep, Popover, popoverVisible, stopLearning } from "./learnSlice";
import PriorityComponent from "./PriorityComponent";
import PriorityPopover from "./PriorityPopover";
import ScheduleComponent from "./ScheduleComponent";
import SchedulePopover from "./SchedulePopover";
import PostponePopover from "./PostponePopover";

export default function LearnBar() {
  const dispatch = useAppDispatch();
  const popover = useAppSelector(state => state.learn.popover);
  let pollTimer: NodeJS.Timeout;
  
  React.useEffect(() => {
    // On a timer, get new priority updates. This is because
    // time spent on an ib increases priority.
    pollTimer = setInterval(() => dispatch(getPriorityUpdates()), 2000);
    return () => clearInterval(pollTimer);
  }, []);
  
  async function applyAction(action: Function, opts: Object = {}) {
    //setBusy(true);
    await dispatch(action(opts));
    //setBusy(false);
  }
  
  async function finish() {
    await applyAction(finishRep);
  }

  async function done() {
    await applyAction(doneRep);
  }

  async function later() {
    await applyAction(laterRep);
  }

  function quit() {
    dispatch(stopLearning());
  }

  let popoverView = <></>;
  if (popover == Popover.priority) {
    popoverView = <PriorityPopover />;
  } else if (popover == Popover.schedule) {
    popoverView = <SchedulePopover />;
  } else if (popover == Popover.postpone) {
    popoverView = <PostponePopover />;
  }

  return (
    <div
      className="flex flex-col space-y-1"
      onMouseLeave={() => dispatch(popoverVisible(Popover.none))}
    >
      <div
        className={`w-fit self-center border border-2 rounded transition ease-out delay-75 ${popover != Popover.none ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      >
        {popoverView}
      </div>

      <div
        className="border border-2 rounded-lg shadow-sm p-1 flex space-x-1 self-center"
        style={{
          backgroundColor: `var(--ls-secondary-background-color, var(--ls-secondary-background-color-plugin))`,
          color: `var(--ls-primary-text-color, var(--ls-primary-text-color-plugin))`,
          width: 'fit-content',
          //height: 40
        }}
      >
        <button 
          className="w-fit text-white py-1 px-1 w-1/6 border-b-2 rounded"
          style={{
            backgroundColor: "hsl(var(--primary))"
          }}
          onClick={finish}
        >
           Next
        </button>

        <button 
          className="w-fit text-white py-1 px-1 w-1/6 border-b-2 rounded"
          style={{
            backgroundColor: "hsl(var(--secondary))"
          }}
          // TODO: Default postpone interval calculation
          onClick={() => {}}
          onMouseEnter={() => dispatch(popoverVisible(Popover.postpone))}
        >
           ⏰
        </button>
        
        <PriorityComponent />

        <ScheduleComponent />

        <button
          className="border rounded"
          onClick={quit}
        >
          Quit
        </button>
      </div>
    </div>
  )
}
