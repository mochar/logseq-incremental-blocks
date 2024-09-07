import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import IncrementalBlock from "../IncrementalBlock";
import { toCamelCase } from "../utils/utils";
import { toEndOfDay, toStartOfDay, todayMidnight } from "../utils/datetime";

export async function queryIncrementalBlocks(where: string = ''): Promise<IncrementalBlock[]> {
  // Identify by ib-due. Put in ?due var. Used downstream.
  const query = `
  [
    :find (pull ?b [*])
    :where
      [?b :block/properties ?prop]
      ${where}
  ]
  `;
  const ret = await logseq.DB.datascriptQuery(query);
  const ibs = (ret || []).flat().map((b: BlockEntity) => {
    // Query doesn't transform property keys to camelCase...
    let props = b.properties ?? {};
    const keyValues = Object.keys(props).map(key => {
      const newKey = toCamelCase(key);
      return { [newKey]: props[key] };
    });
    props = Object.assign({}, ...keyValues);
    b.properties = props;
    return IncrementalBlock.fromBlock(b);
  });
  return ibs;
}

interface DueIbs {
  dueAt?: Date,
  refs?: string[],
  includeOutdated?: boolean
}

export async function queryDueIbs({ dueAt, refs, includeOutdated=true }: DueIbs) : Promise<IncrementalBlock[]> {
  const dueDate = dueAt ?? todayMidnight();
  let where = `
  [(get ?prop :ib-due) ?due]
  [(<= ?due ${toEndOfDay(dueDate).getTime()})]
  `;
  if (!includeOutdated) {
    where = `
    ${where}
    [(>= ?due ${toStartOfDay(dueDate).getTime()})]
    `;
  }
  if (refs && refs.length > 0) {
    const refString = refs.map((r) => `"${r}"`).join(', ');
    where = `
    ${where}
    [?page :block/name ?pagename] 
    [(contains? #{${refString}} ?pagename)] 
    [?b :block/page ?blockpage]
    (or [?b :block/refs ?page] [?blockpage :block/tags ?page])
    `;
  }
  return await queryIncrementalBlocks(where);
}

export async function queryOverdueUnupdatedIbs() : Promise<IncrementalBlock[]> {
  const today = todayMidnight().getTime();
  const where = `
  [(get ?prop :ib-due) ?due]
  [(< ?due ${today})]

  (or-join [?prop]
    (not [(get ?prop :ib-updated)])
    (and
      [(get ?prop :ib-updated) ?updated]
      [(< ?updated ${today})]
    )
  )
  `;
  return await queryIncrementalBlocks(where);
}

// export async function queryNearestIb() : Promise<IncrementalBlock>{
//   const query = `

//   `;
// }

export async function queryDueIbsWithoutSample() : Promise<IncrementalBlock[]> {
  const query = `
  [
    :find (pull ?b [*])
    :where
      [?b :block/properties ?prop]

      [(get ?prop :ib-due) ?due]
      [(<= ?due ${todayMidnight().getTime()})]

      (not [(get ?prop :ib-sample) _])
  ]
  `;
  return await queryIncrementalBlocks(query);
}

export async function queryDueIbsOld() : Promise<IncrementalBlock[]> {
  const query = `
  [
    :find (pull ?b [*])
    :where
      [?b :block/properties ?prop]

      [(get ?prop :ib-due) ?due]
      [(<= ?due ${todayMidnight().getTime()})]

      [(get ?prop :ib-sample) _]
    :result-transform (fn [result]
      (sort-by 
        ; (fn [d] (get-in d [:block/properties :ib-sample]))
        (fn [d] 
          (* 1 (get-in d [:block/properties :ib-sample]))
        )
        result
      )
    )
  ]
  `;
  return await queryIncrementalBlocks(query);
}

/* Return page properties of path refs. Path refs are
 * referenced pages inherited from the parents.
 */
export async function queryPathRefPages(uuid: string) : Promise<Record<string, any>[]> {
  const query = `
  [
    :find (pull ?p [*])
    :where
      [?b :block/path-refs ?p]
      [?b :block/uuid #uuid "${uuid}"]
      [?p :block/properties ?prop]
      [(get ?prop :ib-a) _]
  ]
  `;
  const ret = await logseq.DB.datascriptQuery(query);
  return (ret || []).flat();
}
