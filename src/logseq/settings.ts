import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin';

// https://github.com/ahonn/logseq-plugin-todo/blob/0da8279f2842958c4aa8dc8e1faad2d0a038d2d6/src/settings.ts

const settings: SettingSchemaDesc[] = [
  {
    key: 'defaultMultiplier',
    title: 'Default scheduler multiplier',
    description: 'Default scheduler multiplier.',
    default: 2.,
    type: 'number'
  },
  {
    key: 'queueTimer',
    title: 'Queue update frequency',
    description: 'In minutes. Only updates once the menu icon has been clicked.',
    default: 1,
    type: 'number'
  },
  {
    key: 'learnAutoOpen',
    title: 'Go to block on repetition',
    description: 'Immediately open the block that is currently being reviewed.',
    default: true,
    type: 'boolean'
  },
  {
    key: 'priorityRainbow',
    title: 'Rainbow',
    description: 'Rainbow',
    default: false,
    type: 'boolean'
  }
];

export default settings;