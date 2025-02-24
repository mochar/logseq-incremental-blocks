import React, { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { extractSelection } from "./docxSlice";
import { parseHtml } from "../utils/utils";

export default function DocxWindow() {
  const ref = useRef<HTMLIFrameElement>(null);
	const data = useAppSelector(state => state.docx.data);
	const dispatch = useAppDispatch();

  useEffect(() => {
		const el = parseHtml(data.content).documentElement;
	  el.getElementsByTagName('body').item(0).setAttribute('contentEditable', 'true');
	  ref.current.srcdoc = el.innerHTML;
  }, [data]);

  async function save() {
  }

  async function extract() {
		await dispatch(extractSelection(ref.current.contentDocument));
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
