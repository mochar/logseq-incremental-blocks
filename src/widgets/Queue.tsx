import GLOBALS from "../globals";
import IncrementalBlock from "../IncrementalBlock";
import { queryDueIBlocks } from "../logseq/query";
import React from "react";
import { Virtuoso } from "react-virtuoso";

export default function Queue({ onLearn } : { onLearn: () => void }) {
  const [iblocks, setIblocks] = React.useState<IncrementalBlock[]>([]);

  React.useEffect(() => {
    let ignore = false;

    async function getBlocks() {
      try {
        let ibs = await queryDueIBlocks();
        ibs = ibs.sort((a, b) => b.sample! - a.sample!);
        setIblocks(ibs);
        GLOBALS.queue = ibs;
      } catch (e) {
        console.error(e)
      }
    }

    getBlocks();

    return () => { ignore = true };
  }, []);

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

  return (
    <div>
      <button 
        className="bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-4 border-blue-700 hover:border-blue-500 rounded" 
        onClick={onLearn}
      >
        Learn 
      </button>
      <input 
        type="text" 
        className="bg-neutral-100 text-gray-900 focus:ring-transparent text-sm rounded-lg block w-full p-2.5">
      </input>
      <Virtuoso
        style={{ height: '250px' }}
        totalCount={iblocks.length}
        itemContent={createBlockItem}
      ></Virtuoso>
    </div>
  );
}