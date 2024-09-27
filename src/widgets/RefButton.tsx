import React from "react";

interface IRefButton {
  key: any,
  label: string,
  selected?: boolean,
  onClick?: () => void,
  onDelete?: () => void
}

export default function RefButton({ key, label, selected=false, onClick, onDelete }: IRefButton) {
  const classes = selected ? 'bg-gray-200 dark:bg-gray-700 ring-1 ring-offset-1 ring-gray-500' : '';

  return (
    <span 
      key={key}
      className={"inline-flex items-center text-xs px-2 py-1 me-2 font-medium rounded text-gray-900 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100" + classes}
    >
      <button 
          type="button" 
          onClick={onClick} 
          className="hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {label}
      </button>
      {onDelete &&
        <button
        type="button"
        onClick={onDelete}
        className="p-1 ms-2 text-gray-400 bg-transparent rounded-sm hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-300">
          <svg className="w-2 h-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
        </button>}
    </span>
  );
}
