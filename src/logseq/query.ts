import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import IncrementalBlock from "../IncrementalBlock";
import { todayMidnight } from "../utils";

export async function queryIncrementalBlocks(query: string): Promise<IncrementalBlock[]> {
  // TODO: Figure out this sorting query
  const ret = await logseq.DB.datascriptQuery(query);
  const ibs = (ret || []).flat().map((b: BlockEntity) => {
    // Query doesn't transform property keys to camelCase...
    let props = b.properties ?? {};
    const keyValues = Object.keys(props).map(key => {
      const newKey = key.replace(/-./g, (m) => m[1].toUpperCase());
      return { [newKey]: props[key] };
    });
    props = Object.assign({}, ...keyValues);
    b.properties = props;
    return new IncrementalBlock(b.uuid, b.properties!, b);
  });
  return ibs;
}

export async function queryDueIBlocks() : Promise<IncrementalBlock[]> {
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
