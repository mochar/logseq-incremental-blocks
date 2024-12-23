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

// Used previously for filtering, handy for later
export const typeFilters = ['all', 'cards', 'blocks'] as const;
export declare type TypeFilter = typeof typeFilters[number];

export const refFilterModes = ['off', 'inclusion', 'exclusion'] as const;
export declare type RefFilterMode = typeof refFilterModes[number];

