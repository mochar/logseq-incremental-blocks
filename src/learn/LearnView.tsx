import React from "react";
import DatePicker from "react-datepicker";
import PrioritySlider from "../widgets/PrioritySlider";
import { nextInterval } from "../algorithm/scheduling";
import { formatDate, addDays, todayMidnight, dateDiffInDays } from "../utils/datetime";
import IbItem from "../widgets/IbItem";
import BetaGraph from "../widgets/BetaGraph";
import { RepAction } from "./queue";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { doneRep, finishRep, getPriorityUpdates, manualIntervention, nextRep, postponeRep } from "./learnSlice";

export default function LearnView({ offLearn }: { offLearn: () => void }) {
  const [busy, setBusy] = React.useState<boolean>(false);
  const [autoOpen, setAutoOpen] = React.useState<boolean>(logseq.settings?.learnAutoOpen as boolean ?? true);

  const dispatch = useAppDispatch();
  const queueStatus = useAppSelector(state => state.learn.queueStatus);
  const currentIbData = useAppSelector(state => state.learn.current);
  const currentIb = useAppSelector(state => state.learn.current?.ib);

  const interval = React.useMemo(() => {
    if (!currentIbData) return undefined;
    return currentIbData.manualInterval ?? nextInterval(currentIbData.ib);
  }, [currentIbData]);

  React.useEffect(() => {
    // On a timer, get new priority updates. This is because
    // time spent on an ib increases priority.
    let timer: NodeJS.Timeout;
    const getRepeatUpdates = async function() {
      await dispatch(getPriorityUpdates());
      timer = setTimeout(getRepeatUpdates, 2000);
    }
    getRepeatUpdates();
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    // Move to next ib page.
    // Not in updateCurrentIb because dont want to move everything
    // main popup is opened.
    if (currentIbData) {
      const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
      if (openIb) {
        logseq.App.pushState('page', { name: currentIbData.ib.uuid })
      }
    }
  }, [currentIb]);

  async function nextIb(repAction: RepAction) {
    setBusy(true);

    // Apply rep action
    if (repAction == RepAction.finish) {
      await dispatch(finishRep());
    } else if (repAction == RepAction.postpone) {
      await dispatch(postponeRep(interval!));
    } else if (repAction == RepAction.done) {
      await dispatch(doneRep());
    } else if (repAction == RepAction.next) {
      await dispatch(nextRep());
    }
    // TODO: automatically do this in nextRep
    await dispatch(getPriorityUpdates());

    setBusy(false);
  }

  function updateManualPriority(meanPiority: number | null) {
    dispatch(manualIntervention({ priority: meanPiority }))
  }

  function updateManualInterval(val: number | null) {
    dispatch(manualIntervention({ interval: val }))
  }

  async function finish() {
    await nextIb(RepAction.finish);
  }

  async function postpone() {
    await nextIb(RepAction.postpone);
  }

  async function done() {
    await nextIb(RepAction.done);
  }

  function quit() {
    offLearn();
  }

  function toggleAutoOpen() {
    logseq.updateSettings({ learnAutoOpen: !autoOpen });
    setAutoOpen(!autoOpen);
  }

  if (busy || queueStatus == 'busy') return <div>Loading...</div>;

  if (currentIb == null) {
    return <div>
      Finished for today.
      <button className="border" onClick={offLearn}>Return</button>
    </div>
  } 

  // Handle changes related to priority.
  // Manual priority overrides algorithm-decided priority.
  const prioritizeManually = Boolean(currentIbData?.manualPriority);
  let newBeta = currentIb.beta!.copy();
  let updatesHtml = <div></div>;
  if (prioritizeManually) {
    newBeta = newBeta.copy();
    newBeta.mean = currentIbData!.manualPriority!;
  } else if (currentIbData?.priorityUpdate) {
    const priorityUpdate = currentIbData.priorityUpdate;
    newBeta.applyPriorityUpdate(priorityUpdate);
    updatesHtml = <div>
      <span>Time: {priorityUpdate.bTime} ({priorityUpdate.scoreTime})</span>
      <span>Content: {priorityUpdate.aContent} ({priorityUpdate.scoreContent})</span>
    </div>
  }

  // Handle scheduling
  const scheduleManually = Boolean(currentIbData?.manualInterval);
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
              onClick={() => updateManualPriority(null)}
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
              onClick={() => updateManualInterval(null)}
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
            onChange={(date) => date && updateManualInterval(dateDiffInDays(todayMidnight(), date))}
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
          onClick={finish}
        >
          Next rep
        </button>
        <button 
          className="hover:bg-gray-100 border py-1 px-1 ml-2 w-1/6 rounded" 
          onClick={done}
        >
          Done
        </button>
        <div className="flex-grow"></div>
        <button 
          className="hover:bg-gray-100 border py-1 px-1 w-1/6 rounded" 
          onClick={quit}
        >
          Quit
        </button>
      </div>

      {/* {updatesHtml} */}
    </div>
  );
}