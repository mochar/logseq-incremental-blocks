import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { finishRep, getPriorityUpdates, Popover, popoverVisible, stopLearning } from "./learnSlice";
import PriorityComponent from "./PriorityComponent";
import PriorityPopover from "./PriorityPopover";
import ScheduleComponent from "./ScheduleComponent";
import SchedulePopover from "./SchedulePopover";
import ActionsPopover from "./ActionsPopover";
import QueuePopover from "./QueuePopover";
import SettingsComponent from "./SettingsComponent";
import * as theme from "../utils/theme";

export default function LearnBar() {
  const dispatch = useAppDispatch();
  const currentIbData = useAppSelector(state => state.learn.current);
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

  function quit() {
    dispatch(stopLearning());
  }

  let popoverView = <></>;
  let selfPos = 'self-center';
  if (popover == Popover.priority) {
    popoverView = <PriorityPopover />;
  } else if (popover == Popover.schedule) {
    popoverView = <SchedulePopover />;
  } else if (popover == Popover.actions) {
    popoverView = <ActionsPopover />;
    selfPos = 'self-start';
  } else if (popover == Popover.queue) {
    popoverView = <QueuePopover />;
    selfPos = 'self-end';
  }

  return (
    <div
      className="flex flex-col space-y-1"
      onMouseLeave={() => dispatch(popoverVisible(Popover.none))}
    >
      <div
        className={`w-fit ${selfPos} border border-2 bg-background rounded transition ease-out delay-75 ${popover != Popover.none ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      >
        {popoverView}
      </div>

      <div
        className="border border-2 bg-background rounded-lg shadow-sm p-1 flex space-x-1 self-center"
        style={{
          //          backgroundColor: `var(--ls-secondary-background-color, var(--ls-secondary-background-color-plugin))`,
          color: `var(--ls-primary-text-color, var(--ls-primary-text-color-plugin))`,
          width: 'fit-content',
          //height: 40
        }}
      >
        <button 
          className="w-fit text-white py-1 px-1 w-1/6 border-b-2 rounded bg-primary/90 hover:bg-primary"
          onClick={finish}
          onMouseEnter={() => dispatch(popoverVisible(Popover.none))}
        >
           Next
        </button>

        <span className={`text-xs ${theme.TXT_MUTED} flex flex-col items-center justify-end`}>
          <i className="ti ti-repeat"></i>
          <span>{(currentIbData?.ib.scheduling?.reps ?? 0) + 1}</span>
        </span>
        
        <button 
          className="w-fit text-white py-1 px-1 w-1/6 border-b-2 rounded flex hover:bg-secondary"
          onMouseEnter={() => dispatch(popoverVisible(Popover.actions))}
        >
          <i style={{fontSize: 20, color: 'gray'}} className="ti ti-dots-circle-horizontal self-center"></i>
        </button>
        
        <PriorityComponent />

        <ScheduleComponent />
        
        <SettingsComponent />
        
        <button 
          className="w-fit text-white py-1 px-1 w-1/6 border-b-2 rounded flex hover:bg-secondary"
          onMouseEnter={() => dispatch(popoverVisible(Popover.queue))}
        >
          <i style={{fontSize: 20, color: 'gray'}} className="ti ti-layout-list self-center"></i>
        </button>

        <button
          className="border rounded px-1 hover:bg-secondary"
          onClick={quit}
          onMouseEnter={() => dispatch(popoverVisible(Popover.none))}
        >
          Quit
        </button>
      </div>
    </div>
  )
}
