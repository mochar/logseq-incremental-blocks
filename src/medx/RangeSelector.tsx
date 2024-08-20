import React, { useMemo } from "react";
import { Range } from "react-range";
import { IRenderThumbParams, IRenderTrackParams } from "react-range/lib/types";
import { secondsToString } from "../utils";

interface RangeSelectorProps {
  length: number,
  initStart?: number,
  initEnd?: number,
  onChange?: (range: number[]) => void
}

export default function RangeSelector({ length, initStart, initEnd, onChange }: RangeSelectorProps) {
  // Selected extract range
  const [range, setRange] = React.useState([initStart ?? 0, initEnd ?? length]);
  const middle = range[0] + 0.5*(range[1] - range[0]);
  const minRange = Math.min(length, 2);

  const zoomMax = React.useMemo(() : number => {
    const maxRight = 1 - Math.max(minRange/2, range[1]-middle) / (length - middle);
    const maxLeft = 1 - Math.max(minRange/2, middle-range[0]) / middle;
    const zoomMax = Math.max(maxRight, maxLeft);
    return zoomMax;
  }, [range]);

  const [zoom, setZoom] = React.useState<number>(0.8 * zoomMax);
  // Min and max of slider
  const [times, setTimes] = React.useState(timesFromZoom());

  function timesFromZoom() : number[] {
    // const r = middle + Math.max((1-zoom)*(length-middle), Math.max(minRange/2, range[1]-middle));
    // const l = middle - Math.max((1-zoom)*middle, Math.max(minRange/2, middle-range[0]));
    const r = range[1] + (1-zoom)*(length-range[1]);
    const l = range[0] - (1-zoom)*range[0];
    return [l, r];
  }

  function zoomUpdated() {
    const times_ = timesFromZoom();
    setTimes(times_);
  }

  function onRangeChanged(values: number[]) {
    setRange(values);
    if (onChange) onChange(values);
  }

  function renderTrack({ props, children, isDragged, disabled }: IRenderTrackParams) {
    return (<div
      {...props}
      style={{
        ...props.style,
        height: "6px",
        width: "100%",
        backgroundColor: "#ccc",
      }}
    >
      {children}
    </div>);
  }

  function renderThumb({ props }: IRenderThumbParams) {
    return (<div
      {...props}
      key={props.key}
      style={{
        ...props.style,
        height: "12px",
        width: "12px",
        backgroundColor: "#999",
      }}
    />);
  }

  return (
  <div className="flex flex-col">

    <div className="flex items-center">
      <span>Zoom</span>
      <input 
        className="w-full ml-2"
        type="range" 
        min={0} 
        max={zoomMax*100} 
        step={1}
        value={zoom*100} 
        onChange={(e) => setZoom(parseFloat(e.target.value)/100)}
        onMouseUp={() => zoomUpdated()}
      ></input>
      {/* <p className="w-14">{(zoom*100).toFixed(2)}%</p> */}
    </div>

    <div className="my-2 flex items-center">
      <TimeText seconds={range[0]}></TimeText>
      <div className="flex-grow mx-2">
        <Range
          label="Select your value"
          step={0.1}
          min={times[0]}
          max={times[1]}
          values={range}
          draggableTrack={true}
          onChange={setRange}
          onFinalChange={onRangeChanged}
          renderTrack={renderTrack}
          renderThumb={renderThumb}></Range>
      </div>
      <TimeText seconds={range[1]}></TimeText>
    </div>
  </div>);
}

function TimeText({ seconds }: { seconds: number }) {
  const str = secondsToString(seconds);
  return (
  <span className="text-gray-600">
    {str}
  </span>);
}
