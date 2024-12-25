import { useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { toggleAllCollections, toggleCollections } from "./mainSlice";
import { GroupedVirtuoso } from "react-virtuoso";
import React from "react";
import IbItem from "../widgets/IbItem";
import useCalculateHeight from "../hooks/useCalculateHeight";

export default function IbsView() : JSX.Element {
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLDivElement>(null);
  const height = useCalculateHeight(ref.current);
  const collections = useAppSelector(state => state.main.collections);
  const loadedIbs = useAppSelector(state => state.main.loadedIbs);
  const openedCollections = useMemo(
    () => Object.keys(loadedIbs).map(i => parseInt(i)),
    [loadedIbs]);
  const collectionCounts = useMemo(() => collections.map(c => c.count), [collections]);
  const openedCollectionCounts = useMemo(
    () => collectionCounts.map((cc, i) => openedCollections.includes(i) ? cc : 0),
    [openedCollections]);

  return (
    <div className="mt-1 h-full">
      <div className="flex">
        <a onClick={() => dispatch(toggleAllCollections())}>
          <span>Toggle all</span>
        </a>
      </div>
      <div ref={ref} className="border rounded-sm h-full">
        <GroupedVirtuoso
          style={{ height, overflowX: 'clip' }}
          groupCounts={openedCollectionCounts}
          groupContent={i => {
            const collection = collections[i];
            const opened = openedCollections.includes(i);
            return (
              <div
                className="flex bg-gray-100 p-1 cursor-pointer"
                onClick={() => dispatch(toggleCollections([i]))}
              >
                <button
                  className="px-2 text-neutral-500 items-center font-medium w-7"
                >
                  <span>{opened ? "v" : ">"}</span>
                </button>
                <span className="m-1">
                  {collection.name} ({collection.pageIds.length} pages, {collection.count} ibs)
                </span>
              </div>
            );
          }}
          itemContent={(i, iCollection) => {
            const openSum = openedCollectionCounts.slice(0, iCollection).reduce((s, x) => s + x, 0);
            const indexWithinCollection = i - openSum;
            const collectionIbs = loadedIbs[iCollection.toString()];
            if (!collectionIbs) return <span>Something went wrong</span>;
            const ib = collectionIbs[indexWithinCollection];
            return <IbItem qib={ib} />
          }}
        ></GroupedVirtuoso>
      </div>
    </div>
  );
}
