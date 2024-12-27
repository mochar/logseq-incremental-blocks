import React from "react";
import { useAppSelector } from "./state/hooks";
import { MainView } from "./state/viewSlice";
import MainWindow from "./main/MainWindow";
import MedxWindow from "./medx/MedxWindow";
import useMainSizeAndPosition from "./hooks/useMainSizeAndPos";

export default function MainApp() {
  const view = useAppSelector(state => state.view);
  const sizeAndPos = useMainSizeAndPosition();

  if (view.main == null) return <></>;

  let viewComponent: JSX.Element = <></>;
  switch (view.main?.view) {
    case MainView.main:
      viewComponent = <MainWindow />;
      break;
    case MainView.medx:
      viewComponent = <MedxWindow />;
      break;
  }
  
  return (
    <main
      className="bg-[color:var(--ls-primary-background-color)]"
      style={{
        width: sizeAndPos.width,
        height: sizeAndPos.height,
        left: sizeAndPos.left,
        top: sizeAndPos.top,
        position: 'relative',
        //backgroundColor: `var(--ls-primary-background-color, var(--ls-primary-background-color-plugin))`,
        //color: `var(--ls-primary-text-color, var(--ls-primary-text-color-plugin))`,
        //transition: 'background-color 0.3s, color 0.3s',
      }}>
      {viewComponent}
    </main>
  );
}
