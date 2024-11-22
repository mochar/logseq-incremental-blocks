import React from "react";
import { useAppDispatch, useAppSelector } from "../../state/hooks";
import { fragmentSelected, MedxExtract, rangeHighlighted } from "../medxSlice";
import IncrementalBlock from "../../IncrementalBlock";
import * as theme from "../../utils/theme";
import { secondsToString } from "../../utils/datetime";
import { Virtuoso } from "react-virtuoso";

export default function ExtractsView() {
  const ref  = React.useRef<HTMLDivElement>(null);
  const extracts = useAppSelector(state => state.medx.extracts ?? []);
  const duration = useAppSelector(state => state.medx.duration)!;
  const dispatch = useAppDispatch();

  function selectExtract(extract: MedxExtract) {
    const ib = IncrementalBlock.fromBlock(extract.block);
    dispatch(fragmentSelected({
      range: [extract.medFrag.start ?? 0, extract.medFrag.end ?? duration],
      beta: ib.beta ?? undefined,
      interval: ib.interval ?? undefined
    }));
  }

  function renderExtract(index: number) {
    const extract = extracts[index];
    const content = extract.block.content.split(/\r?\n/)[0];
    const start = extract.medFrag.start ?? 0;
    const end = extract.medFrag.end ?? duration;
    return (
      <button
        className={`text-left w-full ${theme.BG.hover}`}
        onMouseEnter={() => dispatch(rangeHighlighted([start, end]))}
        onMouseLeave={() => dispatch(rangeHighlighted(null))}
        onClick={() => selectExtract(extract)}
      >
        <p>{ content }</p>
        <span className={`${theme.TXT_MUTED}`}>
          [{ secondsToString(start) } - { secondsToString(end) }]
        </span>
      </button>
    );
  }
  
  return (
    <div className="h-full" ref={ref}>
      <Virtuoso
        style={{ height: ref.current?.clientHeight ?? 360, overflowX: 'clip' }}
        totalCount={extracts.length}
        itemContent={renderExtract}
      ></Virtuoso>
    </div>
  );
}
