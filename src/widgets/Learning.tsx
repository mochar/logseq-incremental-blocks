import React from "react";
import IncrementalBlock from "../IncrementalBlock";
import { GLOBALS } from "../globals";
import Beta from "../algorithm/beta";
import { PriorityUpdate } from "../algorithm/priority";
import DatePicker from "react-datepicker";
import PrioritySlider from "./PrioritySlider";
import { nextInterval } from "../algorithm/scheduling";
import { addDays, dateDiffInDays, formatDate, todayMidnight } from "../utils";
import IbItem from "./IbItem";
import BetaGraph from "./BetaGraph";

const queue = GLOBALS.queue;

export default function Learning({ offLearn }: { offLearn: () => void }) {
  const [ready, setReady] = React.useState<boolean>(false);
  const [currentIb, setCurrentIb] = React.useState<IncrementalBlock | null>();
  const [priorityUpdates, setPriorityUpdates] = React.useState<PriorityUpdate>();
  const [manualPriority, setManualPriority] = React.useState<number>();
  const [interval, setInterval] = React.useState<number>();
  const [autoOpen, setAutoOpen] = React.useState<boolean>(logseq.settings?.learnAutoOpen as boolean ?? true);

  React.useEffect(() => {
    if (queue.current) {
      updateCurrentIb(queue.current.ib);
    } else if (queue.length == 0) {
      updateCurrentIb(undefined);
    } else {
      nextIb();
    }

    // On a timer, get new priority updates. This is because
    // time spent on an ib increases priority.
    let timer: NodeJS.Timeout;
    const getRepeatUpdates = async function() {
      await getPriorityUpdates();
      timer = setTimeout(getRepeatUpdates, 2000);
    }
    getRepeatUpdates();
    return () => clearTimeout(timer);
  }, []);

  async function nextIb(postpone: boolean = false) {
    setReady(false);

    // Get next rep ib in queue
    if (postpone) {
      await queue.nextRep({ postponeInterval: interval! });
    } else {
      await queue.nextRep({});
    }
    updateCurrentIb(queue.current?.ib);

    // Move to next ib page.
    // Not in updateCurrentIb because dont want to move everything
    // main popup is opened.
    if (queue.current) {
      const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
      if (openIb) {
        logseq.App.pushState('page', { name: queue.current.ib.uuid })
      }
    }
  }

  async function updateCurrentIb(ib: IncrementalBlock | undefined) {
    setCurrentIb(ib);
    if (ib) {
      // Populate ib data
      await queue.getPriorityUpdate();
      setManualPriority(queue.current?.manualPriority);
      if (queue.current?.manualInterval) {
        setInterval(queue.current.manualInterval);
      } else {
        setInterval(nextInterval(ib));
      }
    }
    setReady(true);
  }

  function updateManualPriority(meanPiority: number | undefined) {
    queue.current!.manualPriority = meanPiority;
    setManualPriority(meanPiority);
  }

  function updateManualInterval(val: number | undefined) {
    queue.current!.manualInterval = val;
    if (!val) {
      val = nextInterval(currentIb!);
    }
    setInterval(val);
  }

  async function getPriorityUpdates() {
    if (!queue.current) return;
    await queue.getPriorityUpdate();
    setPriorityUpdates(queue.current.priorityUpdate);
  }

  async function postpone() {
    nextIb(true);
  }

  function finish() {
    // Return back to top of the queue, since we're not finished
    // with it yet.
    queue.currentBackToQueue();

    // Parent callback
    offLearn();
  }

  function toggleAutoOpen() {
    logseq.updateSettings({ learnAutoOpen: !autoOpen });
    setAutoOpen(!autoOpen);
  }

  if (!ready) return <div>Loading...</div>;

  if (currentIb == null) {
    return <div>
      Finished for today.
      <a onClick={offLearn}>Return</a>
    </div>
  } 

  // Handle changes related to priority.
  // Manual priority overrides algorithm-decided priority.
  const prioritizeManually = Boolean(manualPriority);
  let newBeta = currentIb.beta!;
  let updatesHtml = <div></div>;
  if (manualPriority) {
    newBeta = newBeta.copy();
    newBeta.mean = manualPriority;
  } else if (priorityUpdates) {
    newBeta = new Beta(newBeta!.a + priorityUpdates.a, newBeta!.b);
    updatesHtml = <div>
      <span>Time: {priorityUpdates.aTime} ({priorityUpdates.scoreTime})</span>
      <span>Content: {priorityUpdates.aContent} ({priorityUpdates.scoreContent})</span>
    </div>
  }

  // Handle scheduling
  const scheduleManually = Boolean(queue.current?.manualInterval);
  let nextDue = todayMidnight();
  if (interval) {
    nextDue = addDays(nextDue, interval);
  }

  return (
    <div className="flex flex-col bg-white w-full text-sm">

      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-gray-500">🔁 {currentIb.reps!+1}</span>

        <label className="inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={autoOpen}
            onChange={toggleAutoOpen}
            className="sr-only peer">
          </input>
          <div className="relative w-9 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-gray-400"></div>
          <span className="ms-2 text-xs text-gray-400 dark:text-gray-300">Follow</span>
        </label>
      </div>

      <div className="border rounded">
        <IbItem ib={currentIb}></IbItem>
      </div>

      <div className="py-2">
        <div className="flex items-center justify-between">
          <p>Priority</p>
          <p>
            {prioritizeManually && <span className="text-neutral-600">
              manual
              <button
              className="button border"
              onClick={() => updateManualPriority(undefined)}
              >
                <span>⮌</span>
              </button>
            </span>
            }
          </p>
        </div>

        <div className="flex items-center justify-center">
          <div className="border grow-0">
            <BetaGraph beta={currentIb.beta!} width={120} height={60}></BetaGraph>
          </div>
          <p className="text-neutral-400 px-2">🠲</p>
          <div className="border grow-0">
            <BetaGraph beta={newBeta!} width={120} height={60}></BetaGraph>
          </div>
        </div>
        <div className="py-1 px-6">
          <PrioritySlider
            beta={newBeta!}
            onMeanChange={updateManualPriority}
          ></PrioritySlider>
        </div>
      </div>

      <div className="py-2">
        <div className="flex items-center justify-between">
          <p>Schedule</p>
          <p>
            {scheduleManually && <span className="text-neutral-600">
              manual
              <button
              className="button border"
              onClick={() => updateManualInterval(undefined)}
              >
                <span>⮌</span>
              </button>
            </span>
            }
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="border grow">
            {formatDate(currentIb.dueDate!)}
          </p>
          <p className="text-neutral-400 px-2">🠲</p>
          <DatePicker
            className="border grow"
            selected={nextDue}
            onChange={(date) => date && setInterval(dateDiffInDays(todayMidnight(), date))}
            minDate={addDays(new Date(), 1)}
            monthsShown={1}
            dateFormat="dd/MM/yyyy"
          />
        </div>

        <div className="flex items-center py-1">
          <span>Interval</span>
          <input
            className="border px-2" 
            type="number" 
            value={interval}
            onChange={(e) => updateManualInterval(parseFloat(e.target.value))}
            min="1" 
            step="1"
          >
          </input>
          <div className="grow"></div>
          <button
            className="border px-1"
            onClick={postpone}
          >
            Postpone
          </button>
        </div>
      </div>

      <hr></hr>

      <div className="flex justify-between py-2">
        <button 
          className="w-fit bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded" 
          onClick={() => nextIb()}
        >
          Next rep
        </button>
        <div className="flex-grow"></div>
        <button 
          className="hover:bg-gray-100 border py-1 px-1 w-1/6 rounded" 
          onClick={finish}
        >
          Finish
        </button>
      </div>

      {/* {updatesHtml} */}
    </div>
  );
}