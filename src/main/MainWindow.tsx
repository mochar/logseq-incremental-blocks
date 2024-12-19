import React, { useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import * as theme from "../utils/theme";
import { refreshIbs, selectIbPages } from "./mainSlice";
import { Virtuoso, GroupedVirtuoso } from "react-virtuoso";
import IbItem from "../widgets/IbItem";

export default function MainWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const busy = useAppSelector((state) => state.main.busy);
  const ibs = useAppSelector(state => state.main.ibs);
  const refreshState = useAppSelector(state => state.learn.refreshState);
  const refreshDate = useAppSelector(state => state.learn.refreshDate);

  React.useEffect(() => {
    if (refreshState == 'fulfilled' || refreshState == 'failed') {
      // Minutes since last refresh
      const diff = (new Date()).getTime() - refreshDate!.getTime();
      const minutesSinceLastRefresh = diff / (1000 * 60);

      const minutesThreshold = logseq.settings?.queueTimer as number ?? 1.;

      if (minutesSinceLastRefresh != null && minutesSinceLastRefresh > minutesThreshold) {
        refresh();
      }
    } else if (refreshState == null) {
      refresh();
    }
  }, []);

  async function refresh() {
    await Promise.all([
      dispatch(refreshIbs()),
    ]);
  }

  return (
    <div
      id="ib-main"
      style={{ minHeight: '30rem' }}
      className={`flex flex-col p-2 h-full ${theme.TXT}`}
    >
      <div>
      </div>

      <div className="h-full flex space-x-2" ref={ref}>
        <div className="" style={{flex: "2 1 0%"}}>
          <span>Tags</span>
        </div>
        <div className="w-full h-full" style={{flex: "4 1 0%"}}>
          <IbsView />
        </div>
      </div>
    </div>
  );
}

function IbsView() : JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const height = ref.current ? ref.current.clientHeight - 20 : 100;
  const ibs = useAppSelector(state => state.main.ibs);
  const collections = useAppSelector(state => state.main.collections);
  const collectionCounts = useMemo(() => collections.map(c => c.count), [collections]);
  const [toggledCollections, setToggledCollections] = useState<number[]>([]); //index
  const filteredCollectionCounts = useMemo(
    () => collectionCounts.map((cc, i) => toggledCollections.includes(i) ? 0 : cc),
    [toggledCollections]);

  function toggleCollection(index: number) {
    const i = toggledCollections.indexOf(index);
    if (i === -1) {
      setToggledCollections([index, ...toggledCollections])
    } else {
      setToggledCollections(toggledCollections.toSpliced(i, 1));
    }
  }

  function toggleAll() {
    if (toggledCollections.length == 0) {
      setToggledCollections([...Array(collections.length).keys()]);
    } else {
      setToggledCollections([]);
    }
  }
  
  return (
    <div className="mt-1 h-full">
      <div className="flex">
        <a onClick={toggleAll}>
          <span>Toggle all</span>
        </a>
      </div>
      <div ref={ref} className="border rounded-sm h-full">
        <GroupedVirtuoso
          style={{ height, overflowX: 'clip' }}
          groupCounts={filteredCollectionCounts}
          groupContent={i => {
            const collection = collections[i];
            return (
              <div
                className="flex justify-between bg-gray-100 p-1 cursor-pointer"
                onClick={() => toggleCollection(i)}
              >
                <p className="">
                  {collection.name} ({collection.pageUuids.length} pages, {collection.count} ibs)
                </p>
              </div>
            );
          }}
          itemContent={(i, iCollection) => {
            let index = i;
            if (Math.max(...toggledCollections) >= iCollection) {
              const fullSum = collectionCounts.slice(0, iCollection).reduce((s, x) => s + x, 0);
              const filtSum = filteredCollectionCounts.slice(0, iCollection).reduce((s, x) => s + x, 0);
              index += fullSum - filtSum;
            }
            return IbItem({ qib: ibs[index] });
          }}
        ></GroupedVirtuoso>
      </div>
    </div>
  );
}
