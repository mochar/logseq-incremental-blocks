import "@logseq/libs";

import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import settings from './logseq/settings';

import { logseq as PL } from "../package.json";
import { handleMacroRendererSlotted } from "./logseq/macro";
import { onCreateIbCommand, onCreatePbCommand } from "./logseq/command";
import { GLOBALS } from "./globals";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const pluginId = PL.id;

function main() {
  console.info(`#${pluginId}: MAIN`);

  // Element is in index.html
  const root = ReactDOM.createRoot(document.getElementById("app")!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  function createModel() {
    return {
      async nextRep() {
        if (!GLOBALS.learning) return;
        await GLOBALS.queue.nextRep({});
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
  `);

  logseq.App.registerUIItem("toolbar", {
    key: openIconName,
    template: `
      <a id="${pluginId}" data-on-click="toggleMain" data-rect class="button">
        <i class="ti ti-brain" style="font-size: 20px"></i>
      </a>
    `
  });

  logseq.Editor.registerSlashCommand('Turn into incremental block', onCreateIbCommand);
  logseq.Editor.registerBlockContextMenuItem('Turn into incremental block', onCreateIbCommand);
  logseq.Editor.registerSlashCommand('Turn into priority block', onCreatePbCommand);
  logseq.Editor.registerBlockContextMenuItem('Turn into priority block', onCreatePbCommand);
  logseq.App.onMacroRendererSlotted(handleMacroRendererSlotted);

  GLOBALS.queue.refresh();

  document.addEventListener('keydown', function (e) {
    if (e.keyCode === 27) {
      logseq.hideMainUI()
    }
  }, false);
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error);
