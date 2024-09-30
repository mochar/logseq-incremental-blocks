import React from "react";
import ReactPlayer from "react-player/lazy";
import RangeSelector from "./RangeSelector";
import Beta from "../algorithm/beta";
import MedxArgs from "./args";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { OnProgressProps } from "react-player/base";
import { betaFromMean } from "../algorithm/priority";
import PrioritySlider from "../widgets/PrioritySlider";
import * as theme from "../utils/theme";

interface IExtractionView {
  blockUuid: string,
  priority: Beta,
  medxArgs: MedxArgs
}

export default function ExtractionView({ blockUuid, priority, medxArgs }: IExtractionView) {
  const noteRef = React.useRef<HTMLTextAreaElement>(null);
  const player = React.useRef<ReactPlayer | null>(null);
  const [playing, setPlaying] = React.useState<boolean>(false);
  const [range, setRange] = React.useState<number[]>([0, 1]);
  const [duration, setDuration] = React.useState<number>();
  const [volume, setVolume] = React.useState<number>(medxArgs.volume);
  const [rate, setRate] = React.useState<number>(medxArgs.rate);
  const [loop, setLoop] = React.useState<boolean>(medxArgs.loop);
  const [beta, setBeta] = React.useState<Beta>(priority);
  const [interval, setInterval] = React.useState<number>(initialIntervalFromMean(beta.mean));
  const note = React.useRef<string>('');
  const playerUrl = medxArgs.format == 'youtube' ? `https://www.youtube.com/watch?v=${medxArgs.url}` : medxArgs.urlTimed;

  const playerConfig = {
    file: {
      forceVideo: medxArgs.format == 'video',
      forceAudio: medxArgs.format == 'audio',
    }
  }

  function reset() {
    const b = beta ?? new Beta(1, 1);
    setBeta(b);
    setInterval(initialIntervalFromMean(b.mean));
    note.current = '';
    if (noteRef.current) noteRef.current.value = '';
  }

  function onDuration(d: number) {
    const start = medxArgs.start ?? 0;
    const end = medxArgs.end ?? d;
    setRange([start, end]);
    setDuration(d);
    setPlaying(true);
  }

  function onProgress({ played, playedSeconds, loaded, loadedSeconds }: OnProgressProps) {
    if (playedSeconds >= range[1]) {
      player.current?.seekTo(range[0]);
      setPlaying(loop);
    } else if (playedSeconds <= range[0]) {
      player.current?.seekTo(range[0]);
    }
  }

  function updateRange(newRange: number[]) {
    setRange(newRange);
  }

  async function updatePriority(mean: number) {
    const newBeta = betaFromMean(mean, { currentBeta: beta });
    setBeta(newBeta);
    const interval = initialIntervalFromMean(newBeta.mean);
    setInterval(interval);
  }
  
  async function extract() {
    const newArgs = new MedxArgs({
      flag: ':medx_ref',
      url: medxArgs.url,
      format: medxArgs.format,
      volume,
      rate,
      loop,
      start: range[0],
      end: range[1]
    });
    const noteText = note.current == '' ? '' : `${note.current} \n`;
    const content = `${noteText}${newArgs.render()} \n{{renderer :ib}}`;
    const due = new Date();
    due.setDate(due.getDate() + interval);
    const properties = { 'ib-reps': 0, 'ib-a': beta.a, 'ib-b': beta.b, 'ib-due': due.getTime(), 'ib-interval': interval };
    const b = await logseq.Editor.insertBlock(blockUuid, content, { properties, focus: false });
    reset();
    setRange([range[1], Math.min(range[1]+(range[1]-range[0]), length)]);
  }

  const loaded = duration != undefined;
  return (
    <div>
       <div id="medx-preview" className="mb-1">
        <ReactPlayer
          ref={(p) => player.current = p}
          width={'640px'}
          height={medxArgs.format == 'audio' ? '2rem' : '360px'}
          url={playerUrl}
          playing={playing}
          loop={loop}
          controls={true}
          volume={volume}
          playbackRate={rate}
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
          <RangeSelector 
            length={duration}
            range={range}
            onChange={updateRange}
          ></RangeSelector>
          
        <div className="flex mr-2">
          <div className="flex flex-col space-y-0.5">
            <label className="flex items-center justify-between">
              Loop
              <input
                type="checkbox"
                checked={loop}
                onChange={() => setLoop(!loop)}
              />
            </label>
            <label className="flex items-center justify-between">
              Speed
              <input
                className={`${theme.BG} ${theme.BORDER}`}
                type="number" 
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
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
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                min="0"
                max="1"
                step=".1"
              />
            </label>
          </div>
          <label className="w-full h-full ml-2">
            <textarea
              ref={noteRef}
              className={`w-full rounded p-1 ${theme.BG} ${theme.BORDER}`}
              placeholder="Note"
              rows={3}
              onChange={e => note.current = e.target.value}
            />
          </label>
        </div>
      <div className="flex items-center">
        <p>Priority</p>

        <div className="w-full ml-1">
          <PrioritySlider
            beta={beta}
            varianceSlider={false}
            onMeanChange={updatePriority}
          ></PrioritySlider>
        </div>

        <p className="ml-2">Interval</p>
        <input 
          className={`w-16 ml-1 ${theme.BORDER} ${theme.BG}`}
          type="number" 
          value={interval}
          onChange={(e) => setInterval(parseFloat(e.target.value))}
          min="1" 
          step="1"
        ></input>

        <div className="w-full"></div>

        <button 
          className="w-fit ml-2 mt-2 bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded" 
          onClick={extract}
        >
          Extract
        </button>
      </div>
      </>  
      }
    </div>
  );
}
