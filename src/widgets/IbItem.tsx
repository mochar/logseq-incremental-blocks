import React from "react";
import { PRIORITY_PALETTE } from "../globals";
import { interpolateColor } from "../utils/utils";
import { QueueIb } from "../types";

export default function IbItem({ qib, nChars }: { qib: QueueIb, nChars?: number }) {
  // If block is page property block, then it has no content field.
  // At least the one i checked..
  let content = qib.content;
  if (content) {
    content = content.split('\n')[0];
    if (nChars && content.length > nChars) {
      content = content.substring(0, nChars) + '...';
    }
  }

  const bgColor = interpolateColor(PRIORITY_PALETTE, 1-qib.priority);

  return <div
    className={`flex items-baseline cursor-pointer w-full text-sm`}
    onClick={() => logseq.App.pushState('page', { name: qib.uuid })}
  >
    <span 
      className="w-12 text-xs text-center font-medium m-1 px-1 py-0.5 rounded dark:text-gray-600"
      style={{ backgroundColor: bgColor }}
    >
      {(qib.priority*100).toFixed(2)}%
    </span>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis'}}>{content}</span>
    {/* <span>{ qib.cardId ? 'Card' : 'Source'}</span> */}
  </div>;
}
