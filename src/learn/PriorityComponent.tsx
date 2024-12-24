import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { manuallyPrioritized, Popover, popoverVisible } from "./learnSlice";
import * as theme from "../utils/theme";
import Beta from "../algorithm/beta";
import PrioritySlider from "../widgets/PrioritySlider";

export default function PriorityComponent() {
  const dispatch = useAppDispatch();
  const currentIbData = useAppSelector(state => state.learn.current);
  
  function updateManualPriority(meanPiority: number | null) {
    dispatch(manuallyPrioritized(meanPiority));
  }

  if (!currentIbData) return <></>;

  const currentIb = currentIbData.ib;
  const curBeta = Beta.fromParams(currentIb.betaParams);
  const newBeta = Beta.fromParams(currentIbData.newPriority);

  return (
    <>
      <div
        className="flex border px-1"
        style={{ borderWidth: '0px 1px 0px 1px' }}
        onMouseEnter={() => dispatch(popoverVisible(Popover.priority))}
      >
        <div className="self-center flex">
          <PrioritySlider
            beta={newBeta}
            onMeanChange={updateManualPriority}
          ></PrioritySlider>
          {currentIbData.manualPriority &&
            <button
              className={`${theme.BORDER} ${theme.BG.hover} text-neutral-600`}
              onClick={() => updateManualPriority(null)}
            >
              <span>⮌</span>
            </button>
          }
        </div>
      </div>
    </>
  );
}
