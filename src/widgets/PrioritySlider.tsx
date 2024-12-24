import React from "react";
import { BETA_BOUNDS } from "../globals";
import Beta from "../algorithm/beta";

interface SliderParams {
  beta: Beta;
  onMeanChange: (mean: number) => void;
  varianceSlider?: boolean
  onVarianceChange?: (variance: number) => void;
}

export default function PrioritySlider({ beta, onMeanChange, onVarianceChange=() => {}, varianceSlider=false } : SliderParams) {
  const [mean, setMean] = React.useState<number>(beta.mean);
  const [variance, setVariance] = React.useState<number>(beta.variance);
  const precisionFactor = 10000;

  React.useEffect(() => {
    setMean(beta.mean);
    setVariance(beta.variance);
  }, [beta]);

  return (
    <div>
      <div className="flex items-center">
        <input 
          className="priority-slider"
          type="range" 
          min={BETA_BOUNDS.meanLower*precisionFactor} 
          max={BETA_BOUNDS.meanUpper*precisionFactor} 
          step="1" 
          value={mean*precisionFactor} 
          onChange={(e) => setMean(parseFloat(e.target.value)/precisionFactor)}
          onMouseUp={() => onMeanChange(mean)}
        ></input>
        <span className="w-14">{(mean*100).toFixed(2)}%</span>
      </div>
      {varianceSlider && <div className="flex items-center">
        <input 
          className="w-full priority-slider"
          type="range" 
          min={0.0001*precisionFactor}
          max={beta.varianceUpperBound()*precisionFactor} 
          step="1" 
          value={variance*precisionFactor} 
          onChange={(e) => setVariance(parseFloat(e.target.value)/precisionFactor)}
          onMouseUp={() => onVarianceChange(variance)}
        ></input>
        <p className="w-14">{(variance*100).toFixed(2)}%</p>
      </div>}
    </div>
  );
}
