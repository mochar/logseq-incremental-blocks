import "@logseq/libs";

import React from "react";
import * as ReactDOM from "react-dom/client";
import "./index.css";
import dpStyle from "react-datepicker/dist/react-datepicker.css?inline";
import settings from './logseq/settings';

import { logseq as PL } from "../package.json";
import { handleMacroRendererSlotted, injectStore as injectStoreMacro } from "./logseq/macro";
import { extractClozeCommand, extractSelectionCommand, onCreateIbCommand, onCreateIbShortcut, onCreateIbWithSiblingsCommand, onCreatePbCommand, onCreateSelectedIbsCommand } from "./logseq/command";
import { BlockCommandCallback } from "@logseq/libs/dist/LSPlugin.user";
import { injectStore as injectStoreMedx, insertIncrementalMedia } from "./medx/command";
import { Provider } from "react-redux";
import { store } from "./state/store";
import { setupNav, injectStore as injectStoreNav } from "./logseq/nav";
import PopoverApp from "./PopoverApp";
import MainApp from "./MainApp";
import BarApp from "./BarApp";
import ModalApp from "./ModalApp";
import { ModalView, setModalView } from "./state/viewSlice";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const pluginId = PL.id;

injectStoreMedx(store);
injectStoreMacro(store);
injectStoreNav(store);


function attemptReactRender(id: string, App: () => React.JSX.Element) {
  const el = parent!.document.getElementById(id);
  if (el) {
    if (el.classList.contains('reacted')) return;
    const rootBar = ReactDOM.createRoot(el);
    rootBar.render(
      <React.StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </React.StrictMode>
    );
    el.classList.add('reacted');
  } else {
    setTimeout(() => attemptReactRender(id, App), 1000);
  }
}

function main() {
  console.info(`#${pluginId}: MAIN`);

  const rootPopover = ReactDOM.createRoot(document.getElementById("app-popover")!);
  rootPopover.render(
    <React.StrictMode>
      <Provider store={store}>
        <PopoverApp />
      </Provider>
    </React.StrictMode>
  );

  // UI for sticky bar at bottom used for the review bar
  logseq.provideUI({
    key: 'ib-review-bar',
    path: '#main-content-container',
    template: `
    <div id="ib-review-bar" class="p-2" style="position: fixed; width: 100%; left: 0; bottom: 0; z-index: 2">
    </div>
    `
  });
  attemptReactRender('ib-review-bar', BarApp);

  // UI that covers the full main middle screen
  logseq.provideUI({
    key: 'ib-main-window',
    path: '#main-content-container',
    template: `
    <div id="ib-main-window" style="position: fixed; width: 100%; left: 0; top: 0; z-index: 2">
    is that leather?
    </div>
    `
  });
  attemptReactRender('ib-main-window', MainApp);

  // UI used for modals
  logseq.provideUI({
    key: 'ib-modal',
    path: 'main',
    template: `
    <div id="ib-modal" style="position: absolute; z-index: 99">
    </div>
    `
    //template: `
    //<div id="ib-modal" style="position: fixed; width: 100%; left: 0; top: 0; z-index: 99">
    //</div>
    //`
  });
  attemptReactRender('ib-modal', ModalApp);

  function createModel() {
    return {
    };
  }

  logseq.provideModel(createModel());
  logseq.setMainUIInlineStyle({
    zIndex: 0,//11,
  });

  const openIconName = "ib-plugin-open";

  logseq.provideStyle(css`
    .${openIconName} {
      opacity: 0.55;
      font-size: 20px;
      margin-top: 4px;
    }

    .${openIconName}:hover {
      opacity: 0.9;
    }

    #ib-popover {
      position: fixed;
    }

    .muted {
      color: grey;
    }
    
    .medx-player audio {
      height: 2rem;
    }

    .medx-player audio::-webkit-media-controls-panel, video::-webkit-media-controls-panel {
      height: 2rem;
      border-radius: 1px;
    }

    .medx-player input[type="range" i]::-webkit-media-slider-container {
      border-radius: 1px;
    }

    .medx-player iframe {
      margin: 0;
    }
  `);

  logseq.provideStyle(css`${dpStyle}`);

  logseq.App.registerUIItem("toolbar", {
    key: openIconName,
    template: `
      <a id="${pluginId}" data-on-click="toggleMain" data-rect class="button">
        <i class="ti ti-brain" style="font-size: 20px"></i>
      </a>
    `
  });

  setupNav();

  function registerCommand(tag: string, action: BlockCommandCallback) {
    logseq.Editor.registerSlashCommand(tag, action);
    logseq.Editor.registerBlockContextMenuItem(tag, action);
  }

  registerCommand('Convert to ib', onCreateIbCommand);
  registerCommand('Convert to ib (priority only)', onCreatePbCommand);
  registerCommand('Convert to ib (include siblings)', onCreateIbWithSiblingsCommand);
  logseq.App.registerCommandPalette({ key: 'ib-convert-selected', label: 'Convert selected to ibs'}, 
    onCreateSelectedIbsCommand);
  logseq.Editor.registerSlashCommand('Insert incremental media', insertIncrementalMedia);

  logseq.App.onMacroRendererSlotted(handleMacroRendererSlotted);

  logseq.App.registerCommandShortcut({ 
    binding: logseq.settings!.keyExtractSelection as string,
    mode: 'editing'
   }, extractSelectionCommand);
  logseq.App.registerCommandShortcut({ 
    binding: logseq.settings!.keyExtractCloze as string,
    mode: 'editing'
   }, extractClozeCommand);
  logseq.App.registerCommandShortcut({ 
    binding: logseq.settings!.keyExtractClozeCard as string,
    mode: 'editing'
   }, () => extractClozeCommand(false));
  logseq.App.registerCommandShortcut({ 
    binding: logseq.settings!.keyConvertToIb as string,
    mode: 'global'
   }, onCreateIbShortcut);

  document.addEventListener('keydown', function (e) {
    if (e.key == 'Escape') {
      console.log('escape');
      logseq.hideMainUI();
      store.dispatch(setModalView(null));
    }
  }, false);
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error);
