import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { addDays, dateDiffInDays, todayMidnight } from "../utils/datetime";
import { selectDueDate } from "./mainSlice";
import React from "react";
import Select from "../widgets/Select";
import { equalities, Equality } from "../types";
import DatePicker from "react-datepicker";
import { buildIbQueryWhereBlock } from "../logseq/query";
import { ResponsiveLine } from '@nivo/line';

export default function DueDateView() {
  const dispatch = useAppDispatch();
  const date = useAppSelector(state => state.main.filters.dueDate);
  const equality = useAppSelector(state => state.main.filters.dueDateEq);
  const busy = useAppSelector(state => state.main.busy);
  const days = useMemo(
    () => date ? dateDiffInDays(todayMidnight(), new Date(date)) : 1,
    [date]);

  async function dateSelected(date: Date | null) {
    if (busy) return;
    dispatch(selectDueDate({date}));
  }

  function daysSelected(val: number | null) {
    if (val != null && Number.isNaN(val)) return;
    const date = addDays(todayMidnight(), val!);
    dateSelected(date);
  }

  return (
    <div className="w-full">
      <label className="flex space-x-1 items-center" style={{width: 'max-content'}}>
        <input
          type="checkbox"
          checked={date != null}
          onChange={() => dateSelected(date ? null : todayMidnight())}
          disabled={busy}
        />
        <span>Due</span>
      </label>
      {date && (
        <div className="w-full">
          <Chart />
          <div className="flex space-x-1">
            <Select
              options={equalities}
              isSelected={s => (s as Equality) == equality}
              selected={s => dispatch(selectDueDate({eq: s as Equality}))}
            />
            <DatePicker
              className="p-0 border border-[color:var(--ls-border-color)] w-full"
              selected={date}
              onChange={dateSelected}
              minDate={busy ? date ?? undefined : todayMidnight()}
              maxDate={busy ? date ?? undefined : undefined}
              monthsShown={1}
              disabled={busy}
              dateFormat="dd/MM/yyyy"
            />
            <div className="flex">
              <input
                className="border bg-transparent text-right p-0 w-10 border-[color:var(--ls-border-color)]"
                type="number" 
                value={days}
                onChange={(e) => daysSelected(parseFloat(e.target.value))}
                step="1"
              />
              <span>d</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chart() {
  // Depend on collections to redo chart on refresh
  const collections = useAppSelector(state => state.main.collections);
  const filters = useAppSelector(state => state.main.filters);
  const [data, setData] = useState<any>();

  useEffect(() => {
    build()
  }, [collections])

  async function build() {
    const subFilters = {...filters};
    subFilters.dueDate = null;
    const query = `[
      :find
        ?due
      :where
        [?b :block/properties ?prop]
        [(get ?prop :ib-a) _]
        [(get ?prop :ib-b) _]
        ${buildIbQueryWhereBlock(subFilters)}
        [(get ?prop :ib-due) ?due]
    ]`;
    const ret = await logseq.DB.datascriptQuery(query);
    const counts = (ret as number[][]).reduce((d, r) => {
      const diff = dateDiffInDays(todayMidnight(), new Date(r[0]));
      d.set(diff, d.get(diff) ?? 1);
      return d;
    }, new Map<number, number>());
    for (const dist of Array.from(counts.keys())) {
      if (!counts.get(dist-1)) counts.set(dist-1, 0);
      if (!counts.get(dist+1)) counts.set(dist+1, 0);
    }
    const data = [
      {
        id: 'counts',
        data: Array.from(counts.keys()).
          toSorted((a, b) => a-b).
          map(dist => { return { x: dist, y: counts.get(dist) }})
      }
    ];
    console.log(data);
    setData(data);
  }

  if (!data) return <></>;

  return (
    <div className="w-full my-1" style={{ height: 100 }}>
      <ResponsiveLine
        data={data}
        xScale={{ type: 'linear' }}
        yScale={{ type: 'linear' }}
        curve="step"
        enableArea={true}
        enablePoints={false}
        areaOpacity={.2}
        lineWidth={1}
        pointSize={5}
        enableGridY={false}
        enableGridX={false}
        axisBottom={{ tickSize: 2 }}
        axisLeft={null}
        enableSlices={'x'}
        margin={{ top: 5, right: 5, bottom: 20, left: 5 }}
      />
    </div>
  );
}
