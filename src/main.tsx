import "@logseq/libs";

import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import settings from './logseq/settings';

import { logseq as PL } from "../package.json";
import { handleMacroRendererSlotted } from "./logseq/macro";
import { onCreateIbCommand, onCreateIbWithSiblingsCommand, onCreatePbCommand, onCreateSelectedIbsCommand } from "./logseq/command";
import { GLOBALS } from "./globals";
import { BlockCommandCallback } from "@logseq/libs/dist/LSPlugin.user";
import { injectStore, insertIncrementalMedia } from "./medx/command";
import { Provider } from "react-redux";
import { store } from "./state/store";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const pluginId = PL.id;

injectStore(store);

function main() {
  console.info(`#${pluginId}: MAIN`);

  // Element is in index.html
  const root = ReactDOM.createRoot(document.getElementById("app")!);
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );

  function createModel() {
    return {
      async nextRep() {
        console.log('create model next rep called');
        if (!GLOBALS.learning) return;
        await GLOBALS.queue.finishRep();
        const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
        if (GLOBALS.queue.current && openIb) {
          logseq.App.pushState('page', { name: GLOBALS.queue.current.ib.uuid });
        }
      }
    };
  }

  logseq.provideModel(createModel());
  logseq.setMainUIInlineStyle({
    zIndex: 11,
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

  logseq.App.registerUIItem("toolbar", {
    key: openIconName,
    template: `
      <a id="${pluginId}" data-on-click="toggleMain" data-rect class="button">
        <i class="ti ti-brain" style="font-size: 20px"></i>
      </a>
    `
  });

  function registerCommand(tag: string, action: BlockCommandCallback) {
    logseq.Editor.registerSlashCommand(tag, action);
    logseq.Editor.registerBlockContextMenuItem(tag, action);
  }

  registerCommand('Turn into incremental block', onCreateIbCommand);
  registerCommand('Turn into priority block', onCreatePbCommand);
  registerCommand('Turn siblings into priority blocks', onCreateIbWithSiblingsCommand);
  logseq.App.registerCommandPalette({ key: 'ib-convert-selected', label: 'Convert selected to ibs'}, 
    onCreateSelectedIbsCommand);
  logseq.Editor.registerSlashCommand('Insert incremental media', insertIncrementalMedia);

  logseq.App.onMacroRendererSlotted(handleMacroRendererSlotted);
  logseq.App.onCurrentGraphChanged((e) => GLOBALS.queue.refresh());

  GLOBALS.queue.refresh();

  document.addEventListener('keydown', function (e) {
    if (e.key == 'Escape') {
      logseq.hideMainUI()
    }
  }, false);
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error);
