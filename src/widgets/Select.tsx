import React from "react";

interface ISelect {
  options: string[] | readonly string[] ,
  isSelected: (option: string) => boolean,
  selected: (option: string) => void,
  textBuilder?: (option: string) => string
}

export default function Select({ options, isSelected, selected, textBuilder }: ISelect) {
  const optionEls = options.map((option) => {
    return <option key={option} value={option}>
      { textBuilder ? textBuilder(option) : option }
    </option>;
  });

  const selectedOption = options.find(o => isSelected(o));
  
  return (
  <select
    onChange={(e) => selected(e.target.value)}
    value={selectedOption}
    className="py-0">
    { optionEls }
  </select>
  );
}
