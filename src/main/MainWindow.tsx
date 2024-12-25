import React, { useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { gotBusy, refreshAll, selectDueDate, toggleRef } from "./mainSlice";
import IbsView from "./IbsView";
import DatePicker from "react-datepicker";
import { addDays, dateDiffInDays, todayMidnight } from "../utils/datetime";
import useCalculateHeight from "../hooks/useCalculateHeight";
import { startLearning } from "../learn/learnSlice";
import { queryIncrementalBlocks } from "../logseq/query";
import { db } from "../db";
import Select from "../widgets/Select";
import { equalities, Equality } from "../types";

export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const busy = useAppSelector((state) => state.main.busy);
  const totalDue = useAppSelector(state => state.main.totalDue);
  const collections = useAppSelector(state => state.main.collections);
  const totalIbs = useMemo(() => collections.reduce((s, c) => s + c.count, 0), [collections]);
  
  React.useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    await dispatch(refreshAll());
  }

  async function importToDb() {
    dispatch(gotBusy(true));
    try {
      const ibs = await queryIncrementalBlocks();
      await Promise.all([ibs.forEach(async (ib) => {
        console.log(ib.uuid);
        const block = await logseq.Editor.getBlock(ib.uuid);
        if (block) {
          //          await logseq.Editor.upsertBlockProperty(block, 'id', ib.uuid);
          await logseq.Editor.updateBlock(block.uuid, block.content, {properties: {id: ib.uuid}});
        }
      })]);
      await db.ibs.bulkAdd(ibs);
    } catch (e) {
      console.error(e);
    } finally {
      dispatch(gotBusy(false));
    }
  }

  return (
    <div
      id="ib-main"
      style={{ minHeight: '30rem' }}
      className="flex flex-col p-2 h-full space-y-3"
    >
      <div className="flex space-x-1">
        <button
          className="bg-primary/90 hover:bg-primary py-1 px-6 border-b-2 border-primary-700 hover:border-primary-500 rounded text-primary-foreground border"
          onClick={() => dispatch(startLearning('due'))}
          disabled={busy}
        >
          <span>Review { totalDue && <span>({totalDue})</span> }</span>
        </button>

        <button
          className="hover:bg-secondary py-1 px-2 border-b-2 border-secondary-700 hover:border-secondary-500 rounded border"
          onClick={() => dispatch(startLearning('subset'))}
          disabled={busy}
        >
          <span>Subset review ({ totalIbs })</span>
        </button>

        
        <div className="flex-1"></div>
        
        <button
          className="hover:bg-secondary border px-1 rounded"
          onClick={refresh}
          disabled={busy}
        >
          <i className={`ti ti-refresh`}></i>          
        </button>
      </div>

      <div className="h-full flex space-x-2" ref={ref}>
        <div className="flex flex-col px-2.5 space-y-4" style={{flex: "2 1 0%"}}>
          <DueDateView />

          
          
          <RefsView />
        </div>
        <div className="w-full h-full" style={{flex: "4 1 0%"}}>
          <IbsView />
        </div>
      </div>
    </div>
  );
}

function RefsView() {
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLDivElement>(null);
  const height = useCalculateHeight(ref.current);
  const busy = useAppSelector(state => state.main.busy);
  const all = useAppSelector(state => state.main.refs);
  const selected = useAppSelector(state => state.main.filters.refs ?? []);
  const unselected = useMemo(() => {
    const selectedIds = selected.map(r => r.id);
    return all.filter(r => !selectedIds.includes(r.id));
  }, [all, selected]);

  const selectedView = (
    <>
      <ul>
        {selected.map(ref => (
          <li key={ref.id}>
            <button
              className="text-left w-full hover:bg-secondary"
              onClick={() => dispatch(toggleRef(ref))}
            >
              {ref.name}
            </button>
          </li>
        ))}
      </ul>
      <hr className="m-0" />
    </>
  );
  
  return (
    <div className="h-full">
      <p>Tags</p>
      <hr className="m-0" />
      {selected.length > 0 && selectedView}
      <div ref={ref}>
        <ul className="overflow-y-scroll m-0" style={{ height, minHeight: 100 }}>
          {unselected.map(ref => (
            <li key={ref.id}>
              <button
                className="text-left w-full hover:bg-secondary"
                onClick={() => dispatch(toggleRef(ref))}
              >
                {ref.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DueDateView() {
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
      )}
    </div>
  );
}
