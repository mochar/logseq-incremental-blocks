import React from "react";
import ExtractsView from "./ExtractsView";
import SubsView from "./SubsView";

type JumpTabKey = 'extracts' | 'subs';

interface JumpTab {
  key: JumpTabKey,
  name: string
}

export default function JumpView() {
  const [tab, setTab] = React.useState<JumpTabKey>('extracts');
  const tabs = new Array<JumpTab>(
    { key: 'extracts', name: 'Extracts' },
    { key: 'subs', name: 'Subtitles' }
  );
  
  const tabElements = tabs.map(t => {
    const selected = tab == t.key;
    const classes = selected
      ? 'text-blue-600  border-blue-600 active dark:text-blue-500 dark:border-blue-500'
      : 'border-transparen hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300t';
    return (
      <li className="me-2">
        <a
          href="#"
          onClick={() => setTab(t.key)}
          className={`inline-block p-2 border-b-2 rounded-t-lg ${classes}`}>
          {t.name}
        </a>
      </li>
    );
  });
  
  return (
    <div className="h-full flex flex-col">
      <div className="font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px">
          { tabElements }
        </ul>
      </div>

      {tab == 'extracts' && <ExtractsView />}
      {tab == 'subs' && <SubsView />}
    </div>
  );
}

