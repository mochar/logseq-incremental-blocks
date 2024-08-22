import React from "react";

export default function CuteToggle({ title, tooltip, state, onChange }: { title: string, tooltip: string, state: boolean, onChange: () => void }) {
  return (
  <button
    className="bg-white border px-1.5 py-0.5 text-xs rounded-full flex items-center"
    title={tooltip}
    onClick={() => onChange()}
  >
    <span 
      style={{ width: '8px', height: '8px', }}
      className={`mr-1 inline-flex rounded-full ${state ? 'bg-lime-500' : 'bg-gray-300'}`}
    ></span>
    <span className="text-gray-700">{title}</span>
  </button>
  );
}