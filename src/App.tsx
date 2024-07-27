import React, { useRef } from "react";
import { useAppVisible } from "./utils";

// This is our popup.
// The useAppVisible hook is used to close/open the popup.
function App() {
  const innerRef = useRef<HTMLDivElement>(null);
  const visible = useAppVisible();
  if (visible) {
    return (
      <main
        className="bg-transparent fixed inset-0 flex"
        onClick={(e) => {
          if (!innerRef.current?.contains(e.target as any)) {
            window.logseq.hideMainUI();
          }
        }}
      >
        <div ref={innerRef} className="absolute top-10 right-10 bg-white rounded-lg p-3 w-96 border flex flex-col">
          Damn fam
        </div>
      </main>
    );
  }
  return null;
}

export default App;
