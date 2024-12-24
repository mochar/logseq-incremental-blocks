import React from "react";
import BetaGraph from "../widgets/BetaGraph";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import Beta from "../algorithm/beta";

export default function PriorityPopover() {
  const dispatch = useAppDispatch();
  const currentIbData = useAppSelector(state => state.learn.current);
  
  if (!currentIbData) return <></>;

  const currentIb = currentIbData.ib;
  const curBeta = Beta.fromParams(currentIb.betaParams);
  const newBeta = Beta.fromParams(currentIbData.newPriority);
  
  return (
    <div className="p-1">
      <span>Priority</span>
      <div className="flex items-center justify-center">
        <div className="border grow-0">
          <BetaGraph beta={curBeta} width={120} height={60} />
        </div>
        <p className="text-neutral-400 px-2">🠲</p>
        <div className="border grow-0">
          <BetaGraph beta={newBeta} width={120} height={60} />
        </div>
      </div>
    </div>
  );
}
