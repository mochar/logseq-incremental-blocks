import React from "react";
import { useAppDispatch } from "../state/hooks";
import { doneRep, finishRep, getPriorityUpdates, laterRep, stopLearning } from "./learnSlice";
import PriorityComponent from "./PriorityComponent";

export default function LearnBar() {
  const dispatch = useAppDispatch();
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

  return (
    <>
      <div
        className="border border-2 rounded-lg shadow-sm p-1 flex space-x-1"
        style={{
          backgroundColor: `var(--ls-primary-background-color, var(--ls-primary-background-color-plugin))`,
          color: `var(--ls-primary-text-color, var(--ls-primary-text-color-plugin))`,
          height: 40
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

        <PriorityComponent />

        <button
          className="border rounded"
          onClick={quit}
        >
          Quit
        </button>
      </div>
    </>
  )
}
