import Dexie, { type EntityTable } from 'dexie';
import { IncrementalBlock } from './types';

export const db = new Dexie('ibdb') as Dexie & {
  ibs: EntityTable<IncrementalBlock, 'uuid'>;
};

db.version(1).stores({
  ibs: '&uuid, scheduling.dueDate'
});
