import React, { useRef } from "react";
import LearnView from "../learn/LearnView";
import QueueView from "../learn/QueueView";
import { useAppSelector } from "../state/hooks";
import * as theme from "../utils/theme";

export default function LearnWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const learning = useAppSelector(state => state.learn.learning);

  return (
    <div 
      ref={ref} 
      id="ib-learn" 
      className={`absolute top-10 right-10 ${theme.BG} ${theme.TXT} rounded-lg p-2 w-96 border dark:border-gray-600 rounded shadow flex flex-col text-sm`}
    >
      {!learning && <QueueView></QueueView>}
      {learning && <LearnView></LearnView>}
    </div>
  );
}
