import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin';

// https://github.com/ahonn/logseq-plugin-todo/blob/0da8279f2842958c4aa8dc8e1faad2d0a038d2d6/src/settings.ts

const settings: SettingSchemaDesc[] = [
  {
    key: 'defaultPriority',
    title: 'Default priority (0=low, 1=high)',
    description: 'Use this priority by default unless inherited from parent or page.',
    default: 0.5,
    type: 'number'
  },
  {
    key: 'defaultMultiplier',
    title: 'Default scheduler multiplier',
    description: 'Default scheduler multiplier.',
    default: 1.3,
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
    key: 'learnAutoIb',
    title: 'Automatically create ibs when learning',
    description: 'While learning, new blocks will automatically be converted to ibs.\nExpect jankness.',
    default: false,
    type: 'boolean'
  },
  {
    key: 'priorityRainbow',
    title: 'Rainbow',
    description: 'Rainbow',
    default: false,
    type: 'boolean'
  },
  {
    key: 'subsetQueries',
    title: 'Subset learning queue by refs',
    description: 'Filter learning queue using block references for focused learning.\nExample: `todo, hmm interesting, cooking`',
    default: 'set, [[ref]], filter, in settings',
    type: 'string'
  },
  {
    key: 'keyConvertToIb',
    type: 'string',
    title: 'Shortcut: Convert current block to ib',
    description: 'Converts current block to an ib by adding the necessary properties and macro.',
    default: 'mod+alt+i'
  },
  {
    key: 'keyExtractSelection',
    type: 'string',
    title: 'Shortcut: Extract selected text',
    description: 'Create a child ib of selected text and replace selection with reference.',
    default: 'mod+alt+x'
  },
  {
    key: 'keyExtractCloze',
    type: 'string',
    title: 'Shortcut: Extract cloze of selected text into ib',
    description: 'Creates a copy child ib with the selected text replaced with a cloze.',
    default: 'mod+alt+z'
  },
  {
    key: 'keyExtractClozeCard',
    type: 'string',
    title: 'Shortcut: Extract cloze of selected text into card',
    description: 'Creates a child card block with same contents but with the selected text replaced with a cloze.',
    default: 'shift+mod+alt+z'
  }
];

export default settings;