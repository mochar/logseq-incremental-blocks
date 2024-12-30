import React from "react";
import * as theme from "../utils/theme";

interface ICuteToggle {
  title: string,
  tooltip: string,
  state?: boolean,
  onChange: () => void
}

export function CuteToggle({ title, tooltip, state, onChange }: ICuteToggle) {
  return (
  <button
    className="border dark:border-gray-600 w-fit px-1.5 py-0.5 text-xs rounded-full flex items-center"
    title={tooltip}
    onClick={() => onChange()}
  >
    {state != undefined &&
      <span 
        style={{ width: '8px', height: '8px', }}
        className={`mr-1 inline-flex rounded-full ${state ? 'bg-green-500' : 'bg-gray-300'}`}
      ></span>
    }
    <span className="text-gray-700 dark:text-gray-400">{title}</span>
  </button>
  );
}

interface ICuteButton {
  title: string,
  disabled?: boolean,
  onClick: Function
}

export function CuteButton({ title, onClick, disabled=false }: ICuteButton) {
  return (
    <button
      className={`text-xs rounded-sm px-1 py-0.5 text-gray-700 dark:text-gray-400 ${disabled ? theme.BG : theme.BG.hover} ${theme.BORDER}`}
      onClick={() => !disabled && onClick()}
    >
      {title}
    </button>
  );
}
