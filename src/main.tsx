import "@logseq/libs";

import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import Beta from "./algorithm/beta";
import "./index.css";
import settings from './logseq/settings';

import { logseq as PL } from "../package.json";
import { handleMacroRendererSlotted } from "./logseq/macro";

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
    };
  }

  logseq.provideModel(createModel());
  logseq.setMainUIInlineStyle({
    zIndex: 11,
  });

  const openIconName = "template-plugin-open";

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

  logseq.Editor.registerSlashCommand('Turn into incremental block',
    async ({ uuid }: { uuid: string }) => {
      const block = await logseq.Editor.getBlock(uuid);
      if (!block) return;
      console.log(block);

      let props = new Map<string, any>([
        ['ib-a', block.properties?.ibA ?? 1.0],
        ['ib-b', block.properties?.ibB ?? 1.0],
      ]);
      console.log(props);
      props.set('ib-sample', 
        block.properties?.ibSample ?? new Beta(props.get('ib-a'), props.get('ib-b')).sample());
      for (let [prop, val] of props) {
        await logseq.Editor.upsertBlockProperty(block.uuid, prop, val);
      }
    }
  );

  logseq.provideStyle(`
    .ib__container {
      display: flex;
    }

    .ib__container > div {
      display: flex;
      padding-left: 4px;
      padding-right: 4px;
    }
  `)

  logseq.App.onMacroRendererSlotted(handleMacroRendererSlotted);
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error);
