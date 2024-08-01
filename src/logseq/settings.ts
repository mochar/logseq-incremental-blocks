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
];

export default settings;