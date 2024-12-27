import React, { useEffect, useState } from "react";
import { useAppVisible } from "./logseq/events";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import useMainSizeAndPosition from "./hooks/useMainSizeAndPos";
import { ModalView, setModalView } from "./state/viewSlice";

export default function BarApp() {
  const dispatch = useAppDispatch();
  const view = useAppSelector(state => state.view.modal);

  function tryHide(e: any) {
    if (parent!.document.getElementById('ib-modal-content')?.contains(e.target)) {
      return;
    }
    dispatch(setModalView(null));
  }
  
  if (!view) return <></>;

  let content = <span>Is that leather?</span>;
  if (view == ModalView.ibActions) {
    
  }
  
  return (
    <>
      <div
        className="ui__modal-overlay ease-out duration-300 opacity-100 enter-done"
      >
        <div className="absolute inset-0 opacity-75">
        </div>
      </div>
      <div
        className=" flex align-center justify-center"
        style={{ inset: 0, position: 'fixed' }}
        onClick={tryHide}
      >
        <div
          id="ib-modal-content"
          className="border rounded bg-background p-3 self-center"
          style={{ height: 'fit-content' }}
        >
          {content}          
        </div>
      </div>
    </>
  );
}
