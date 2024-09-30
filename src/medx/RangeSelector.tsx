import React from "react";
import { Range, getTrackBackground } from "react-range";
import { IRenderThumbParams, IRenderTrackParams } from "react-range/lib/types";
import { secondsToString } from "../utils/datetime";
import { useAppSelector } from "../state/hooks";
import * as theme from "../utils/theme";

interface RangeSelectorProps {
  length: number,
  range: number[],
  onChange: (range: number[]) => void
}

export default function RangeSelector({ length, range, onChange }: RangeSelectorProps) {
  // Selected extract range
  const [selectRange, setSelectRange] = React.useState(range);
  // Min and max of slider
  const [regionRange, setRegionRange] = React.useState([0, length]);
  const themeMode = useAppSelector(state => state.app.themeMode);

  const bgColor = themeMode == 'dark' ? '#00000080' : '#f0f0f0';
  
  function renderRegionTrack({ props, children }: IRenderTrackParams) {
    return (
      <div
        onMouseDown={props.onMouseDown}
        onTouchStart={props.onTouchStart}
        style={{
          ...props.style,
          height: "12px",
          display: "flex",
          width: "100%",
          border: `10px solid ${bgColor}`,
        }}
      >
        <div
          ref={props.ref}
          style={{
            height: "12px",
            width: "100%",
            borderRadius: "4px",
            background: getTrackBackground({
              values: regionRange,
              //              colors: ["#ccc", "#548BF4", "#ccc"],
              colors: ["transparent", "#548bf44d", "transparent"],
              min: 0,
              max: length,
            }),
            alignSelf: "center",
          }}
        >
          {children}
        </div>
        <div
          style={{
            height: "6px",
            width: "100%",
            borderRadius: "1px",
            position: "absolute",
            background: getTrackBackground({
              values: selectRange,
              //              colors: ["#ccc", "#548BF4", "#ccc"],
              colors: ["transparent", "#548BF4", "transparent"],
              min: 0,
              max: length,
            }),
            alignSelf: "center",
          }}
        >
        </div>
      </div>
    );
  }

  function renderSelectTrack({ props, children, isDragged, disabled }: IRenderTrackParams) {
    return (
      <div
        onMouseDown={props.onMouseDown}
        onTouchStart={props.onTouchStart}
        style={{
          ...props.style,
          height: "6px",
          width: "100%",
          backgroundColor: bgColor,
        }}
      >
        <div
          ref={props.ref}
          style={{
            height: "5px",
            width: "100%",
            borderRadius: "4px",
            background: getTrackBackground({
              values: selectRange,
              colors: ["transparent", "#548BF4", "transparent"],
              min: regionRange[0],
              max: regionRange[1],
            }),
            alignSelf: "center",
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  function renderRegionThumb({ props, index }: IRenderThumbParams) {
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
    </div>);
  }
  
  function renderSelectThumb({ props, index }: IRenderThumbParams) {
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
        className="text-sm"
        style={{
          position: "absolute",
          top: "-25px",
          color: "#fff",
          fontSize: "14px",
          padding: "2px 4px",
          borderRadius: "2px",
          backgroundColor: "#00000066",
        }}
      >
        {secondsToString(selectRange[index])}
      </div>
    </div>);
  }

  function onRegionRangeChanged(range: number[]) {
    setRegionRange(range);
    let newSelectRange = [...selectRange];
    if (range[0] > selectRange[0]) {
      newSelectRange[0] = range[0];
      if (newSelectRange[0] > newSelectRange[1]) {
        newSelectRange[1] = newSelectRange[0];
      }
    }
    if (range[1] < selectRange[1]) {
      newSelectRange[1] = range[1];
      if (newSelectRange[1] < newSelectRange[0]) {
        newSelectRange[0] = newSelectRange[1];
      }
    }
    setSelectRange(newSelectRange);
  }

  return (
  <div className="flex flex-col" style={{ background: 'var(--lx-gray-02,var(--ls-secondary-background-color,hsl(var(--popover)))) '}}>

    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap'}}>
      <Range
        step={0.1}
        min={0}
        max={length}
        values={regionRange}
        draggableTrack={true}
        onChange={onRegionRangeChanged}
        onFinalChange={() => {}}
        renderTrack={renderRegionTrack}
        renderThumb={renderRegionThumb}></Range>

    </div>
    
    <div className="my-2 mt-6 flex items-center">
      <TimeText seconds={regionRange[0]}></TimeText>
      <div className="flex-grow mx-2">
        <Range
          label="Select your value"
          step={0.1}
          min={regionRange[0]}
          max={regionRange[1]}
          values={selectRange}
          draggableTrack={true}
          onChange={setSelectRange}
          onFinalChange={onChange}
          renderTrack={renderSelectTrack}
          renderThumb={renderSelectThumb}></Range>
      </div>
      <TimeText seconds={regionRange[1]}></TimeText>
    </div>
  </div>);
}

function TimeText({ seconds }: { seconds: number }) {
  const str = secondsToString(seconds);
  return (
    <span className={`text-gray-600 text-sm ${theme.TXT_MUTED}`}>
    {str}
  </span>);
}
