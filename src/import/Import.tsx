import React, { useState } from "react";
import Beta from "../algorithm/beta";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import PrioritySlider from "../widgets/PrioritySlider";
import { betaFromMean } from "../algorithm/priority";
import { capitalize } from "../utils/utils";
import YtUpload from "./YtUpload";
import HtmlUpload from "./HTMLUpload";
import DioUpload from "./DioUpload";
import { ImportFormat, importFormats } from "../types";

export default function Import() {
  const [format, setFormat] = React.useState<ImportFormat>(importFormats[0]);

  function formatSelected(e: any) {
    setFormat(e.target.value);
  }

  let uploadEl = <></>;
  if (format == 'youtube') {
    uploadEl = <YtUpload />;
  } else if (format == 'html') {
    uploadEl = <HtmlUpload />;
  } else {
    uploadEl = <DioUpload format={format} setFormat={setFormat} />;
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
                  onChange={formatSelected}
                />
                <span>{f == 'html' ? 'Web page' : capitalize(f)}</span>
              </label>
            );
          })}
        </div>

        {uploadEl}
      </div>
      
      <hr className="my-2" />
      
      <ExtractPanel />
    </div>
  );
}

function ExtractPanel() {
  const [beta, setBeta] = useState<Beta>(new Beta(1, 1));
  const [interval, setInterval] = useState<number>(initialIntervalFromMean(beta.mean));

  function update(priority: number) {
    setBeta(betaFromMean(priority));
    setInterval(initialIntervalFromMean(priority));
  }

  return (
    <div className="flex items-center space-x-1">
      <p>Priority</p>
      
      <div className="">
        <PrioritySlider
          beta={beta}
          varianceSlider={false}
          onMeanChange={update}
        ></PrioritySlider>
      </div>

      <p className="">Interval</p>
      <input 
        className="w-16 p-0 ml-2"
        type="number" 
        value={interval}
        onChange={(e) => setInterval(parseFloat(e.target.value))}
        min="1" 
        step="1"
      ></input>

      <div className="flex-1"></div>

      <button 
        className="py-1 px-2 rounded bg-primary/90 hover:bg-primary border-b-2 border-primary-700 hover:border-primary-500 text-primary-foreground border" 
        onClick={() => {}}
      >
         Import
      </button>
    </div>
  );
}
