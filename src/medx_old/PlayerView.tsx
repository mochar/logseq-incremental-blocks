import React from "react";
import { OnProgressProps } from "react-player/base";
import ReactPlayer from "react-player/lazy";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { durationRetrieved, MedxData, playerProgressed, selectionChanged } from "./medxSlice";
import RangeSelector from "./RangeSelector";

interface IExtractionView {
  data: MedxData
}

export default function PlayerView({ data }: IExtractionView) {
  const medFrag = data.medFrag;
  const player = React.useRef<ReactPlayer | null>(null);
  const dispatch = useAppDispatch();
  const follow = useAppSelector(state => state.medx.follow);
  const range = useAppSelector(state => state.medx.selectRange);
  const duration = useAppSelector(state => state.medx.duration);
  const mediaAttrs = useAppSelector(state => state.medx.mediaAttrs);
  const [playing, setPlaying] = React.useState<boolean>(false);
  const playerUrl = medFrag.format == 'youtube' ? `https://www.youtube.com/watch?v=${medFrag.url}` : medFrag.urlTimed;

  const playerConfig = {
    file: {
      forceVideo: medFrag.format == 'video',
      forceAudio: medFrag.format == 'audio',
    }
  }

  function onDuration(d: number) {
    dispatch(durationRetrieved(d));
    setPlaying(true);
  }

  function onProgress({ played, playedSeconds, loaded, loadedSeconds }: OnProgressProps) {
    let time = playedSeconds;
    if (playedSeconds >= range[1]) {
      if (follow) {
        dispatch(selectionChanged([range[0], playedSeconds]));
      } else {
        time = range[0];
        player.current?.seekTo(time);
        setPlaying(mediaAttrs.loop);
      }
    } else if (playedSeconds <= range[0]) {
      time = range[0];
      player.current?.seekTo(time);
    }
    dispatch(playerProgressed(time));
  }

  const loaded = duration != undefined;
  return (
    <div>
       <div id="medx-preview" className="mb-1">
        <ReactPlayer
          ref={(p) => player.current = p}
          width={'640px'}
          height={medFrag.format == 'audio' ? '2rem' : '360px'}
          url={playerUrl}
          playing={playing}
          loop={mediaAttrs.loop}
          controls={true}
          volume={mediaAttrs.volume}
          playbackRate={mediaAttrs.rate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onDuration={onDuration}
          onProgress={onProgress}
          config={playerConfig}
        />
      </div>
      
      <hr className="my-2 dark:border-gray-800"></hr>
      
      {!loaded && <p>Loading...</p>}
      {loaded && <RangeSelector />}
    </div>
  );
}


