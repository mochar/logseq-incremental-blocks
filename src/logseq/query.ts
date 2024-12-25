import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import { counter, toCamelCase } from "../utils/utils";
import { toEndOfDay, toStartOfDay, todayMidnight } from "../utils/datetime";
import Beta from "../algorithm/beta";
import { IncrementalBlock, QueueIb, Ref } from "../types";
import { ibFromProperties } from "../ib";

export async function queryIncrementalBlocks(where: string = ''): Promise<IncrementalBlock[]> {
  // Identify by ib-due. Put in ?due var. Used downstream.
  const query = `
  [
    :find (pull ?b [*])
    :where
      [?b :block/properties ?prop]
      [(get ?prop :ib-a) _]
      [(get ?prop :ib-b) _]
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
    return ibFromProperties(b.uuid, props);
  });
  return ibs;
}

/*
 * TODO: This only looks if block has priority.
 * Should provide arguments to also assume other properties.
 */
interface IQueryIbs {
  uuids: string[],
}

export async function queryIbs({ uuids }: IQueryIbs): Promise<IncrementalBlock[]> {
  const uniqueUuids = [...new Set(uuids)];
  const uuidsString = uniqueUuids.map((uuid) => `#uuid "${uuid}"`).join(', ');
  const where = `
    [?b :block/uuid ?uuid]
    [(contains? #{${uuidsString}} ?uuid)] 
    [(get ?prop :ib-a) _]
    [(get ?prop :ib-b) _]
  `;
  return queryIncrementalBlocks(where);
}

/*
 *
 */
export function sortQibsByPriority(qibs: QueueIb[]): QueueIb[] {
  return qibs.sort((a, b) => b.priority - a.priority);
}

/*
 *
 */
interface IParseQueueIbs {
  result: any,
  sortByPriority?: boolean
}

export function parseQueueIbs({ result, sortByPriority=true }: IParseQueueIbs) : QueueIb[] {
  let qibs = (result as Array<Array<any>>).map<QueueIb>((r) => {
    const [block, tags] = r;
    const beta = new Beta(block['properties']['ib-a'], block['properties']['ib-b']);
    const priority = beta.sample({ prefix: block['uuid'], seedToday: true });
    const pathRefs = block['path-refs'];
    const pageTags = tags ? tags['tags'] : [];
    const page = block['page'];
    const collection = page['journal?'] as boolean ? 'journal' : page['properties'] ? page['properties']['collection'] ?? null : null;
    return {
      id: block['id'],
      uuid: block['uuid'],
      content: block['content'],
      page: {
        uuid: page['uuid'],
        name: page['name'],
        collection: collection
      },
      priority,
      pathRefs,
      pageTags,
      refs: [...pathRefs, ...pageTags]
    };
  });
  if (sortByPriority) {
    qibs = sortQibsByPriority(qibs);
  }
  return qibs;  
}

/*
 *
 */
export const QUEUE_IB_PULLS = `
(pull ?b [
  :db/id
  :block/uuid 
  :block/content 
  :block/properties
  {:block/page [:block/uuid :block/name :block/properties :block/journal?]}
  {:block/path-refs [:db/id :block/uuid :block/name]}
  {:block/refs [:db/id :block/uuid :block/name]}
]) 
(pull ?bp [
  {:block/tags [:db/id :block/uuid :block/name]}
])
`;

/*
 * 
 */
interface IQueryDueIbs {
  dueAt?: Date,
  refs?: string[],
  includeOutdated?: boolean,
  sortByPriority?: boolean,
}

