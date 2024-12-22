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

// Used previously for filtering, handy for later
export const typeFilters = ['all', 'cards', 'blocks'] as const;
export declare type TypeFilter = typeof typeFilters[number];

export const refFilterModes = ['off', 'inclusion', 'exclusion'] as const;
export declare type RefFilterMode = typeof refFilterModes[number];

