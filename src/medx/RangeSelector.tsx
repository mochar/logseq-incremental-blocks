import React from "react";
import { Range } from "react-range";
import { IRenderThumbParams, IRenderTrackParams } from "react-range/lib/types";

interface RangeSelectorProps {
  length: number,
  url?: string,
  initStart?: number,
  initEnd?: number,
  onChange?: (range: number[]) => void
}

export default function RangeSelector({ length, url, initStart, initEnd, onChange }: RangeSelectorProps) {
  const [zoom, setZoom] = React.useState<number>(0.);
  // Selected extract range
  const [range, setRange] = React.useState([initStart ?? 0, initEnd ?? length]);
  // Min and max of slider
  const [times, setTimes] = React.useState([0, length]);
  const middle = range[0] + 0.5*(range[1] - range[0]);
  const minRange = Math.min(length, 2);
  const timedUrl = url && `${url}#t=${range[0]},${range[1]}`;
  console.log(timedUrl);

  const zoomMax = React.useMemo(() : number => {
    const maxRight = 1 - Math.max(minRange/2, range[1]-middle) / (length - middle);
    const maxLeft = 1 - Math.max(minRange/2, middle-range[0]) / middle;
    const zoomMax = Math.max(maxRight, maxLeft);
    return zoomMax;
  }, [range, times]);

  function zoomUpdated() {
    const r = middle + Math.max((1-zoom)*(length-middle), Math.max(minRange/2, range[1]-middle));
    const l = middle - Math.max((1-zoom)*middle, Math.max(minRange/2, middle-range[0]));
    setTimes([l, r]);
  }

  function onRangeChange(values: number[]) {
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

    <div className="my-3 flex items-center">
      <TimeText seconds={range[0]}></TimeText>
      <div className="flex-grow mx-2">
        <Range
          label="Select your value"
          step={0.1}
          min={times[0]}
          max={times[1]}
          values={range}
          draggableTrack={true}
          onChange={onRangeChange}
          renderTrack={renderTrack}
          renderThumb={renderThumb}></Range>
      </div>
      <TimeText seconds={range[1]}></TimeText>
    </div>

    {timedUrl && <div className="">
      <audio controls src={timedUrl}></audio>
    </div>}

  </div>);
}

function TimeText({ seconds }: { seconds: number }) {
  const str = new Date(1000 * seconds).toISOString().substr(11, 8);
  return (
  <span className="text-gray-600">
    {str}
  </span>);
}
