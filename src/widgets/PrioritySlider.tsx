import React from "react";

interface SliderParams {
  init: number;
  onChange: (value: number) => void;
}

export default function PrioritySlider({ init, onChange } : SliderParams) {
  const [value, setValue] = React.useState<number>(init);

  return (
    <div className="flex">
      <input 
        className="w-full"
        type="range" min="0" max="10000" step="1" 
        value={value*10000} 
        onChange={(e) => setValue(parseFloat(e.target.value)/10000)}
        onMouseUp={() => onChange(value)}
      ></input>
      <p className="w-14">{(value*100).toFixed(2)}%</p>
    </div>
  );
}
