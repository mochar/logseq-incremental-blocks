import LearnQueue from "./queue";

interface Globals {
  learning: boolean,
  queue: LearnQueue,
}

const GLOBALS: Globals = {
  learning: false,
  queue: new LearnQueue(),
}

const PRIORITY_PALETTE = [
  // "#ff595e66", "#ffca3a66", "#88bb6466", "#1982c466", "#6a4c9366",
  '#ffa5a5', '#ffe39f', '#feffb6', '#a7ffcc', '#b0cdff'
];

export { GLOBALS, PRIORITY_PALETTE };
