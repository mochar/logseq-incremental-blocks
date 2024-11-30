export const PRIORITY_PALETTE = [
  // "#ff595e66", "#ffca3a66", "#88bb6466", "#1982c466", "#6a4c9366",
  '#ffa5a5', '#ffe39f', '#feffb6', '#a7ffcc', '#b0cdff'
];

export const BETA_BOUNDS = {
  // Limits of a and b params. 
  // - Mode only defined for a,b > 1
  // - when a,b < 1, bimodal. Doesnt make sense to have here.
  // - With upper=100, we can reach mean precision of 0.01-0.99.
  paramLower: 1.,
  paramUpper: 100.,
  // Mean = a / (a+b)
  meanLower: 0.01, // 1/(1+paramUpper) = 0.01
  meanUpper: 0.99, // 100/(100+paramLower) = 0.99
}

export const RENDERER_MACRO_NAME = '{{renderer :ib}}';
export const PROP_REGEX = /[a-zA-Z0-9-_]+:: [^:]+/;
export const PLUGIN_ROUTE = '/page/incremental-blocks';
// From: logseq-plugin-files-manager
export const PARENT_MAIN_CONTAINER_ID = 'main-content-container';
