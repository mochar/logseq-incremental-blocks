import React from "react";
import * as theme from "../utils/theme";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { MainWindowTab, tabSelected } from "./mainSlice";
import QueueView from "./QueueView.tsx~";
import CalendarView from "./CalendarView.tsx~";
import AnkiView from "./AnkiView";
import RefsView from "./RefsView";
import { setMainView } from "../state/viewSlice";

export default function MainWindow() {
  const ref = React.useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const busy = useAppSelector((state) => state.main.busy);
  const activeTab = useAppSelector((state) => state.main.activeTab);
  const ankiMode = useAppSelector((state) => state.learn.anki);

  function close() {
    dispatch(setMainView(null));
  }

  const tabs = [
    <li key="queue">
      <Tab tab="queue" title="📚 Queue"></Tab>
     </li>,
    //... ankiMode ? [<li key="anki"><Tab tab="anki" title="⭐ Anki"></Tab></li>] : [],
    <li key="calendar">  
      <Tab tab="calendar" title="📅 Calendar"></Tab>
    </li>,
    <li key="refs">
      <Tab tab="refs" title="📄 Refs"></Tab>
    </li>
  ];

  let content = <>{activeTab}</>;
  if (activeTab == 'queue') {
    content = <QueueView/>
  } else if (activeTab == 'calendar') {
    content = <CalendarView />
  } else if (activeTab == 'anki') {
    content = <AnkiView />
  } else if (activeTab == 'refs') {
    content = <RefsView />
  }

  return (
  <div
    ref={ref}
    id="ib-main"
    style={{ minHeight: '30rem' }}
    className={`flex flex-col p-2 h-full ${theme.TXT}`}
  >
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Incremental blocks</h3>
      <button type="button" onClick={() => close()} className="inline-flex items-center p-1 text-gray-400 bg-transparent rounded-sm hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-300">
        <svg className="w-2 h-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
      </button>
    </div>
  
    <form onSubmit={(e) => e.preventDefault()} className={`w-full h-full ${busy && 'animate-pulse'}`}>
    <fieldset className="flex h-full" disabled={busy}>
      <ul className="flex-column space-y space-y-4 text-sm font-medium text-gray-500 dark:text-gray-400 md:me-4 mb-4 md:mb-0">
        {tabs}
      </ul>
      <div className="w-full text-sm">
        {content}
      </div>
    </fieldset>
    </form>
  </div>
  );
}

function Tab({ tab, title }: { tab: MainWindowTab, title: string }) {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.main.activeTab);

  const active = activeTab == tab;

  const classes = active ? 
    'bg-gray-200 dark:bg-gray-600 active' : 
    'hover:text-gray-900 bg-gray-50 hover:bg-gray-100 w-full dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-white';
  
  return (
  <a 
    href="#" 
    className={`inline-flex items-center min-w-max px-4 py-3 rounded-lg active w-full ${classes}`}
    onClick={() => dispatch(tabSelected(tab))}
  >
    <span>{title}</span>
  </a>
  );
}
