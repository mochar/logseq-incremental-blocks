import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import React, { useMemo } from "react";
import ReactPlayer from 'react-player/lazy';
import RangeSelector from "./RangeSelector";
import IncrementalBlock from "../IncrementalBlock";
import Beta from "../algorithm/beta";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import MedxArgs from "./args";
import { OnProgressProps } from "react-player/base";

export default function MedxPopover({ block, slot, args }: { block: BlockEntity, slot: string, args: MedxArgs }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const player = React.useRef<ReactPlayer | null>(null);
  const [playing, setPlaying] = React.useState<boolean>(false);
  const [range, setRange] = React.useState<number[]>([0, 1]);
  const [duration, setDuration] = React.useState<number>();
  const playerUrl = args.format == 'youtube' ? `https://www.youtube.com/watch?v=${args.url}` : args.urlTimed;

  React.useEffect(() => {
    // Set position above bar
    const div = top?.document.getElementById(slot);
    if (div) {
      const elemBoundingRect = div.getBoundingClientRect();
      ref.current!.style.top = `${elemBoundingRect.top - (ref.current?.clientHeight ?? 0) - 10}px`;
      ref.current!.style.left = `${elemBoundingRect.left}px`;
    }
  }, [block]);

  const playerConfig = useMemo(() => {
    return {
      // youtube: {
      //   playerVars: {
      //     start: range[0],
      //     end: range[1]
      //   }
      // },
      file: {
        forceVideo: args.format == 'video',
        forceAudio: args.format == 'audio',
      }
    };
  }, [range]);

  function onDuration(d: number) {
    const start = args.start ?? 0;
    const end = args.end ?? d;
    setRange([start, end]);
    setDuration(d);
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
  
  async function extract() {
    const ib = IncrementalBlock.fromBlock(block);
    const newArgs = new MedxArgs({
      url: args.url,
      format: args.format,
      volume: args.volume,
      rate: args.rate,
      loop: args.loop,
      start: range[0],
      end: range[1]
    });
    const content = `${newArgs.render()}\n{{renderer :ib}}`;
    let beta = ib.beta;
    if (!beta) {
      beta = new Beta(1, 1);
      beta.mean = logseq.settings?.defaultPriority as number ?? 0.5;
    }
    const interval = initialIntervalFromMean(beta.mean);
    const due = new Date();
    due.setDate(due.getDate() + interval);
    const properties = { 'ib-reps': 0, 'ib-a': beta.a, 'ib-b': beta.b, 'ib-due': due.getTime(), 'ib-interval': interval };
    const b = await logseq.Editor.insertBlock(block.uuid, content, { properties, focus: false });
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
      <button 
        className="w-fit mt-2 bg-blue-500 hover:bg-blue-400 text-white py-1 px-1 w-1/6 border-b-2 border-blue-700 hover:border-blue-500 rounded" 
        onClick={extract}
      >
        Extract
      </button>
    </>;
  }

  return (
  <div 
    ref={ref} 
    id="ib-medx" 
    style={{position: "fixed"}} 
    className="flex flex-col rounded-lg border bg-white shadow-md p-2 divide-x text-sm"
  >
    {content}

    <div id="medx-preview" className="mt-1">
      <ReactPlayer 
        ref={(p) => player.current = p}
        width={args.format == 'audio' ? '300px' : '640px'}
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