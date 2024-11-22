import React from "react";
import ReactPlayer from "react-player/lazy";
import RangeSelector from "./RangeSelector";
import { OnProgressProps } from "react-player/base";
import PrioritySlider from "../widgets/PrioritySlider";
import * as theme from "../utils/theme";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { durationRetrieved, extract, intervalChanged, mediaAttrsChanged, MedxData, noteChanged, playerProgressed, priorityChanged, selectionChanged } from "./medxSlice";

interface IExtractionView {
  data: MedxData
}

export default function ExtractionView({ data }: IExtractionView) {
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

      {loaded &&
        <>
          <RangeSelector />

          <hr className="my-2 dark:border-gray-800"></hr>
          
          <div className="flex mr-2">
            <MediaAttributesPanel />
            <NotePanel />
          </div>
          <ExtractPanel />
        </>  
      }
    </div>
  );
}


function MediaAttributesPanel() {
  const dispatch = useAppDispatch();
  const mediaAttrs = useAppSelector(state => state.medx.mediaAttrs);
  
  return (
    <div className="flex flex-col space-y-0.5">
      <label className="flex items-center justify-between">
        Loop
        <input
          type="checkbox"
          checked={mediaAttrs.loop}
          onChange={() => dispatch(mediaAttrsChanged({ loop: !mediaAttrs.loop }))}
        />
      </label>
      <label className="flex items-center justify-between">
        Speed
        <input
          className={`${theme.BG} ${theme.BORDER}`}
          type="number" 
          value={mediaAttrs.rate}
          onChange={(e) => dispatch(mediaAttrsChanged({ rate: parseFloat(e.target.value) }))}
          min="0.1"
          max="5"
          step=".1"
        />
      </label>
      <label className="flex items-center justify-between">
        Volume
        <input
          className={`${theme.BG} ${theme.BORDER}`}
          type="number" 
          value={mediaAttrs.volume}
          onChange={(e) => dispatch(mediaAttrsChanged({ volume: parseFloat(e.target.value) }))}
          min="0"
          max="1"
          step=".1"
        />
      </label>
    </div>   
  );
}

function NotePanel() {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const dispatch = useAppDispatch();
  const note = useAppSelector(state => state.medx.note);

  React.useEffect(() => {
    if (ref.current) ref.current.value = note;
  }, [note]);

  async function updateNote(text: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (ref.current?.value == text) {
      dispatch(noteChanged(text));
    }
  }
  
  return (
    <label className="w-full h-full ml-2">
      <textarea
        ref={ref}
        className={`w-full rounded p-1 ${theme.BG} ${theme.BORDER}`}
        placeholder="Note"
        rows={5}
        onChange={e => updateNote(e.target.value)}
      />
    </label>
  );
}

function ExtractPanel() {
  const dispatch = useAppDispatch();
  const beta = useAppSelector(state => state.medx.beta);
  const interval = useAppSelector(state => state.medx.interval);
  
  return (
    <div className="flex items-center">
      <p>Priority</p>
      
      <div className="w-full ml-1">
        <PrioritySlider
          beta={beta}
          varianceSlider={false}
          onMeanChange={mean => dispatch(priorityChanged(mean))}
        ></PrioritySlider>
      </div>

      <p className="ml-2">Interval</p>
      <input 
        className={`w-16 ml-1 ${theme.BORDER} ${theme.BG}`}
        type="number" 
        value={interval}
        onChange={(e) => dispatch(intervalChanged(parseFloat(e.target.value)))}
        min="1" 
        step="1"
      ></input>

      <div className="w-full"></div>

      <button 
        className="w-fit ml-2 mt-2 bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded" 
        onClick={() => dispatch(extract())}
      >
         Extract
      </button>
    </div>
  );
}
