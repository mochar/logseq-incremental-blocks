import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { getPriorityUpdates, manualIntervention } from "./learnSlice";
import * as theme from "../utils/theme";
import BetaGraph from "../widgets/BetaGraph";

export default function PriorityComponent() {
  const dispatch = useAppDispatch();
  const currentIbData = useAppSelector(state => state.learn.current);
  let pollTimer: NodeJS.Timeout;
  
  React.useEffect(() => {
    // On a timer, get new priority updates. This is because
    // time spent on an ib increases priority.
    pollTimer = setInterval(() => dispatch(getPriorityUpdates()), 2000);
    return () => clearInterval(pollTimer);
  }, []);

  function updateManualPriority(meanPiority: number | null) {
    dispatch(manualIntervention({ priority: meanPiority }))
  }

  if (!currentIbData) return <></>;

  const currentIb = currentIbData.ib;

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

  return (
    <div className={`${theme.BORDER}`}>
      <BetaGraph beta={currentIb.beta!} width={60} height={30}></BetaGraph>
      {/* <BetaGraph beta={newBeta!} width={120} height={60}></BetaGraph> */}
    </div>
  );
}
