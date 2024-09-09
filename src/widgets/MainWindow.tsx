import React, { useRef } from "react";
import LearnView from "../learn/LearnView";
import QueueView from "../learn/QueueView";
import { useAppSelector } from "../state/hooks";

export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const learning = useAppSelector(state => state.learn.learning);

  return (
    <div 
      ref={ref} 
      id="ib-main" 
      className="absolute top-10 right-10 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 rounded-lg p-2 w-96 border dark:border-gray-600 rounded shadow flex flex-col text-sm"
    >
      {!learning && <QueueView></QueueView>}
      {learning && <LearnView></LearnView>}
    </div>
  );
}