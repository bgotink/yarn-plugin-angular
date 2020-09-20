/* eslint-disable @typescript-eslint/no-unused-vars */

import {Box, Text} from 'ink';
import React from 'react';

import {SelectList} from '../elements/select-list';

import {UpdatableItem} from './state';

export function IdentListBox({
  items,
  title,
  activeItem,
  onChange,
  active,
}: {
  items: UpdatableItem[];
  title: string;
  activeItem: UpdatableItem | null;
  onChange: (item: UpdatableItem) => void;
  active: boolean;
}): JSX.Element {
  return (
    <Box
      flexGrow={1}
      flexBasis={0}
      borderStyle="round"
      borderColor={active ? 'blueBright' : 'grey'}
      position="relative"
      paddingY={1}
      paddingRight={1}
    >
      <Box position="absolute" marginLeft={2} marginTop={-1}>
        <Text>{title}</Text>
      </Box>

      <SelectList active={active} value={activeItem} values={items} onChange={onChange} />
    </Box>
  );
}
