import React, { useRef, useState } from "react";
import GLOBALS from "../globals";
import Queue from "./Queue";
import Learning from "./Learning";
import { logseq as PL } from "../../package.json";

export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const [learning, setLearning] = useState<boolean>(GLOBALS.learning);

  function toggleLearning(learning?: boolean) {
    learning = learning ?? !GLOBALS.learning;
    GLOBALS.learning = learning;
    delete GLOBALS.current;
    setLearning(learning);

    const color = learning ? 'hotpink' : 'dimgrey';
    logseq.provideStyle(`
      #${PL.id} {
        color: ${color};
      }
    `);
  }

  return (
    <div 
      ref={ref} 
      id="ib-main" 
      className="absolute top-10 right-10 bg-white rounded-lg p-2 w-96 border border-gray-400 rounded shadow flex flex-col text-sm"
    >
        {!learning && <Queue onLearn={() => toggleLearning(true)}></Queue>}
        {learning && <Learning offLearn={() => toggleLearning(false)}></Learning>}
    </div>
  );
}