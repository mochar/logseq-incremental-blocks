import React from "react";
import IbItem from "../widgets/IbItem";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { doneRep, finishRep, laterRep, stopLearning, toggleAutoIb } from "./learnSlice";
import CuteToggle from "../widgets/CuteToggle";
import * as theme from "../utils/theme";
import PriorityComponent from "./PriorityComponent";
import ScheduleComponent from "./ScheduleComponent";
import CardComponent from "./CardComponent";

export default function LearnView() {
  const [busy, setBusy] = React.useState<boolean>(false);
  const dispatch = useAppDispatch();
  const queueStatus = useAppSelector(state => state.learn.queueStatus);
  const currentQib = useAppSelector(state => state.learn.current?.qib);

  React.useEffect(() => {
    if (currentQib == null) return;

    // Move to next ib page.
    const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
    if (openIb) {
      logseq.App.pushState('page', { name: currentQib.uuid })
    }
  }, [currentQib]);

  function quit() {
    dispatch(stopLearning());
  }

  if (queueStatus == 'busy') return <div>Loading...</div>;

  if (currentQib == null) {
    return <div>
      Finished for today.
      <button className="border" onClick={quit}>Return</button>
    </div>
  } 

  const isCard = currentQib.cardId != undefined;

  return (
  <form onSubmit={(e) => e.preventDefault()}  className={busy ? 'animate-pulse': ''}>
  <fieldset disabled={busy}>
    <div className="flex flex-col w-full text-sm">

      <HeaderComponent></HeaderComponent>

      <div className={`${theme.BORDER} rounded`}>
        <IbItem qib={currentQib} nChars={270}></IbItem>
      </div>

      <PriorityComponent></PriorityComponent>

      {isCard && <CardComponent setBusy={setBusy}></CardComponent>}
      {!isCard && <IbComponent setBusy={setBusy}></IbComponent>}

    </div>
  </fieldset></form>
  );
}

function HeaderComponent() {
  const dispatch = useAppDispatch();
  const currentIb = useAppSelector(state => state.learn.current!.ib);
  const autoIb = useAppSelector(state => state.learn.autoIb);
  const [autoOpen, setAutoOpen] = React.useState<boolean>(logseq.settings?.learnAutoOpen as boolean ?? true);

  function toggleAutoOpen() {
    logseq.updateSettings({ learnAutoOpen: !autoOpen });
    setAutoOpen(!autoOpen);
  }

  return (
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
  );
}

function IbComponent({ setBusy }: { setBusy: (busy: boolean) => void }) {
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

  async function later() {
    setBusy(true);
    await dispatch(laterRep({}));
    setBusy(false);
  }

  function quit() {
    dispatch(stopLearning());
  }

  return (
  <>
    <ScheduleComponent setBusy={setBusy}></ScheduleComponent>

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
        onClick={later}
      >
        Later
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
