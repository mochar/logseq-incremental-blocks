import { AppStore } from "../state/store";
import { toggleView, ViewType } from "../state/viewSlice";

// https://redux.js.org/faq/code-structure#how-can-i-use-the-redux-store-in-non-component-files
let store: AppStore;
export const injectStore = (_store: AppStore) => {
  store = _store
}

export async function insertIncrementalMedia({ uuid }: { uuid: string }) {
  store.dispatch(toggleView({ viewType: ViewType.insert, blockUuid: uuid }));
}