import React from "react";
import IncrementalBlock from "../IncrementalBlock";
import GLOBALS from "../globals";
import Beta from "../algorithm/beta";
import BetaGraph from "./BetaGraph";
import { getBlockHierarchyContent } from "../logseq/utils";
import { getPriorityUpdate, PriorityUpdate } from "../algorithm/priority";
import DatePicker from "react-datepicker";
import PrioritySlider from "./PrioritySlider";
import { nextInterval } from "../algorithm/scheduling";
import { dateDiffInDays, todayMidnight } from "../utils";
import { addDays, format } from "date-fns";

export default function Learning({ offLearn }: { offLearn: () => void }) {
  const [ready, setReady] = React.useState<boolean>(false);
  const [currentIb, setCurrentIb] = React.useState<IncrementalBlock | null>();
  const [priorityUpdates, setPriorityUpdates] = React.useState<PriorityUpdate>();
  const [manualPriority, setManualPriority] = React.useState<number>();
  const [interval, setInterval] = React.useState<number>();

  React.useEffect(() => {
    if (GLOBALS.current) {
      updateCurrentIb(GLOBALS.current.ib);
    } else if (GLOBALS.queue.length == 0) {
      updateCurrentIb(undefined);
    } else {
      nextIb();
    }
  }, []);

  async function nextIb() {
    setReady(false);

    if (currentIb) {
      // Update priority and schedule
      // TODO
    }

    // Clean up
    delete GLOBALS.current;

    // Get next Ib in queue
    const ib = GLOBALS.queue.shift();

    if (ib) {
      // Populate the global current ib data
      const contents = await getBlockHierarchyContent(ib.uuid, 3);
      GLOBALS.current = {
        ib: ib,
        start: new Date(),
        contents: contents,
        newContents: contents
      }
    }
    updateCurrentIb(ib);
  }

  async function updateCurrentIb(ib: IncrementalBlock | undefined) {
    setCurrentIb(ib);
    if (!ib) return;
    await getPriorityUpdates();
    setManualPriority(GLOBALS.current?.manualPriority);
    if (GLOBALS.current?.manualInterval) {
      setInterval(GLOBALS.current.manualInterval);
    } else {
      setInterval(nextInterval(ib));
    }
    setReady(true);
  }

  function updateManualPriority(meanPiority: number) {
    GLOBALS.current!.manualPriority = meanPiority;
    setManualPriority(meanPiority);
  }

  async function getPriorityUpdates() {
    if (!GLOBALS.current) return;
    GLOBALS.current.newContents = await getBlockHierarchyContent(GLOBALS.current.ib.uuid, 3);
    const updates = getPriorityUpdate(GLOBALS.current);
    setPriorityUpdates(updates);
  }

  async function postpone() {
    setReady(false);
    // TODO: postpone
    nextIb();
  }

  if (!ready) return <div>Loading...</div>;

  if (currentIb == null) {
    return <div>
      Finished for today.
      <a onClick={offLearn}>Return</a>
    </div>
  } 

  const content = currentIb.block!.content.split('\n')[0];

  // Handle changes related to priority.
  // Manual priority overrides algorithm-decided priority.
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
  const meanPriority = manualPriority ?? newBeta.mean;

  // Handle scheduling
  let nextDue = todayMidnight();
  if (interval) {
    nextDue = addDays(nextDue, interval);
  }

  return (
    <div className="flex flex-col bg-white w-full text-sm">
      <div 
        className="flex py-2 hover:bg-gray-100 text-gray-800 "
        onClick={() => logseq.App.pushState('page', { name: currentIb.uuid })}
      >
        <span className="w-2/12">{(currentIb.sample!*100).toFixed(2)}%</span>
        <span className="w-full">{content}</span>
      </div>

      <hr></hr>

      <div className="py-2">
        <p>Priority</p>
        <div className="flex items-center">
          <div className="border grow-0">
            <BetaGraph beta={currentIb.beta!} width={120} height={60}></BetaGraph>
          </div>
          <p className="grow">→</p>
          <div className="border grow-0">
            <BetaGraph beta={newBeta!} width={120} height={60}></BetaGraph>
          </div>
        </div>
        <div className="py-1 px-6">
          <PrioritySlider
            init={meanPriority}
            onChange={updateManualPriority}
          ></PrioritySlider>
        </div>
      </div>

      <div className="py-2">
        <p>Schedule</p>

        <div className="flex items-center">
          {/* <DatePicker
            className="border"
            selected={currentIb.dueDate}
            dateFormat="dd/MM/yyyy"
            disabled
          /> */}
          <p className="border grow">
            {format(currentIb.dueDate!, 'dd/MM/yyyy')}
          </p>
          <p className="grow">→</p>
          <DatePicker
            className="border grow"
            selected={nextDue}
            onChange={(date) => date && setInterval(dateDiffInDays(todayMidnight(), date))}
            minDate={new Date()}
            monthsShown={1}
            dateFormat="dd/MM/yyyy"
          />
        </div>

        <div className="flex items-center py-1">
          <span>Interval</span>
          <input
            className="border grow-0" 
            type="number" 
            value={interval}
            onChange={(e) => setInterval(parseFloat(e.target.value))}
            min="1" 
            step="1"
          >
          </input>
          <div className="grow"></div>
          <button
            className="border"
            onClick={postpone}
          >
            Postpone
          </button>
        </div>
      </div>

      <hr></hr>

      <div className="flex py-2">
        <button 
          className="bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-4 border-blue-700 hover:border-blue-500 rounded" 
          onClick={nextIb}
        >
          Next
        </button>
        <button 
          className="hover:bg-gray-100 border py-1 px-1 w-1/6 rounded" 
          onClick={offLearn}
        >
          Stop
        </button>
      </div>

      {updatesHtml}
    </div>
  );
}