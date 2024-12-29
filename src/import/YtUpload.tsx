import React from "react";
import { getVideoDetails } from "youtube-caption-extractor";

// https://stackoverflow.com/a/27728417/2374668
function parseYoutubeId(url: string) : string | null {
  const rx = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(rx);
  if (match && match?.length >= 2) return match[1];
  return null;
}

export default function YtUpload() {
  const [url, setUrl] = React.useState<string>('');
  const [title, setTitle] = React.useState<string>('');
  const [id, setId] = React.useState<string>('');

  async function urlChanged(url: string) {
    setUrl(url);
    const id = parseYoutubeId(url);
    if (id) {
      setId(id);
      try {
        // TODO: maybe too slow as it fetches also subs
        const details = await getVideoDetails({ videoID: id });
        if (!details.title) throw new Error();
        setTitle(details.title);
      } catch (e) {
        logseq.UI.showMsg('Could not fetch video title', 'warning');
      }
    }
  }

  let preview = <></>;
  if (id) {
    preview = (
      <iframe width={640} height={360}
        src={`https://www.youtube.com/embed/${id}?autoplay=0`}
      />
    );
  }
  
  return (
    <div>
      <div className="flex space-x-2">
        <input
          className="w-full py-1"
          type="text"
          placeholder="Youtube URL"
          value={url}
          onChange={e => urlChanged(e.target.value)} 
          //onDrop={onDrop}
        />
        <input
          type="text"
          placeholder="Title"
          className="w-full py-1"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>
      {preview}
    </div>
  );
}
