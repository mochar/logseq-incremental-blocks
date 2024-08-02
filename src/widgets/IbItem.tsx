import React from "react";
import IncrementalBlock from "../IncrementalBlock";
import { PRIORITY_PALETTE } from "../globals";
import { interpolateColor } from "../utils";

export default function IbItem({ ib }: { ib: IncrementalBlock }) {

  const content = ib.block!.content.split('\n')[0];
  const bgColor = interpolateColor(PRIORITY_PALETTE, 1-ib.sample!);

  return <div
    className="flex items-start cursor-pointer bg-white hover:bg-gray-100 text-gray-800 w-full text-sm"
    onClick={() => logseq.App.pushState('page', { name: ib.uuid })}
  >
    <span 
      className="w-fit text-xs font-medium m-1 px-1 py-0.5 rounded"
      style={{ backgroundColor: bgColor }}
    >
      {(ib.sample!*100).toFixed(2)}%
    </span>
    <span className="w-full">{content}</span>
  </div>;
}