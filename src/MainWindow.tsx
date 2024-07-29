import React, { useEffect, useRef, useState } from "react";
import { queryIncrementalBlocks, useAppVisible } from "./utils";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";

export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<BlockEntity[]>([]);

  useEffect(() => {
    let ignore = false;

    async function getBlocks() {
      try {
        let bs = await queryIncrementalBlocks();
        bs = bs.sort((a, b) => b.properties!['ib-sample'] - a.properties!['ib-sample']);
        console.log(bs);
        setBlocks(bs);
      } catch (e) {
        console.error(e)
      }
    }

    getBlocks();

    return () => { ignore = true };
  }, []);

  const blockItems = blocks.map(block => {
    return <li key={block.uuid}>{block.content}</li>
  });

  return (
    <div ref={ref} id="ib-main" className="absolute top-10 right-10 bg-white rounded-lg p-3 w-96 border flex flex-col">
        Damn fam
        <ul>{blockItems}</ul>
    </div>
  );
}