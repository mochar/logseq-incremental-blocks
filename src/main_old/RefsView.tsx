import React from "react";
import * as theme from "../utils/theme";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { addRef, Ref, removeRef } from "../learn/learnSlice";
import { Virtuoso } from "react-virtuoso";
import { queryRefIbs } from "../logseq/query";

export default function RefsView() {
  const [search, setSearch] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [pages, setPages] = React.useState<Ref[]>([]);
  const refs = useAppSelector(state => state.learn.refs);
  const dispatch = useAppDispatch();
  
  React.useEffect(() => {
    if (search == '') return;
    let isCancelled = false;

    const get = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const pages = await findPages();
      if (!isCancelled) {
        setPages(pages);
      }
    }

    get().catch(console.error);

    return () => {
      isCancelled = true;
    }
  }, [search]);

  async function findPages() : Promise<Ref[]> {
    const query = `[
    :find (pull ?p [*])
    :where
      [?p :block/name ?n]
      [(clojure.string/includes? ?n "${search}")]
    ]`;
    const ret = await logseq.DB.datascriptQuery(query);
    const pages = (ret || []).flat().map((p: any) : Ref => {
      return {
        name: p.name,
        id: parseInt(p.id),
        uuid: p.uuid
      };
    });
    return pages;
  }

  function addPageRef(ref: Ref) {
    dispatch(addRef(ref.name));
    setSearch('');
  }

  const refViews = refs.map(ref => <RefView pageRef={ref} key={ref.id} />);

  return (
    <div>
      <div>
        <span>Manage key ref pages for filtering and prioritizing of ibs</span>
      </div>

      <input
        type="text"
        className={`${theme.BG} ${theme.BORDER} m-1 p-1 w-full`}
        placeholder="Search pages"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        /* onBlur={() => setFocused(false)} */
      />

      {focused && search != '' &&
        <div className={`shadow-sm ${theme.BORDER}`}>
          <Virtuoso
            style={{ height: '180px', overflowX: 'clip' }}
            totalCount={pages.length}
            itemContent={(i) => {
              const page = pages[i];
              return (
                <button
                  className={`${theme.BG.hover} py-1 px-1 w-full`}
                  onClick={() => addPageRef(page)}
                >
                  {page.name}
                </button>
              );
            }}
          ></Virtuoso>
        </div>
      }

      {refViews}
      
    </div>
  );
}

interface IRefView {
  pageRef: Ref
}

function RefView({ pageRef }: IRefView) {
  const [ibCount, setIbCount] = React.useState<number>();
  const dispatch = useAppDispatch();
  
  React.useEffect(() => {
    getIbs();
  }, []);

  async function getIbs() {
    const ibs = await queryRefIbs({ ref: pageRef });
    setIbCount(ibs.length);
    // console.log('ref', ref, 'ibs', ibs);
  }
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <p>{ pageRef.name }</p>
        <span className={`${theme.TXT_MUTED}`}>{ ibCount } ibs</span>
      </div>
      <button
        type="button"
        onClick={() => dispatch(removeRef(pageRef.name))}
        className="inline-flex items-center p-1 ms-2 text-xs text-gray-400 bg-transparent rounded-sm hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-300">
          <svg className="w-2 h-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
      </button>
    </div>
  );
}
