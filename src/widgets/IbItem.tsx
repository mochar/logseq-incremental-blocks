import React from "react";
import IncrementalBlock from "../IncrementalBlock";
import { PRIORITY_PALETTE } from "../globals";
import { interpolateColor } from "../utils/utils";
import * as theme from "../utils/theme";

export default function 
IbItem({ ib }: { ib: IncrementalBlock }) {

  // If block is page property block, then it has no content field.
  // At least the one i checked..
  let content = ib.block!.content;
  if (content) {
    content = content.split('\n')[0];
  }

  const bgColor = interpolateColor(PRIORITY_PALETTE, 1-ib.sample!);

  return <div
    className={`flex items-baseline cursor-pointer ${theme.BG.hover} w-full text-sm`}
    onClick={() => logseq.App.pushState('page', { name: ib.uuid })}
  >
    <span 
      className="w-12 text-xs text-center font-medium m-1 px-1 py-0.5 rounded dark:text-gray-600"
      style={{ backgroundColor: bgColor }}
    >
      {(ib.sample!*100).toFixed(2)}%
    </span>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis'}}>{content}</span>
  </div>;
}