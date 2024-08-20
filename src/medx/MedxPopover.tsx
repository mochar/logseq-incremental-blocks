import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import React, { useMemo } from "react";
import ReactPlayer from 'react-player/lazy';
import RangeSelector from "./RangeSelector";
import IncrementalBlock from "../IncrementalBlock";
import Beta from "../algorithm/beta";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import MedxArgs from "./args";
import { OnProgressProps } from "react-player/base";
import PrioritySlider from "../widgets/PrioritySlider";
import { betaFromMean } from "../algorithm/priority";

export default function MedxPopover({ block, slot, args }: { block: BlockEntity, slot: string, args: MedxArgs }) {
  const ib = IncrementalBlock.fromBlock(block);
  const ref = React.useRef<HTMLDivElement>(null);
  const noteRef = React.useRef<HTMLTextAreaElement>(null);
  const player = React.useRef<ReactPlayer | null>(null);
  const [playing, setPlaying] = React.useState<boolean>(false);
  const [range, setRange] = React.useState<number[]>([0, 1]);
  const [duration, setDuration] = React.useState<number>();
  const [beta, setBeta] = React.useState<Beta>(ib.beta ?? new Beta(1, 1));
  const [interval, setInterval] = React.useState<number>(initialIntervalFromMean(beta.mean));
  const note = React.useRef<string>('');
  const playerUrl = args.format == 'youtube' ? `https://www.youtube.com/watch?v=${args.url}` : args.urlTimed;

  const playerConfig = {
    file: {
      forceVideo: args.format == 'video',
      forceAudio: args.format == 'audio',
    }
  }

  function reset() {
    const b = ib.beta ?? new Beta(1, 1);
    setBeta(b);
    setInterval(initialIntervalFromMean(b.mean));
    note.current = '';
    if (noteRef.current) noteRef.current.value = '';
  }

  function onDuration(d: number) {
    const start = args.start ?? 0;
    const end = args.end ?? d;
    setRange([start, end]);
    setDuration(d);
    setPlaying(true);
  }

  function onProgress({ played, playedSeconds, loaded, loadedSeconds }: OnProgressProps) {
    if (playedSeconds >= range[1]) {
      player.current?.seekTo(range[1]);
      setPlaying(false);
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
      url: args.url,
      format: args.format,
      volume: args.volume,
      rate: args.rate,
      loop: args.loop,
      start: range[0],
      end: range[1]
    });
    const noteText = note.current == '' ? '' : `${note.current} \n`;
    const content = `${noteText}${newArgs.render()} \n{{renderer :ib}}`;
    const due = new Date();
    due.setDate(due.getDate() + interval);
    const properties = { 'ib-reps': 0, 'ib-a': beta.a, 'ib-b': beta.b, 'ib-due': due.getTime(), 'ib-interval': interval };
    const b = await logseq.Editor.insertBlock(block.uuid, content, { properties, focus: false });
    reset();
  }

  let content;
  if (!duration) {
    content = <p>Loading...</p>;
  } else {
    content = <>
      <RangeSelector 
        length={duration}
        initStart={range[0]}
        initEnd={range[1]}
        onChange={updateRange}
      ></RangeSelector>
      <label className="w-full">
        <textarea
          ref={noteRef}
          className="border w-full rounded p-1" 
          placeholder="Note"
          rows={2}
          onChange={e => note.current = e.target.value} 
        />
      </label>
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
          className="border w-16 ml-1" 
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
    </>;
  }

  return (
  <div 
    ref={ref} 
    id="ib-medx" 
    className="fixed flex flex-col rounded border bg-white shadow-md p-2"
  >
    {content}

    <div id="medx-preview" className="mt-1">
      <ReactPlayer 
        ref={(p) => player.current = p}
        // width={args.format == 'audio' ? '300px' : '640px'}
        width={'640px'}
        height={args.format == 'audio' ? '2rem' : '360px'}
        url={playerUrl}
        playing={playing}
        loop={args.loop}
        controls={true}
        volume={args.volume}
        playbackRate={args.rate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onDuration={onDuration}
        onProgress={onProgress}
        config={playerConfig}
      />
    </div>
  </div>
  );
}