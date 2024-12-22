import React, { useEffect, useState } from "react";
import { useAppVisible } from "./logseq/events";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { PARENT_MAIN_CONTAINER_ID } from "./globals";

export default function BarApp() {
  const visible = useAppVisible();
  const dispatch = useAppDispatch();
  const learning = useAppSelector(state => state.learn.learning);
  const [sizeAndPos, setSizeAndPos] = useState({ width: innerWidth*.5, height: 50, left: 0, top: innerHeight-50 });

  useEffect(() => {
    const mainContainer = parent.document.getElementById(PARENT_MAIN_CONTAINER_ID);
    
    const updateSizeAndPosition = () => {
      if (mainContainer) {
        const rect = mainContainer.getBoundingClientRect();
        setSizeAndPos({
          // Don't know why the width overestimates by ~15px
          width: rect.width-15,
          height: sizeAndPos.height,
          left: rect.x,
          top: 300,// innerHeight - sizeAndPos.height,
        });
      }
    };

    const resizeObserver = new ResizeObserver(updateSizeAndPosition);
    if (mainContainer) resizeObserver.observe(mainContainer);
    updateSizeAndPosition();
    
    return () => {
      resizeObserver.disconnect();
    };    
  }, [])

  if (!learning) return <></>;

  return (
    <div
      id="ib-review-bar-content"
      className="border border-2 rounded shadow-sm p-1"
      style={{
        position: "relative",
        zIndex: 3,
        left: sizeAndPos.left,
        width: sizeAndPos.width,
        backgroundColor: `var(--ls-primary-background-color, var(--ls-primary-background-color-plugin))`,
        color: `var(--ls-primary-text-color, var(--ls-primary-text-color-plugin))`,
        transition: 'background-color 0.3s, color 0.3s',
      }}
    >
       Review bar
      <button onClick={() => console.log('hoi')}>Hoi</button>
    </div>
  );
}
