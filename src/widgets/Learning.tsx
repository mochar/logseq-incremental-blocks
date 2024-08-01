import React from "react";
import IncrementalBlock from "../IncrementalBlock";
import GLOBALS from "../globals";
import Beta from "../algorithm/beta";
import BetaGraph from "./BetaGraph";
import { getBlockHierarchyContent } from "../logseq/utils";
import { getPriorityUpdate, PriorityUpdate } from "../algorithm/priority";
import DatePicker from "react-datepicker";
import PrioritySlider from "./PrioritySlider";

export default function Learning({ offLearn }: { offLearn: () => void }) {
  const [ready, setReady] = React.useState<boolean>(false);
  const [currentIb, setCurrentIb] = React.useState<IncrementalBlock | null>();
  const [priorityUpdates, setPriorityUpdates] = React.useState<PriorityUpdate>();
  const manualPriority = React.useRef<number>();

  React.useEffect(() => {
    if (GLOBALS.current) {
      setCurrentIb(GLOBALS.current.ib);
      setReady(true);
    } else if (GLOBALS.queue.length == 0) {
      setCurrentIb(null);
      setReady(true);
    } else {
      nextIb();
    }
  }, []);

  React.useEffect(() => {
    if (currentIb) {
      getPriorityUpdates();
    }
  }, [currentIb]);

  async function nextIb() {
    setReady(false);

    if (currentIb) {
      // Update priority and schedule
      // TODO

      // Empty current ib data in globals
      delete GLOBALS.current;
    }

    // Clean up
    manualPriority.current = undefined;

    const ib = GLOBALS.queue.shift();
    if (!ib) {
      // Queue exhausted, learning finished.
      setCurrentIb(null);
      setReady(true);
      return;
    }

    // If there's a new ib in the queue, populate the global
    // current ib data, and then set.
    const contents = await getBlockHierarchyContent(ib.uuid, 3);
    GLOBALS.current = {
      ib: ib,
      start: new Date(),
      contents: contents,
      newContents: contents
    }
    setCurrentIb(ib); 
    setReady(true);
  }

  function setManualPriority(meanPiority: number) {
    manualPriority.current = meanPiority;
    GLOBALS.current!.manualPriority = meanPiority;
  }

  async function getPriorityUpdates() {
    if (!GLOBALS.current) return;
    GLOBALS.current.newContents = await getBlockHierarchyContent(GLOBALS.current.ib.uuid, 3);
    const updates = getPriorityUpdate(GLOBALS.current);
    setPriorityUpdates(updates);
  }

  if (!ready) return <div>Loading...</div>;

  if (currentIb == null) {
    return <div>
      Finished for today.
      <a onClick={offLearn}>Return</a>
    </div>
  } 

  const content = currentIb.block!.content.split('\n')[0];

  // Handle changes related to priority
  let newBeta = currentIb.beta!;
  let updatesHtml = <div></div>;
  if (priorityUpdates) {
    newBeta = new Beta(newBeta!.a + priorityUpdates.a, newBeta!.b);
    updatesHtml = <div>
      <span>Time: {priorityUpdates.aTime} ({priorityUpdates.scoreTime})</span>
      <span>Content: {priorityUpdates.aContent} ({priorityUpdates.scoreContent})</span>
    </div>
  }
  const meanPriority = manualPriority.current ? manualPriority.current : newBeta.mean;

  return (
    <div className="flex flex-col bg-white py-2 w-full text-sm">
      <div 
        className="flex hover:bg-gray-100 text-gray-800 "
        onClick={() => logseq.App.pushState('page', { name: currentIb.uuid })}
      >
        <span className="w-2/12">{(currentIb.sample!*100).toFixed(2)}%</span>
        <span className="w-full">{content}</span>
      </div>

      <hr></hr>

      <div className="py-2">
        <div className="flex">
          <BetaGraph beta={currentIb.beta!} width={120} height={60}></BetaGraph>
          <i className="ti ti-arrow-big-right-line"></i>
          <BetaGraph beta={newBeta!} width={120} height={60}></BetaGraph>
        </div>
        <PrioritySlider
          init={meanPriority}
          onChange={(val) => setManualPriority(val)}
        ></PrioritySlider>
      </div>

      <div className="flex py-2">
        <DatePicker
          className="border"
          selected={currentIb.dueDate}
          dateFormat="dd/MM/yyyy"
          disabled
        />
        <i className="ti ti-arrow-big-right-line"></i>
        {/* <DatePicker
          className="border"
          selected={currentIb.dueDate}
          onChange={(date) => updateDueDate(date)}
          minDate={new Date()}
          monthsShown={1}
          dateFormat="dd/MM/yyyy"
        /> */}
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