export async function queryDueIbs({ dueAt, refs, includeOutdated=true, sortByPriority=true }: IQueryDueIbs) : Promise<QueueIb[]> {
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

/*
 * 
 */
interface IQueryQueueIbs {
  uuids: string[],
  sortByPriority?: boolean,
  keepDuplicates?: boolean
}

export async function queryQueueIbs({ uuids, sortByPriority=true, keepDuplicates=false }: IQueryQueueIbs) : Promise<QueueIb[]> {
  const uuidCounts = counter<string>(uuids);
  const uniqueUuids = [...uuidCounts.keys()];
  const uuidsString = uniqueUuids.map((uuid) => `#uuid "${uuid}"`).join(', ');
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
  let qibs = parseQueueIbs({ result: ret, sortByPriority });
  if (keepDuplicates && uniqueUuids.length < uuids.length) {
    qibs = qibs.reduce((dupeIbs, qib) => {
      return dupeIbs.concat((new Array(uuidCounts.get(qib.uuid)).fill({...qib})));
    }, new Array<QueueIb>())
  }
  return qibs ?? [];
}

/*
Find all ibs that have the given page as a page ref.
 */
interface IQueryRefIbs {
  ref: Ref,
  sortByPriority?: boolean
}

export async function queryRefIbs({ ref, sortByPriority=false }: IQueryRefIbs) : Promise<QueueIb[]> {
  const query = `[
    :find ${QUEUE_IB_PULLS}
    :where
      [?b :block/uuid ?uuid]
      [?b :block/properties ?prop]
      [(get ?prop :ib-a) _]
      [(get ?prop :ib-b) _]
      [?b :block/page ?bp]
      [?p :block/name ?pagename] 
      [(contains? #{"${ref.name}"} ?pagename)] 
      (or [?b :block/path-refs ?p] [?bp :block/tags ?p])
  ]`;
  let ret: any;
  try {
    ret = await logseq.DB.datascriptQuery(query);  
  } catch (error) {
    console.log(error);
    return [];
  }
  const qibs = parseQueueIbs({ result: ret, sortByPriority });
  return qibs;
}

/*
 *
 */
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

/**
 * Represents the page references of a block.
 * directRefs: mentioned explicitely in the block
 * pathRefs: mentioned somewhere in the path, but not within
 *   the block itself
 * pageRefs: tags of the page the block is in
 * refs: union of all above refs
 */
export interface BlockRefs {
  blockUuid: string,
  directRefs: Ref[],
  pathRefs: Ref[],
  pageRefs: Ref[],
  refs: Ref[]
}

interface IQueryBlockRefs {
  uuid: string,
  withPriority?: boolean
}

/**
 * Return page properties of path refs. Path refs are
 * referenced pages inherited from the parents.
 */
export async function queryBlockRefs({ uuid, withPriority=false }: IQueryBlockRefs) : Promise<BlockRefs | null> {  
  const query = `[
  :find ${QUEUE_IB_PULLS}
    :where
      [?b :block/uuid #uuid "${uuid}"]
      [?b :block/page ?bp]
  ]`;
  const ret = await logseq.DB.datascriptQuery(query);
  if (ret.length == 0) return null;
  const blockData = ret[0];
  const pageRefs = (blockData[1]?.tags ?? []) as Ref[];
  const directRefs = (blockData[0].refs ?? []) as Ref[];
  const pathRefs = (blockData[0]['path-refs'] ?? []) as Ref[];
  const refs = [...new Set([...pageRefs, ...directRefs, ...pathRefs])];
  return { blockUuid: uuid, pageRefs, directRefs, pathRefs, refs };
}

interface IIbQueryWhere {
  dueDate?: Date,
  refs?: Ref[],
}
export function buildIbQueryWhereBlock({ dueDate, refs }: IIbQueryWhere) : string {
  // Query collections, their pages, and their size
  // Handle due filter clause
  let dueWhere = '';
  if (dueDate) {
    const includeOutdated = true;
    dueWhere = `
    [(get ?prop :ib-due) ?due]
    [(<= ?due ${toEndOfDay(dueDate).getTime()})]
  `;
    if (!includeOutdated) {
      dueWhere = `
      ${dueWhere}
      [(>= ?due ${toStartOfDay(dueDate).getTime()})]
    `;
    }
  }

  // Handle refs. Not sure if this works, but also not necessary as ref filtering
  // in the queue happens after retrieving all due ibs.
  let refsWhere = '';
  if (refs && refs.length > 0) {
    const refString = refs.map((r) => `"${r.name}"`).join(', ');
    refsWhere = `
      [?page :block/name ?pagename] 
      [(contains? #{${refString}} ?pagename)] 
      (or [?b :block/refs ?page] [?bp :block/tags ?page])
    `;
  }

  return `
    ${dueWhere}
    ${refsWhere}
  `;
}

export async function queryIbRefs() : Promise<Ref[]> {
  const query = `[
    :find
      (pull ?ref [
       :db/id :block/uuid :block/name
      ])
    :where
      [?b :block/properties ?prop]
      [?b :block/page ?bp]
      [(get ?prop :ib-a) _]
      [(get ?prop :ib-b) _]
      [?b :block/refs ?ref]
      [?ref :block/name _]
    ]`;
  const ret = await logseq.DB.datascriptQuery(query);
  return ret.map((r: any) => r[0] as Ref);
}

export async function queryTotalDue(dueDate: Date) : Promise<number> {
  const query = `[
    :find
      (count ?b)
    :where
      [?b :block/properties ?prop]
      [(get ?prop :ib-a) _]
      [(get ?prop :ib-b) _]
      ${buildIbQueryWhereBlock({ dueDate })}
  ]`;
  const ret = await logseq.DB.datascriptQuery(query);
  return ret[0][0];
}
