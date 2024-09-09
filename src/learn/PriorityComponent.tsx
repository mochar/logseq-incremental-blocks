import React from "react";
import { useAppDispatch } from "../state/hooks";
import { CurrentIBData, manualIntervention } from "./learnSlice";
import * as theme from "../utils/theme";
import BetaGraph from "../widgets/BetaGraph";
import PrioritySlider from "../widgets/PrioritySlider";

export default function PriorityComponent({ currentIbData }: { currentIbData: CurrentIBData }) {
  const dispatch = useAppDispatch();

  function updateManualPriority(meanPiority: number | null) {
    dispatch(manualIntervention({ priority: meanPiority }))
  }

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
    <div className="pt-2">

      <div className="flex items-center justify-between">
        <p>Priority</p>
        <p>
          {prioritizeManually && <span className="text-neutral-600">
            manual
            <button
            className={`button ${theme.BORDER} ${theme.BG.hover}`}
            onClick={() => updateManualPriority(null)}
            >
              <span>⮌</span>
            </button>
          </span>
          }
        </p>
      </div>

      <div className="flex items-center justify-center">
        <div className={`${theme.BORDER} grow-0`}>
          <BetaGraph beta={currentIb.beta!} width={120} height={60}></BetaGraph>
        </div>
        <p className="text-neutral-400 px-2">🠲</p>
        <div className={`${theme.BORDER} grow-0`}>
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
  );
}