import React from "react";
import { useAppDispatch, useAppSelector } from "../../state/hooks";
import { extractSubs, getYoutubeData, isExtractInRange, languageSelected, rangedToggled, rangeHighlighted, selectionChanged, selectRangedSubs, subRangeSelected } from "../medxSlice";
import { secondsToString } from "../../utils/datetime";
import { Virtuoso } from "react-virtuoso";
import * as theme from "../../utils/theme";
import { CuteButton, CuteToggle } from "../../widgets/Buttons";

export default function SubsView() {
  const ref = React.useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const lang = useAppSelector(state => state.medx.language);
  const subs = useAppSelector(state => state.medx.subs);
  const selected = useAppSelector(state => state.medx.selectedSubRange);
  const rangedSubs = useAppSelector(state => selectRangedSubs(state));
  const [height, setHeight] = React.useState(360);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setHeight(ref.current?.clientHeight ?? height);
  }, []);

  async function loadSubs() {
    if (busy) return;
    setBusy(true);
    await dispatch(getYoutubeData());
    setBusy(false);
  }

  function isToggled(index: number) : boolean {
    return selected != null && index >= selected[0] && index <= selected[1];
  }

  function subToggled(index: number) {
    const toggled = isToggled(index);
    let newRange: number[] | null = null;
    // Redundant null checking for typescript linter
    if (toggled && selected != null) {
      if (selected[0] == selected[1] && index == selected[0]) {
        newRange = null;
      } else if (index == selected[0]) {
        newRange = [selected[0]+1, selected[1]];
      } else if (index == selected[1]) {
        newRange = [selected[0], selected[1]-1];
      } else {
        newRange = [selected[0], index-1];
      }
    } else {
      if (selected == null) {
        newRange = [index, index];
      } else if (index < selected[0]) {
        newRange = [index, selected[1]];
      } else if (index > selected[1]) {
        newRange = [selected[0], index];
      }
    }
    dispatch(subRangeSelected(newRange));
  }
  
  function renderSub(virtuosoIndex: number) {
    const sub = rangedSubs![virtuosoIndex];
    const index = sub.index!;
    // TODO: should be moved to medxSlice
    if (typeof sub.start != 'number' || typeof sub.end != 'number') {
      return <p>Problem parsing subtitle</p>
    }
    const isSelected = isToggled(index);
    //const enabled = selected == null || index <= selected[0] || index >= selected[1];
    const enabled = true;
    return (
      <div key={index} className="w-full flex items-center space-x-2 w-full">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={!enabled}
          onChange={() => subToggled(index)}
        />
        <button
          className={`text-left py-1 w-full ${theme.BG.hover}`}
          onMouseEnter={() => dispatch(rangeHighlighted([sub.start, sub.end]))}
          onMouseLeave={() => dispatch(rangeHighlighted(null))}
          onClick={() => dispatch(selectionChanged([sub.start, sub.end]))}
        >
          {sub.text && <p>{ sub.text }</p>}
          <span className={`${theme.TXT_MUTED}`}>
            [{ secondsToString(sub.start) } - { secondsToString(sub.end) }]
          </span>
        </button>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center">
        <input
          type="text"
          className={`${theme.BORDER}`}
          value={lang}
          onChange={(e) => dispatch(languageSelected(e.target.value))}
        />
        <button
          className={`${theme.BORDER} ${theme.BG.hover} px-1`}
          onClick={loadSubs}
        >
          Load
        </button>
      </div>
      {busy && <span>Loading...</span>}
      <div className="h-full" ref={ref}>
        {subs &&
          <Virtuoso
            style={{ height, overflowX: 'clip' }}
            totalCount={rangedSubs?.length ?? 0}
            itemContent={renderSub}
          ></Virtuoso>
        }
      </div>

      <div className="h-6">
        <SubsFooter />  
      </div>
    </div>
  );
}

function SubsFooter() : React.JSX.Element {
  const subs = useAppSelector(state => state.medx.subs);
  const rangedSubs = useAppSelector(state => selectRangedSubs(state));
  const ranged = useAppSelector(state => state.medx.ranged);
  const extract = useAppSelector(state => state.medx.selectionExtract);
  const dispatch = useAppDispatch();
  const [extracting, setExtracting] = React.useState(false);

  function deselect() {
    dispatch(subRangeSelected(null));
  }

  function selectAll() {
    let range: number[] | null = null;
    if (ranged) {
      if (rangedSubs && rangedSubs.length > 0) {
        range = [rangedSubs[0].index!, rangedSubs[rangedSubs.length-1].index!];
      }
    } else {
      range = [0, subs!.length-1];
    }
    dispatch(subRangeSelected(range));
  }

  async function extractAll() {
    if (extracting || subs == null || subs.length == 0) return;
    setExtracting(true);
    await dispatch(extractSubs());
    setExtracting(false);
  }

  if (!subs || subs.length == 0) {
    return <div></div>;
  } else if (extract) {
    return (
      <div>
        <span className={`${theme.TXT_MUTED}`}>
      [{ secondsToString(extract.start) } - { secondsToString(extract.end) }]
        </span>
        <button
          className={`${theme.BG.hover} ${theme.BORDER}`}
          onClick={deselect}
        >
          Deselect
        </button>
      </div>
    );
  } else {
    return (
      <div className="flex space-x-1 text-xs">
        <CuteToggle
          title="Range"
          tooltip="Only show subs within selection range"
          state={ranged}
          onChange={() => dispatch(rangedToggled())}
        />
        <CuteButton
          title="Select"
          onClick={selectAll}
          disabled={!rangedSubs || rangedSubs.length == 0}
        />
        <CuteButton
          title="Extract"
          onClick={extractAll}
          disabled={extracting}
        />
      </div>
    )
  }
}
