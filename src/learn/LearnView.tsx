import React from "react";
import IbItem from "../widgets/IbItem";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { CurrentIBData, doneRep, finishRep, getPriorityUpdates, stopLearning, toggleAutoIb } from "./learnSlice";
import CuteToggle from "../widgets/CuteToggle";
import * as theme from "../utils/theme";
import PriorityComponent from "./PriorityComponent";
import ScheduleComponent from "./ScheduleComponent";
import CardComponent from "./CardComponent";

export default function LearnView() {
  const [busy, setBusy] = React.useState<boolean>(false);
  const [autoOpen, setAutoOpen] = React.useState<boolean>(logseq.settings?.learnAutoOpen as boolean ?? true);

  const dispatch = useAppDispatch();
  const queueStatus = useAppSelector(state => state.learn.queueStatus);
  const autoIb = useAppSelector(state => state.learn.autoIb);
  const currentIbData = useAppSelector(state => state.learn.current);
  // To keep track if ib changed
  const currentIbUuid = React.useRef<string | undefined>(currentIbData?.qib.uuid);

  if (currentIbUuid.current != currentIbData?.qib.uuid) {
    currentIbUuid.current = currentIbData?.qib.uuid;

    // Move to next ib page.
    if (currentIbData) {
      const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
      if (openIb) {
        logseq.App.pushState('page', { name: currentIbData.ib.uuid })
      }  
    }
  }

  // React.useEffect(() => {
  //   // On a timer, get new priority updates. This is because
  //   // time spent on an ib increases priority.
  //   let timer: NodeJS.Timeout;
  //   const getRepeatUpdates = async function() {
  //     await dispatch(getPriorityUpdates());
  //     timer = setTimeout(getRepeatUpdates, 2000);
  //   }
  //   getRepeatUpdates();
  //   return () => clearTimeout(timer);
  // }, []);

  React.useEffect(() => {
    if (currentIbData == null) return;

    // Move to next ib page.
    const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
    if (openIb) {
      logseq.App.pushState('page', { name: currentIbData.ib.uuid })
    }
  }, [currentIbUuid]);

  function quit() {
    dispatch(stopLearning());
  }

  function toggleAutoOpen() {
    logseq.updateSettings({ learnAutoOpen: !autoOpen });
    setAutoOpen(!autoOpen);
  }

  if (busy || queueStatus == 'busy') return <div>Loading...</div>;

  if (currentIbData == null) {
    return <div>
      Finished for today.
      <button className="border" onClick={quit}>Return</button>
    </div>
  } 

  const currentIb = currentIbData.ib;
  const isCard = currentIbData.qib.cardId != undefined;

  return (
    <div className="flex flex-col w-full text-sm">

      <div className="flex items-center py-1">
        <span className={`text-xs ${theme.TXT_MUTED}`}>🔁 {currentIb.reps!+1}</span>
        <div className="flex-grow"></div>
        <div className="mr-1">
          <CuteToggle 
            title="Auto ib" 
            tooltip="Automatically convert new blocks to ibs. Recommend to turn off for now due to sporadic behavior."
            state={autoIb} 
            onChange={() => dispatch(toggleAutoIb(!autoIb))} 
          />
        </div>
        <CuteToggle 
          title="Follow" 
          tooltip="Automatically jump to next block on rep."
          state={autoOpen} 
          onChange={toggleAutoOpen} 
        />
      </div>

      <div className={`${theme.BORDER} rounded`}>
        <IbItem qib={currentIbData.qib}></IbItem>
      </div>

      <PriorityComponent currentIbData={currentIbData}></PriorityComponent>

      {isCard && <CardComponent currentIbData={currentIbData}></CardComponent>}
      {!isCard && <IbComponent currentIbData={currentIbData} setBusy={setBusy}></IbComponent>}
    </div>
  );
}

function IbComponent({ currentIbData, setBusy }: { currentIbData: CurrentIBData, setBusy: (busy: boolean) => void }) {
  const dispatch = useAppDispatch();

  async function finish() {
    setBusy(true);
    await dispatch(finishRep());
    setBusy(false);
  }

  async function done() {
    setBusy(true);
    await dispatch(doneRep());
    setBusy(false);
  }

  function quit() {
    dispatch(stopLearning());
  }
  
  return (
  <>
    <ScheduleComponent
      currentIbData={currentIbData}
      setBusy={setBusy}
    ></ScheduleComponent>

    <hr className="dark:border-gray-800"></hr>

    <div className="flex justify-between pt-2">
      <button 
        className="w-fit bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded" 
        onClick={finish}
      >
        Next rep
      </button>
      <button 
        className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 ml-2 w-1/6 rounded`} 
        onClick={done}
      >
        Done
      </button>
      <div className="flex-grow"></div>
      <button 
        className={`${theme.BG.hover} ${theme.BORDER} py-1 px-1 w-1/6 rounded`}
        onClick={quit}
      >
        Quit
      </button>
    </div>
  </>
  );
}
