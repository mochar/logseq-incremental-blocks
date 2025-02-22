import React from "react";
import { capitalize } from "../utils/utils";
import YtUpload from "./YtUpload";
import HtmlUpload from "./HTMLUpload";
import DioUpload from "./DioUpload";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { formatSelected } from "./importSlice";
import { importFormats } from "./types";

export default function Import() {
  const busy = useAppSelector(state => state.import.busy);
  const format = useAppSelector(state => state.import.format);
  const dispatch = useAppDispatch();
  
  function selectFormat(e: any) {
    dispatch(formatSelected(e.target.value));
  }

  let uploadEl = <></>;
  if (format == 'youtube') {
    uploadEl = <YtUpload />;
  } else if (format == 'html') {
    uploadEl = <HtmlUpload />;
  } else {
    uploadEl = <DioUpload />;
  }
  
  return (
    <div className="w-lsm">
      <p className="font-medium">Import</p>

      <div className="space-y-2">
        <div className="flex space-x-3 mb-2">
          {importFormats.map(f => {
            return (
              <label key={f} className="flex items-center space-x-1">
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={format == f}
                  onChange={selectFormat}
                />
                <span>{f == 'html' ? 'Web page' : capitalize(f)}</span>
              </label>
            );
          })}
        </div>

        {uploadEl}
      </div>
    </div>
  );
}

