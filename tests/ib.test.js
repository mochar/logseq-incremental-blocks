import { expect, test } from 'vitest';
import { addContentAndProps } from '../src/utils';

function dedent(segments, ...args) {
    const lines = segments
        .reduce((acc, segment, i) =>  acc + segment + (args[i] || ''), '') // get raw string
        .trimEnd().split('\n') // Split the raw string into lines
        .filter(line => line != "") // remove empty lines

    // Find the minimum number of leading spaces across all lines
    const minLeadingSpaces = lines.reduce((acc, line) => {
        // Find the number of leading spaces for this line
        const leadingSpaces = line.match(/^ */)[0].length
        // if it has less leading spaces than the previous minimum, set it as the new minimum
        return leadingSpaces < acc ? leadingSpaces :  acc
    }, Infinity)

    // Trim lines, join them and return the result
    return lines.map(line => line.substring(minLeadingSpaces)).join('\n')
}

const CONTENT_MAIN = dedent`
some content
one more line
{{macro other}}
`;
const CONTENT_PROPS = dedent`
prop-a:: some val
prop-b:: another one
`;
const CONTENT = dedent`
${CONTENT_MAIN}
${CONTENT_PROPS}
`;
console.log(CONTENT);

test('add macro', () => {
  const addition = '{{macro ib}}'
  const newContent = addContentAndProps(CONTENT, { addition });
  const expected = `${CONTENT_MAIN}\n${addition}\n${CONTENT_PROPS}`;
  expect(newContent).toBe(expected);
});

test('add props', () => {
  const props = {
    'new-prop': 12,
    'secondProp': 'a'
  }
  const propsText = dedent`
  new-prop:: 12
  second-prop:: a
  `;
  const newContent = addContentAndProps(CONTENT, { props });
  const expected = `${CONTENT}\n${propsText}`;
  expect(newContent).toBe(expected);
});

test('add macro and props', () => {
  const addition = '{{macro ib}}'
  const props = {
    'new-prop': 12,
    'secondProp': 'a'
  }
  const propsText = dedent`
  new-prop:: 12
  second-prop:: a
  `;
  const newContent = addContentAndProps(CONTENT, { addition, props });
  const expected = `${CONTENT_MAIN}\n${addition}\n${CONTENT_PROPS}\n${propsText}`;
  expect(newContent).toBe(expected);
});

test('add prop already exists', () => {
  const props = {
    'new-prop': 12,
    'prop-b': 'a'
  }
  const propsText = dedent`
  new-prop:: 12
  `;
  const newContent = addContentAndProps(CONTENT, { props });
  const expected = `${CONTENT}\n${propsText}`;
  expect(newContent).toBe(expected);
});

test('add macro only text', () => {
  const addition = '{{macro ib}}'
  const newContent = addContentAndProps(CONTENT_MAIN, { addition });
  expect(newContent).toBe(`${CONTENT_MAIN}\n${addition}`);
});