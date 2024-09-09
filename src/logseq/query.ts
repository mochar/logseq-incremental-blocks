import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import IncrementalBlock from "../IncrementalBlock";
import { toCamelCase } from "../utils/utils";
import { toEndOfDay, toStartOfDay, todayMidnight } from "../utils/datetime";
import { QueueIb } from "../learn/learnSlice";
import Beta from "../algorithm/beta";

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
  includeOutdated?: boolean,
  sortByPriority?: boolean,
}

const QUEUE_IB_PULLS = `
(pull ?b [
  :db/id
  :block/uuid 
  :block/content 
  :block/properties
  {:block/path-refs [:db/id :block/uuid :block/name]}
]) 
(pull ?bp [
  {:block/tags [:db/id :block/uuid :block/name]}
])
`;

function parseQueueIbs({ result, sortByPriority=true }: { result: any, sortByPriority?: boolean }) : QueueIb[] {
  let qibs = (result as Array<Array<any>>).map<QueueIb>((r) => {
    const [block, tags] = r;
    const beta = new Beta(block['properties']['ib-a'], block['properties']['ib-b']);
    const priority = beta.sample({ prefix: block['uuid'], seedToday: true });
    const pathRefs = block['path-refs'];
    const pageTags = tags ? tags['tags'] : [];
    return {
      id: block['id'],
      uuid: block['uuid'],
      content: block['content'],
      priority,
      pathRefs,
      pageTags,
      refs: [...pathRefs, ...pageTags]
    };
  });
  if (sortByPriority) {
    qibs = qibs.sort((a, b) => b.priority - a.priority);
  }
  return qibs;  
}

export async function queryDueIbs({ dueAt, refs, includeOutdated=true, sortByPriority=true }: DueIbs) : Promise<QueueIb[]> {
  // Handle due filter clause
  const dueDate = dueAt ?? todayMidnight();
  let dueWhere = `
  [(get ?prop :ib-due) ?due]
  [(<= ?due ${toEndOfDay(dueDate).getTime()})]
  `;
  if (!includeOutdated) {
    dueWhere = `
    ${dueWhere}
    [(>= ?due ${toStartOfDay(dueDate).getTime()})]
    `;
  }

  // Handle refs. Not sure if this works, but also not necessary as ref filtering
  // in the queue happens after retrieving all due ibs.
  let refsWhere = '';
  if (refs && refs.length > 0) {
    const refString = refs.map((r) => `"${r}"`).join(', ');
    refsWhere = `
    [?page :block/name ?pagename] 
    [(contains? #{${refString}} ?pagename)] 
    (or [?b :block/refs ?page] [?bp :block/tags ?page])
    `;
  }

  // Query
  const query = `[
    :find
      ${QUEUE_IB_PULLS}
    :where
      [?b :block/properties ?prop]
      ${dueWhere}
      [(get ?prop :ib-a) _]
      [(get ?prop :ib-b) _]
      [?b :block/page ?bp]
      ${refsWhere}
  ]`;
  const ret = await logseq.DB.datascriptQuery(query);
  const qibs = parseQueueIbs({ result: ret, sortByPriority });
  return qibs;
}

export async function queryQueueIbs({ uuids, sortByPriority=true }: { uuids: string[], sortByPriority?: boolean }) : Promise<QueueIb[]> {
  const uuidsString = [...new Set(uuids)].map((uuid) => `#uuid "${uuid}"`).join(', ');
  const query = `[
    :find ${QUEUE_IB_PULLS}
    :where
      [?b :block/uuid ?uuid]
      [(contains? #{${uuidsString}} ?uuid)] 
      [?b :block/properties ?prop]
      [(get ?prop :ib-a) _]
      [(get ?prop :ib-b) _]
      [?b :block/page ?bp]
  ]`;
  let ret: any;
  try {
    ret = await logseq.DB.datascriptQuery(query);  
  } catch (error) {
    console.log(error);
    return [];
  }
  const qibs = parseQueueIbs({ result: ret, sortByPriority });
  return qibs ?? [];
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
