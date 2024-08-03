import { GLOBALS } from "../globals";
import IncrementalBlock from "../IncrementalBlock";
import React from "react";
import { Virtuoso } from "react-virtuoso";
import IbItem from "./IbItem";

const queue = GLOBALS.queue;

export default function Queue({ onLearn } : { onLearn: () => void }) {
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [iblocks, setIblocks] = React.useState<IncrementalBlock[]>([]);

  //@ts-ignore
  console.log((logseq.settings?.subsetQueries ?? '').split(', '));
  //@ts-ignore
  const [refs, setRefs] = React.useState<string[]>((logseq.settings?.subsetQueries ?? '').split(', ').filter((r) => !/^\s*$/.test(r)));
  const [selectedRefs, setSelectedRefs] = React.useState<string[]>(queue.refs);

  React.useEffect(() => {
    if (!queue.refreshed.completed) {
      setRefreshing(true);
      queue.refreshed.promise.then(() => {
        setIblocks(queue.ibs);
        setRefreshing(false);
      });
    } else {
      const minutesSinceLastRefresh = queue.minutesSinceLastRefresh();
      const minutesThreshold = logseq.settings?.queueTimer as number ?? 1.;
      if (minutesSinceLastRefresh != null && minutesSinceLastRefresh > minutesThreshold) {
        refresh();
      } else {
        setIblocks(queue.ibs)
      }
    }
  }, []);

  async function refresh() {
    setRefreshing(true);
    console.log('refreshing...');
    // TODO: check new day. update priorities.
    await queue.refresh();
    setIblocks(queue.ibs);
    setRefreshing(false);
    console.log('refreshed!');
  }

  function toggleRef(ref: string) {
    const index = selectedRefs.indexOf(ref);
    let newSelected = [...selectedRefs];
    if (index > -1) {
      newSelected.splice(index, 1);
    } else {
      newSelected = [...selectedRefs, ref];
    }
    setSelectedRefs(newSelected);
    queue.refs = newSelected;
    refresh();
  }

  async function removeRef(ref: string) {
    if (selectedRefs.includes(ref)) toggleRef(ref);
    const newRefs = [...refs];
    newRefs.splice(newRefs.indexOf(ref), 1);
    setRefs(newRefs);
    logseq.updateSettings({ subsetQueries: newRefs.join(', ') });
  }

  const refButtons = refs.map((r) => {
    const selected = selectedRefs.includes(r);
    const classes = selected ? 'bg-gray-200 ring-1 ring-offset-1 ring-gray-500' : '';
    return (
      <span 
        key={r}
        className={"inline-flex items-center text-xs px-2 py-1 me-2 font-medium text-gray-900 bg-gray-100 rounded hover:bg-gray-200 hover:text-gray-900" + classes}
      >
        <button 
          type="button" 
          onClick={() => toggleRef(r)} 
          className="inline-flex items-center text-xs bg-transparent rounded-sm hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {r}
        </button>
        <button type="button" onClick={() => removeRef(r)} className="inline-flex items-center p-1 ms-2 text-xs text-gray-400 bg-transparent rounded-sm hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-300">
          <svg className="w-2 h-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
        </button>
      </span>
    );
  });

  let queueView;
  if (iblocks.length > 0) {
    queueView = (
    <div className="mt-1">
      {/* <div className="py-2">
        <input 
          type="text" 
          className="bg-neutral-100 text-gray-900 focus:ring-transparent text-sm rounded-lg block w-full p-2.5">
        </input>
      </div> */}
      {refButtons.length > 0 && <div className="p-2 space-y-1">
        {refButtons}
      </div>}
      <Virtuoso
        style={{ height: '250px' }}
        totalCount={iblocks.length}
        itemContent={(i) => IbItem({ ib: iblocks[i] })}
      ></Virtuoso>
    </div>
    );
  } else {
    queueView = (
      <div className="text-neutral-500 flex justify-center">
        <span>Queue is empty.</span>
      </div>
    );
  }

  return (
    <form><fieldset disabled={refreshing}><div>
      <div className="flex justify-between">
        <button 
          className={`bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded ${iblocks.length == 0 && "cursor-not-allowed"}`}
          disabled={iblocks.length == 0}
          onClick={onLearn}
        >
          Learn 
        </button>
        <button 
          className="hover:bg-gray-100 border py-1 px-1 rounded" 
          onClick={refresh}
        >
          🔄
        </button>
      </div>

    {refreshing && 
      <div className="text-neutral-500 flex justify-center">
        <span>Refreshing queue...</span>
      </div>
    }
    {!refreshing && queueView}
    </div></fieldset></form>
  );
}