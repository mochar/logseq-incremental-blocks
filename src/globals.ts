import IncrementalBlock from "./IncrementalBlock";
import IbQueue from "./queue";

export interface CurrentIBData {
    ib: IncrementalBlock,
    start: Date,
    contents: Record<string, string>,
    newContents: Record<string, string>,
    manualPriority?: number,
    manualInterval?: number,
}

interface Globals {
    learning: boolean,
    queue: IbQueue,
    current?: CurrentIBData
}

const GLOBALS: Globals = {
    learning: false,
    queue: new IbQueue(),
}
export default GLOBALS;
