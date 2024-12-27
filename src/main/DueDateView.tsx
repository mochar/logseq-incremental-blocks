import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { addDays, dateDiffInDays, todayMidnight, toEndOfDay, toStartOfDay } from "../utils/datetime";
import { selectDueDate } from "./mainSlice";
import React from "react";
import Select from "../widgets/Select";
import { eqToFun, equalities, Equality } from "../types";
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
              //minDate={busy ? date ?? undefined : todayMidnight()}
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
  const [allData, setAllData] = useState<any>([]);

  useEffect(() => {
    getAllData()
  }, [collections, filters.dueDate, filters.dueDateEq])

  async function getAllData() {
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
      const date = toStartOfDay(new Date(r[0])).getTime();
      d.set(date, (d.get(date) ?? 0) + 1);
      return d;
    }, new Map<number, number>());
    const dates = [...counts.keys().toArray()];
    for (const date of dates) {
      const today = new Date(date);
      const yesterday = addDays(today, -1).getTime();
      const tomorrow = addDays(today, 1).getTime();
      if (!dates.includes(yesterday)) counts.set(yesterday, 0);
      if (!dates.includes(tomorrow)) counts.set(tomorrow, 0);
    }
    const dataValues = Array.from(counts.keys())
      .toSorted((a, b) => a - b)
      .map(date => { return { x: new Date(date), y: counts.get(date) }});
    setAllData(dataValues);
  }

  const data = useMemo(() => {
    if (!allData || !filters.dueDate) return null;
    const selected = [];
    const remaining = [];
    for (const d of allData) {
      const eqFun = eqToFun.get(filters.dueDateEq)!;
      if (eqFun(d.x.getTime(), filters.dueDate)) {
        selected.push(d);
      } else {
        remaining.push(d);
      }
    }
    const data = [
      {
        id: 'selected',
        data: selected
      },
      {
        id: 'remaining',
        data: remaining
      }
    ];
    return data;
  }, [allData, filters.dueDate, filters.dueDateEq]);

  if (!data || data.length == 0) return <></>;

  return (
    <div className="w-full my-1" style={{ height: 100 }}>
      <ResponsiveLine
        // Don't animate others plot gets messed up
        animate={false}
        data={data}
        colors={[
          'rgb(97, 205, 77)',
          'rgb(150, 150, 150)'
          //'rgb(244, 117, 96)'
        ]}
        xScale={{
          type: 'time',
          //format: '%Y-%m-%d',
          precision: 'day',
          useUTC: false,
          //nice: true
        }}
        //xFormat="time:%Y-%m-%d"
        yScale={{ type: 'linear' }}
        markers={[
          {
            axis: 'x',
            value: new Date(filters.dueDate!),
            lineStyle: {
              strokeWidth: 1,
              strokeDasharray: '5, 3',
              stroke: '#00000090'
            },
          }
        ]}
        curve="step"
        enableArea={true}
        enablePoints={false}
        areaOpacity={.2}
        lineWidth={1}
        pointSize={5}
        enableGridY={false}
        enableGridX={false}
        axisBottom={{ tickSize: 2, tickRotation: 30, format: '%b %d' }}
        axisLeft={null}
        //enableSlices={'x'}
        margin={{ top: 5, right: 5, bottom: 20, left: 5 }}
        theme={{ text: {fontSize: 7} }}
      />
    </div>
  );
}
