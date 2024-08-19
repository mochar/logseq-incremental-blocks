import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import React, { useMemo } from "react";
import { useDebounce } from "../utils";
import MedxArgs from "./args";
import { useAppDispatch } from "../state/hooks";
import { toggleView } from "../state/viewSlice";

export default function InsertPopover({ block }: { block: BlockEntity }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const [format, setFormat] = React.useState<string>('audio');
  const [url, setUrl] = React.useState<string>('');
  const debouncedUrl = useDebounce(url, 300);

  React.useEffect(() => {
    // Set position above bar
    const div = top?.document.querySelector(`div[blockid="${block.uuid}"]`);
    if (div) {
      const elemBoundingRect = div.getBoundingClientRect();
      ref.current!.style.top = `${elemBoundingRect.top - (ref.current?.clientHeight ?? 0) - 10}px`;
      ref.current!.style.left = `${elemBoundingRect.left}px`;
    }
  }, [block]);


  const mediaElement = useMemo(() => {
    if (!debouncedUrl) return <></>;
    if (format == 'audio') {
      return <audio controls src={url}></audio>;
    } 
    if (format == 'video') {
      return <video style={{ maxWidth: 400 }} controls src={url}></video>;
    }
    if (format == 'youtube') {
      return <></>;
    }
  }, [debouncedUrl, format]);

  function formatSelected(e: any) {
    setFormat(e.target.value);
  }

  function urlChanged(value: string) {
    setUrl(value);
  }

  function onDrop(e: any) {
    e.preventDefault();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // file.name, file.path
      setUrl(files[0].path);
    }
  }

  async function insert() {
    console.log(url, format);
    const args = new MedxArgs({
      url,
      //@ts-ignore
      format, 
      volume: 1,
      rate: 1,
      loop: false
    });
    await logseq.Editor.insertAtEditingCursor(args.render());
    dispatch(toggleView({ viewType: null }));
  }

  return (
  <div
    ref={ref} 
    id="ib-insert" 
    style={{position: "fixed"}} 
    className="flex flex-col rounded-lg border bg-white shadow-md p-2"
  >
    <label>
      Path or URL
      <input 
        className="border w-full" 
        type="text" 
        value={url}
        onChange={e => urlChanged(e.target.value)} 
        onDrop={onDrop}
      />
    </label>

    <div className="flex items-baseline justify-between">
      <p>
        <label>
          <input type="radio" name="format" value="audio" checked={format == 'audio'} onChange={formatSelected} />
          Audio
        </label> 
        <label className="ml-1">
          <input type="radio" name="format" value="video" checked={format == 'video'} onChange={formatSelected} />
          Video
        </label> 
        <label className="ml-1">
          <input type="radio" name="format" value="youtube" checked={format == 'youtube'} onChange={formatSelected} />
          Youtube
        </label> 
      </p>

      <button 
        className="w-fit mt-2 bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded" 
        onClick={insert}
      >
        Insert
      </button>
    </div>

    <div className="mt-2">
      {mediaElement}
    </div>
  </div>
  );
}