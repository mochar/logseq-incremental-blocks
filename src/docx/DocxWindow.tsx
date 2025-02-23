import React, { useEffect, useRef } from "react";
import { highlightSelection } from "./selection";

function buildCSSStyle() : string {
	return `
	<style type="text/css">
	.extract {
	  background: pink;
	  cursor: pointer;
	}
	</style>
	`;
}

export default function DocxWindow() {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
		let content = await logseq.caller.callAsync(`api:call`, {
        method: 'read-plugin-storage-file',
      args: ["../../", '_1735415132688_0', true]
    }) as string;
    if (content) {
			// Inject CSS
			content = content.replace('</head>', `${buildCSSStyle()}</head>`);

			// 
      const el = document.createElement('html');
      el.innerHTML = content;
      el.getElementsByTagName('body').item(0).setAttribute('contentEditable', 'true');
      ref.current.srcdoc = el.innerHTML;
    }
  }

  async function save() {
    //    ref.current.innerHTML
  }

  async function extract() {
		const selection = ref.current.contentDocument.getSelection();
		if (!selection.rangeCount) return;
		const uuid = await logseq.Editor.newBlockUUID();
		highlightSelection(selection, ref.current.contentDocument, ['extract', `extract-${uuid}`]);
		
  }
  
  return (
    <div className="h-full">
      <div>
        <button
          onClick={save}
        >
          <span>Save</span>
        </button>
        <button
          onClick={extract}
        >
          <span>Extract</span>
        </button>
      </div>
      <iframe
        ref={ref}
        className="w-full h-full"
      >
      </iframe>
    </div>
  );
}
