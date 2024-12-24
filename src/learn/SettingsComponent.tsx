import React from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { Popover, popoverVisible, toggleAutoIb } from "./learnSlice";

export default function SettingsComponent() {
  const dispatch = useAppDispatch();
  const autoIb = useAppSelector(state => state.learn.autoIb);
  const [autoOpen, setAutoOpen] = React.useState<boolean>(logseq.settings?.learnAutoOpen as boolean ?? true);

  function toggleAutoOpen() {
    logseq.updateSettings({ learnAutoOpen: !autoOpen });
    setAutoOpen(!autoOpen);
  }

  return (
    <div
      className="flex space-x-1"
      onMouseEnter={() => dispatch(popoverVisible(Popover.none))}
    >
      <Toggle
        icon="square-plus"
        tooltip="Automatically convert new blocks to ibs. Recommend to turn off for now due to sporadic behavior."
        state={autoIb} 
        onChange={() => dispatch(toggleAutoIb(!autoIb))} 
      />
      <Toggle 
        icon="walk" 
        tooltip="Automatically jump to next block on rep."
        state={autoOpen} 
        onChange={toggleAutoOpen} 
      />
  </div>
  );
}

interface IToggle {
  icon: string,
  tooltip: string,
  state?: boolean,
  onChange: () => void
}

function Toggle({ icon, tooltip, state, onChange }: IToggle) {
  return (
  <button
    className="border dark:border-gray-600 w-fit px-1 py-0.5 text-xs rounded-full flex flex-col items-center justify-center hover:bg-secondary"
    title={tooltip}
    onClick={() => onChange()}
  >
    <i className={`ti ti-${icon}`}></i>
    {state != undefined &&
      <span 
        style={{ width: '6px', height: '6px', }}
        className={`inline-flex rounded-full ${state ? 'bg-green-500' : 'bg-gray-300'}`}
      ></span>
    }
  </button>
  );
}
