import React from "react";
import Beta from "../algorithm/beta";

interface BetaGraphParams {
  beta: Beta, 
  width: number, 
  height: number,
  isNew?: boolean
}

export default function BetaGraph({ beta, width, height, isNew=false }: BetaGraphParams) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const h = height;
    const w = width;
    const hOffset = 3;
    const lingradPath = ctx.createLinearGradient(w / 2, hOffset, w / 2, h);
    lingradPath.addColorStop(0, "#4682B4");
    lingradPath.addColorStop(1, "rgba(256, 256, 256, 0.98)");
    ctx.strokeStyle = lingradPath;
    ctx.lineWidth = 3;
    const lingrad = ctx.createLinearGradient(w / 2, hOffset, w / 2, h);
    lingrad.addColorStop(0, "#F2F2F2");
    lingrad.addColorStop(0.3, "#F2F2F2");
    lingrad.addColorStop(1, "rgba(256, 256, 256, 0.9)");
    ctx.fillStyle = lingrad;

    ctx.beginPath();
    ctx.moveTo(0, h);

    const nBins = 100;
    // let pdMode = beta.pdf(beta.mode());
    const ps = [0, ...[...Array(nBins - 1).keys()].map((i) => beta.pdf((i + 1) / nBins))];
    const pdMax = Math.max(...ps);
    for (let i = 0; i < nBins; i++) {
      const x = i / nBins;
      const pd = ps[i];
      ctx.lineTo(x * w, h - h * (pd / pdMax) + hOffset);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }, [beta]);

  return <canvas ref={ref} width={width} height={height}></canvas>;
}