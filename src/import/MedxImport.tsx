import React, { useMemo } from "react";
import { useDebounce } from "../utils/utils";
import { useAppDispatch } from "../state/hooks";
import { togglePopoverView } from "../state/viewSlice";
import { MediaFragment, renderFragment } from "../medx/MediaFragment";

// https://stackoverflow.com/a/27728417/2374668
function parseYoutubeId(url: string) : string | null {
  const rx = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(rx);
  if (match && match?.length >= 2) return match[1];
  return null;
}

export default function MedxImport() {
  const ref = React.useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const [format, setFormat] = React.useState<string>('audio');
  const [url, setUrl] = React.useState<string>('');
  const debouncedUrl = useDebounce(url, 300);

  const mediaElement = useMemo(() => {
    if (!debouncedUrl) return <></>;
    if (format == 'audio') {
      return <audio controls style={{ width: 640 }} src={url}></audio>;
    } 
    if (format == 'video') {
      return <video style={{ width: 640 }} controls src={url}></video>;
    }
    if (format == 'youtube') {
      const id = parseYoutubeId(url);
      if (!id) <p>Unable to recognize youtube URL.</p>;
      return <iframe width={640} height={360}
        src={`https://www.youtube.com/embed/${id}?autoplay=0`}
      ></iframe>;
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
    const url_ = format == 'youtube' ? (parseYoutubeId(url) ?? url) : url;
    console.log(url_, format);
    const args: MediaFragment = {
      url: url_,
      //@ts-ignore
      format, 
      volume: 1,
      rate: 1,
      loop: false
    };
    await logseq.Editor.insertAtEditingCursor(renderFragment(args));
    dispatch(togglePopoverView({ view: null }));
  }

  return (
  <div
    ref={ref} 
    id="ib-insert" 
    className="flex flex-col"
  >
    <label>
      <input 
        className="border w-full" 
        type="text"
        placeholder="Path or URL"
        value={url}
        onChange={e => urlChanged(e.target.value)} 
        onDrop={onDrop}
      />
    </label>

    <div className="flex items-baseline justify-between">
      <p className="space-x-2">
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
        className="bg-primary/90 hover:bg-primary py-1 px-2 border-b-2 border-primary-700 hover:border-primary-500 rounded text-primary-foreground border ml-8" 
        onClick={insert}
      >
        Import
      </button>
    </div>

    <div className="mt-2">
      {mediaElement}
    </div>
  </div>
  );
}
