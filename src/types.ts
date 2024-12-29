export interface Ref {
  name: string,
  uuid: string,
  id: number
}

export interface Page {
  uuid: string,
  name: string,
  collection: string | null
}

export interface QueueItem {
  uuid: string,
  priority: number,
  type: 'source' | 'card'
}

// Simplified ib data just for queue purposes.
export interface QueueIb {
  id: number,
  uuid: string,
  content: string,
  priority: number,
  page: Page,
  pathRefs: Ref[],
  pageTags: Ref[],
  // pathRefs + pageTags
  refs: Ref[],
  // Anki card id 
  cardId?: number
}

export interface BetaParams {
  a: number,
  b: number
}

export interface Scheduling {
  multiplier: number;
  interval: number;
  reps: number;
  dueDate: number;
}

export interface IncrementalBlock {
  uuid: string,
  betaParams: BetaParams,
  sample?: number,
  scheduling?: Scheduling,
}

export declare type Timestamp = number;

// Filtering
export const equalities = ['>', '≥', '<', '≤', '='] as const;
export declare type Equality = typeof equalities[number];

export const eqToFun = new Map<Equality, (a: number, b: number) => boolean>([
  ['=', (a, b) => a == b],
  ['>', (a, b) => a > b],
  ['≥', (a, b) => a >= b],
  ['<', (a, b) => a < b],
  ['≤', (a, b) => a <= b]
]);

export const filterModes = ['and', 'or', 'not'] as const;
export declare type FilterMode = typeof filterModes[number];

// Null means no filter
export interface IbFilters {
  dueDate: Timestamp | null,
  dueDateEq: Equality,
  refs: Ref[] | null,
  refsMode: FilterMode,
  interval: number | null,
  intervalEq: Equality
}


export const importFormats = ['audio', 'video', 'youtube', 'html'] as const;
export declare type ImportFormat = typeof importFormats[number];
