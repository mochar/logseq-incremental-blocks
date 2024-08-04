import { LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";

let _visible = logseq.isMainUIVisible;
let _settings = logseq.settings ?? {};

function subscribeLogseqEvent<T extends LSPluginUserEvents>(
  eventName: T,
  handler: (...args: any) => void
) {
  logseq.on(eventName, handler);
  return () => {
    logseq.off(eventName, handler);
  };
}

const subscribeToUIVisible = (onChange: () => void) =>
  subscribeLogseqEvent("ui:visible:changed", ({ visible }) => {
    _visible = visible;
    onChange();
  });

export const useAppVisible = () => {
  return React.useSyncExternalStore(subscribeToUIVisible, () => _visible);
};

// TODO doesnt work
const subscribeToSettingsChanged = (onChange: () => void) =>
  subscribeLogseqEvent('settings:changed', ({ settings }) => {
    _settings = settings;
    onChange();
  });

export const useSettingsChanged = () => {
  return React.useSyncExternalStore(subscribeToSettingsChanged, () => {
    return { settings: _settings };
  });
};
