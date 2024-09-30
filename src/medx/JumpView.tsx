import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { Virtuoso } from "react-virtuoso";
import { secondsToString } from "../utils/datetime";
import * as theme from "../utils/theme";
import { rangeHighlighted, selectionChanged } from "./medxSlice";

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
    </div>
  );
}

function ExtractsView() {
  const ref  = React.useRef<HTMLDivElement>(null);
  const extracts = useAppSelector(state => state.medx.active?.extracts ?? []);
  const duration = useAppSelector(state => state.medx.duration)!;
  const dispatch = useAppDispatch();

  function renderExtract(index: number) {
    const extract = extracts[index];
    const content = extract.block.content.split(/\r?\n/)[0];
    const start = extract.medFrag.start ?? 0;
    const end = extract.medFrag.end ?? duration;
    return (
      <button
        className={`text-left w-full ${theme.BG.hover}`}
        onMouseEnter={() => dispatch(rangeHighlighted([start, end]))}
        onMouseLeave={() => dispatch(rangeHighlighted(null))}
        onClick={() => dispatch(selectionChanged([start, end]))}
      >
        <p>{ content }</p>
        <span className={`${theme.TXT_MUTED}`}>
          [{ secondsToString(start) } - { secondsToString(end) }]
        </span>
      </button>
    );
  }
  
  return (
    <div className="h-full" ref={ref}>
      <Virtuoso
        style={{ height: ref.current?.clientHeight ?? 360, overflowX: 'clip' }}
        totalCount={extracts.length}
        itemContent={renderExtract}
      ></Virtuoso>
    </div>
  );
}
