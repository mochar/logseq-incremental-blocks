import { PLUGIN_ROUTE } from "../globals";
import { AppStore } from "../state/store";
import { MainView, toggleMainView } from "../state/viewSlice";

let store: AppStore;
export const injectStore = (_store: AppStore) => {
  store = _store
}

function setupNavLink() {
  const navDiv = document.createElement('div');
  navDiv.innerHTML = `
  <a href="#${PLUGIN_ROUTE}" class='item group flex text-sm font-medium rounded-md'>
  <span class='ui__icon ti ti-brain scale-110'>
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'><rect width='20' height='20' fill='none'/><rect x='32' y='48' width='192' height='160' rx='8' fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='16'/><circle cx='68' cy='84' r='12'/><circle cx='108' cy='84' r='12'/></svg>      </span>
  <span class='flex-1'>Incremental blocks</span>
  </a>`;
  navDiv.className = `inc-blocks-nav`;
  navDiv.addEventListener('click', () => logseq.showMainUI());

  const navHeader = window.parent.document.querySelector('.nav-header');
  if (navHeader) {
    const nav = navHeader.querySelector('.inc-blocks-nav');
    if (nav) navHeader.removeChild(nav);
    navHeader.insertBefore(navDiv, navHeader.lastChild);
  }
};

function setupRouteHandler() {
  logseq.App.onRouteChanged((e) => {
    if (e.path === PLUGIN_ROUTE) {
      store.dispatch(toggleMainView({ view: MainView.main }));
    } else {
      logseq.hideMainUI();
    }
  });
}

export async function setupNav() : Promise<void> {
  setupNavLink();
  setupRouteHandler();
}
