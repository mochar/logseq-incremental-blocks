import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { ModalView, setModalView } from "./state/viewSlice";
import Postpone from "./main/Postpone";
import Import from "./import/Import";

export default function ModalApp() {
  const dispatch = useAppDispatch();
  const view = useAppSelector(state => state.view.modal);

  function tryHide(e: any) {
    if (parent!.document.getElementById('ib-modal-content')?.contains(e.target)) {
      return;
    }
    dispatch(setModalView(null));
  }
  
  if (view == null) return <></>;

  let content = <span>Is that leather?</span>;
  if (view.view == ModalView.ibActions) {
    content = <Postpone />
  } else if (view.view == ModalView.import) {
    content = <Import />
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
