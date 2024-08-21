import React from "react";
import { Range, getTrackBackground } from "react-range";
import { IRenderThumbParams, IRenderTrackParams } from "react-range/lib/types";
import { secondsToString } from "../utils/datetime";

interface RangeSelectorProps {
  length: number,
  range: number[],
  onChange: (range: number[]) => void
}

export default function RangeSelector({ length, range, onChange }: RangeSelectorProps) {
  // Selected extract range
  const [innerRange, setInnerRange] = React.useState(range);
  const middle = range[0] + 0.5*(range[1] - range[0]);
  const minRange = Math.min(length, 2);

  const zoomMax = React.useMemo(() : number => {
    const maxRight = 1 - Math.max(minRange/2, innerRange[1]-middle) / (length - middle);
    const maxLeft = 1 - Math.max(minRange/2, middle-innerRange[0]) / middle;
    const zoomMax = Math.max(maxRight, maxLeft);
    return zoomMax;
  }, [innerRange]);

  React.useEffect(() => {
    setInnerRange(innerRange);
  }, [range]);

  const [zoom, setZoom] = React.useState<number>(0.8 * zoomMax);
  // Min and max of slider
  const [times, setTimes] = React.useState(timesFromZoom());

  function timesFromZoom() : number[] {
    const r = innerRange[1] + (1-zoom)*(length-innerRange[1]);
    const l = innerRange[0] - (1-zoom)*innerRange[0];
    return [l, r];
  }

  function zoomUpdated() {
    const times_ = timesFromZoom();
    setTimes(times_);
  }

  function renderTrack({ props, children, isDragged, disabled }: IRenderTrackParams) {
    return (<div
      onMouseDown={props.onMouseDown}
      onTouchStart={props.onTouchStart}
      style={{
        ...props.style,
        height: "6px",
        width: "100%",
        backgroundColor: "#ccc",
      }}
    >
      <div
        ref={props.ref}
        style={{
          height: "5px",
          width: "100%",
          borderRadius: "4px",
          background: getTrackBackground({
            values: innerRange,
            colors: ["#ccc", "#548BF4", "#ccc"],
            min: times[0],
            max: times[1],
          }),
          alignSelf: "center",
        }}
      >
        {children}
      </div>
    </div>);
  }

  function renderThumb({ props, index }: IRenderThumbParams) {
    return (<div
      {...props}
      key={props.key}
      style={{
        ...props.style,
        height: "12px",
        width: "12px",
        backgroundColor: "#999",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-28px",
          color: "#fff",
          fontSize: "14px",
          padding: "2px 4px",
          borderRadius: "2px",
          backgroundColor: "#00000066",
        }}
      >
        {secondsToString(innerRange[index])}
      </div>
    </div>);
  }

  return (
  <div className="flex flex-col" style={{ background: 'var(--lx-gray-02,var(--ls-secondary-background-color,hsl(var(--popover)))) '}}>

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

    <div className="my-2 mt-5 flex items-center">
      <TimeText seconds={times[0]}></TimeText>
      <div className="flex-grow mx-2">
        <Range
          label="Select your value"
          step={0.1}
          min={times[0]}
          max={times[1]}
          values={innerRange}
          draggableTrack={true}
          onChange={setInnerRange}
          onFinalChange={onChange}
          renderTrack={renderTrack}
          renderThumb={renderThumb}></Range>
      </div>
      <TimeText seconds={times[1]}></TimeText>
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
