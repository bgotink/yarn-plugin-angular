/* eslint-disable @typescript-eslint/no-unused-vars */

import {Box, Text} from 'ink';
import React from 'react';

import {KeyMatcher, useListInput} from '../hooks/use-list-input';

const minus: KeyMatcher = (char, key) => {
  return (key.tab && key.shift) || char === '<';
};

const plus: KeyMatcher = (char, key) => {
  return (key.tab && !key.shift) || char === '>';
};

export function ItemOptions<T>({
  active,
  items,
  activeItem,
  onChange,
  size = 17,
}: {
  active: boolean;
  items: {value: T; label: string; disabled?: boolean}[];
  activeItem: {value: T; label: string; disabled?: boolean};
  onChange: (value: {value: T; label: string; disabled?: boolean}) => void;
  size?: number;
}): JSX.Element {
  useListInput(activeItem, items, {
    active,
    minus,
    plus,
    onChange,
  });

  return (
    <Box width="100%" justifyContent="flex-start">
      {items.map(item => {
        if (item === activeItem) {
          return (
            <Box key={item.label} minWidth={size - 1} marginLeft={1}>
              <Text wrap="truncate">
                <Text color="green"> ◉ </Text> <Text bold>{item.label}</Text>
              </Text>
            </Box>
          );
        } else if (item.disabled) {
          return (
            <Box key={item.label} minWidth={size - 1} marginLeft={1}>
              <Text wrap="truncate">
                <Text color="grey">
                  {' '}
                  ◯ <Text dimColor>{item.label}</Text>
                </Text>
              </Text>
            </Box>
          );
        } else {
          return (
            <Box key={item.label} minWidth={size - 1} marginLeft={1}>
              <Text wrap="truncate">
                <Text color="yellow"> ◯ </Text> <Text bold>{item.label}</Text>
              </Text>
            </Box>
          );
        }
      })}
    </Box>
  );
}
