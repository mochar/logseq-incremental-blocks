import IncrementalBlock from "./IncrementalBlock";

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
    queue: IncrementalBlock[],
    current?: CurrentIBData
}

const GLOBALS: Globals = {
    learning: false,
    queue: [],
}
export default GLOBALS;
