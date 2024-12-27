import React, { useRef } from "react";

export default function EditorApp({ unmount }: { unmount: Function }) {
  const ref = useRef<HTMLElement>(null);
  
  return (
    <div ref={ref} className="extensions__pdf-container">
      <div className="extensions__pdf-viewer-cnt visible-scrollbar">
        <div className="extensions__pdf-viewer overflow-x-auto">
          <div id="ib-editor" className="bg-secondary h-full">
            <button onClick={() => unmount()}>Close</button>
            <span>is that leather?</span>          
          </div>
        </div>
      </div>
      <button onClick={() => unmount()}>
        <i className="ti ti-cross"></i>
      </button>
      <Resizer container={ref} />
    </div>
  );
}

function Resizer({ container }: { container: React.RefObject<HTMLElement> }) {
  const docEl = parent!.document.documentElement;
  const ref = useRef<HTMLElement>(null);

  const adjustMainSize = debounce(200, (width: number) => {
    docEl.style.setProperty('--ph-view-container-width', width + 'vw');
  });
  
  function onDrag(e: DragEvent) {
    if (!container.current) return;
    const width = docEl.clientWidth;
    const offset = e.clientX;
    // Last drag event always 0 for some reason
    if (offset == 0) return;
    const elRatio = offset / width;
    const adjustedWidth = Math.min(Math.max(elRatio * 100, 20), 80);
    container.current.style.width = adjustedWidth + 'vw';
    adjustMainSize(adjustedWidth);
  }

  function onDragStart() {
    parent!.document.documentElement.classList.add("is-resizing-buf");
  }

  function onDragEnd() {
    parent!.document.documentElement.classList.remove("is-resizing-buf");
  }

  return (
    <span
      ref={ref}
      className="extensions__pdf-resizer"// bg-[color:var(--ls-border-color)]"
      style={{ width: 5 }}
      onDrag={onDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    ></span>
  );
}

function debounce(delay: number, callback: Function) : Function {
  let timeout: NodeJS.Timeout;
  return (...args: any) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
