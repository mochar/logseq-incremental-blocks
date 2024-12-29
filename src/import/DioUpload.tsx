import React, { useEffect } from "react";
import { ImportFormat } from "../types";
import { basename } from "path";

export default function DioUpload({ format, setFormat }: { format: ImportFormat, setFormat: Function }) {
  const [path, setPath] = React.useState<string>('');
  const [title, setTitle] = React.useState<string>('');
  const keep = React.useRef<boolean>(false);

  useEffect(() => {
    if (keep.current) {
      keep.current = false;
    } else {
      setPath('');
      setTitle('');
    }
  }, [format]);
  
  function onDrop(e: any) {
    e.preventDefault();
    if (!e.dataTransfer.files) return;
    const file = e.dataTransfer.files[0];
    const parsedFormat = file.type.split('/')[0];
    if (!['audio', 'video'].includes(parsedFormat)) {
      logseq.UI.showMsg('Not audio or video format', 'error');
      return;
    }
    if (!file.path) {
      logseq.UI.showMsg('Unable to retrieve file path', 'error');
      return;
    }
    setPath(file.path);
    console.log(file);
    const parsedTitle = (file.name !== '' ? file.name : file.path.replace(/^.*(\\|\/|\:)/, '')).split('.')[0];
    setTitle(parsedTitle);
    if (parsedFormat != format) {
      keep.current = true;
      setFormat(parsedFormat);
    }
  }

  let preview = <></>;
  if (path) {
    preview = React.createElement(format,
      { controls: true, style: { width: 600, marginTop: '.5rem' }, src: path });
  }
  
  return (
    <div>
      <div className="flex space-x-2">
        <div
          onDrop={onDrop}
          className="bg-secondary w-full flex justify-center border-2"
        >
          <span className="self-center">Drop file here</span>
        </div>
        <input
          type="text"
          placeholder="Title"
          className="w-full"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>
      {preview}
    </div>
  );
}
