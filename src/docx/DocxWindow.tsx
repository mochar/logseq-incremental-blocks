import React, { useEffect, useRef } from "react";

export default function DocxWindow() {
  const ref = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    load();
  }, []);

  async function load() {
    const content = await logseq.caller.callAsync(`api:call`, {
        method: 'read-plugin-storage-file',
      args: ["../../", '_1735415132688_0', true]
    });
    if (content) {
      const el = document.createElement('html');
      el.innerHTML = content;
      el.getElementsByTagName('body').item(0).setAttribute('contentEditable', 'true');
      console.log(el);
      ref.current.srcdoc = el.innerHTML;
    }
  }

  async function save() {
    //    ref.current.innerHTML
  }
  
  return (
    <div className="h-full">
      <div>
        <button
          onClick={save}
        >
          <span>Save</span>
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
