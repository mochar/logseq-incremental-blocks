import React from "react";
import { BETA_BOUNDS } from "../globals";

interface SliderParams {
  val: number;
  onChange: (mean: number) => void;
}

export default function MeanPrioritySlider({ val, onChange } : SliderParams) {
  const [value, setValue] = React.useState<number>(val);
  const precisionFactor = 10000;

  React.useEffect(() => {
    setValue(val);
  }, [val]);

  return (
    <div className="flex items-center">
      <input 
        className="w-full"
        type="range" 
        min={BETA_BOUNDS.meanLower*precisionFactor} 
        max={BETA_BOUNDS.meanUpper*precisionFactor} 
        step="1" 
        value={value*precisionFactor} 
        onChange={(e) => setValue(parseFloat(e.target.value)/precisionFactor)}
        onMouseUp={() => onChange(value)}
      ></input>
      <p className="w-14">{(value*100).toFixed(2)}%</p>
    </div>
  );
}
