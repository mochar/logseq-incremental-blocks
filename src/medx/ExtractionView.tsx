import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { extract, intervalChanged, mediaAttrsChanged, noteChanged, priorityChanged } from "./medxSlice";
import Beta from "../algorithm/beta";
import PrioritySlider from "../widgets/PrioritySlider";

export default function ExtractionView() {
  return (
    <div>
      <div className="flex space-x-2">
        <MediaAttributesPanel />
        <NotePanel />
      </div>
      <ExtractPanel />
    </div>
  );
}

function MediaAttributesPanel() {
  const dispatch = useAppDispatch();
  const mediaAttrs = useAppSelector(state => state.medx.mediaAttrs);
  
  return (
    <div className="flex flex-col space-y-0.5" style={{width:'25%'}}>
      <label className="flex items-center justify-between">
        <span>Loop</span>
        <input
          type="checkbox"
          checked={mediaAttrs.loop}
          onChange={() => dispatch(mediaAttrsChanged({ loop: !mediaAttrs.loop }))}
        />
      </label>
      <label className="flex items-center justify-between">
        <span className="">Speed</span>
        <input
          className="p-0"
          type="number" 
          value={mediaAttrs.rate}
          onChange={(e) => dispatch(mediaAttrsChanged({ rate: parseFloat(e.target.value) }))}
          min="0.1"
          max="5"
          step=".1"
        />
      </label>
      <label className="flex items-center justify-between">
        <span className="">Volume</span>
        <input
          className="p-0"
          type="number" 
          value={mediaAttrs.volume}
          onChange={(e) => dispatch(mediaAttrsChanged({ volume: parseFloat(e.target.value) }))}
          min="0"
          max="1"
          step=".1"
        />
      </label>
    </div>   
  );
}

function NotePanel() {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const dispatch = useAppDispatch();
  const note = useAppSelector(state => state.medx.note);

  React.useEffect(() => {
    if (ref.current) ref.current.value = note;
  }, [note]);

  async function updateNote(text: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (ref.current?.value == text) {
      dispatch(noteChanged(text));
    }
  }
  
  return (
    <label className="h-full" style={{width: '75%'}}>
      <textarea
        ref={ref}
        className="rounded p-1"
        placeholder="Note"
        rows={5}
        onChange={e => updateNote(e.target.value)}
      />
    </label>
  );
}

function ExtractPanel() {
  const dispatch = useAppDispatch();
  const betaParams = useAppSelector(state => state.medx.betaParams);
  const interval = useAppSelector(state => state.medx.interval);
  const beta = Beta.fromParams(betaParams);
  
  return (
    <div className="flex items-center">
      <p>Priority</p>
      
      <div className="">
        <PrioritySlider
          beta={beta}
          varianceSlider={false}
          onMeanChange={mean => dispatch(priorityChanged(mean))}
        ></PrioritySlider>
      </div>

      <p className="">Interval</p>
      <input 
        className="w-16 p-0 ml-2"
        type="number" 
        value={interval}
        onChange={(e) => dispatch(intervalChanged(parseFloat(e.target.value)))}
        min="1" 
        step="1"
      ></input>

      <button 
        className="ml-auto py-1 px-1 rounded bg-primary/90 hover:bg-primary border-b-2 border-primary-700 hover:border-primary-500 text-primary-foreground border" 
        onClick={() => dispatch(extract())}
      >
         Extract
      </button>
    </div>
  );
}
