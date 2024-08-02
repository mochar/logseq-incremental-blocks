import { GLOBALS } from "../globals";
import IncrementalBlock from "../IncrementalBlock";
import React from "react";
import { Virtuoso } from "react-virtuoso";

export default function Queue({ onLearn } : { onLearn: () => void }) {
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [iblocks, setIblocks] = React.useState<IncrementalBlock[]>([]);

  React.useEffect(() => {
    if (!GLOBALS.queue.refreshed.completed) {
      setRefreshing(true);
      GLOBALS.queue.refreshed.promise.then(() => {
        setIblocks(GLOBALS.queue.ibs);
        setRefreshing(false);
      });
    } else {
      const minutesSinceLastRefresh = GLOBALS.queue.minutesSinceLastRefresh();
      if (minutesSinceLastRefresh != null && minutesSinceLastRefresh > 1) {
        refresh();
      } else {
        setIblocks(GLOBALS.queue.ibs)
      }
    }
  }, []);

  async function refresh() {
    setRefreshing(true);
    console.log('refreshing...');
    // TODO: check new day. update priorities.
    await GLOBALS.queue.refresh();
    setIblocks(GLOBALS.queue.ibs);
    setRefreshing(false);
    console.log('refreshed!');
  }

  function createBlockItem(i: number) {
    const ib = iblocks[i];
    // const content = trimContent(ib.block!);
    const content = ib.block!.content.split('\n')[0];
    return <div
      className="flex bg-white hover:bg-gray-100 text-gray-800 py-2 w-full text-sm"
      onClick={() => logseq.App.pushState('page', { name: ib.uuid })}
    >
      <span className="w-2/12">{(ib.sample!*100).toFixed(2)}%</span>
      <span className="w-full">{content}</span>
    </div>;
  }

  let queueView;
  if (iblocks.length > 0) {
    queueView = (
    <div>
      {/* <div className="py-2">
        <input 
          type="text" 
          className="bg-neutral-100 text-gray-900 focus:ring-transparent text-sm rounded-lg block w-full p-2.5">
        </input>
      </div> */}
      <Virtuoso
        style={{ height: '250px' }}
        totalCount={iblocks.length}
        itemContent={createBlockItem}
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
          className={`bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-4 border-blue-700 hover:border-blue-500 rounded ${iblocks.length == 0 && "cursor-not-allowed"}`}
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