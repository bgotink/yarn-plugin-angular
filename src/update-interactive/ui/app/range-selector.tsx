/* eslint-disable @typescript-eslint/no-unused-vars */

import {Configuration, Descriptor, structUtils} from '@yarnpkg/core';
import {Box, BoxProps, Text} from 'ink';
import {Range, subset} from 'own-semver';
import React from 'react';

import {ItemOptions} from '../elements/item-options';
import {Key} from '../elements/key';

import type {
  AppState,
  IncludedInformation,
  SelectedOrRequiredInformation,
  UpdatableItem,
} from './state';

export function RangeSelector({
  configuration,
  activeItem,
  state,
  getSuggestions,
  onChange,
  inclusion,
  selectionOrRequirement,
  ...props
}: {
  configuration: Configuration;
  activeItem: UpdatableItem | null;
  state: AppState;
  getSuggestions: (descriptor: Descriptor, range: Range | null) => readonly string[];
  onChange: (range: string | null) => void;
  inclusion: IncludedInformation | null | undefined;
  selectionOrRequirement: SelectedOrRequiredInformation | null | undefined;
} & BoxProps): JSX.Element {
  if (activeItem == null) {
    return (
      <Box
        borderColor="grey"
        borderStyle="round"
        {...props}
        alignItems="center"
        justifyContent="center"
      >
        <Text color="grey">Select an item</Text>
      </Box>
    );
  }

  if (activeItem.selectedRange == null && inclusion != null) {
    return (
      <Box
        borderColor="grey"
        borderStyle="round"
        {...props}
        alignItems="center"
        justifyContent="flex-start"
      >
        <Text>
          This package cannot be chosen, its version is defined by{' '}
          {Array.from(inclusion.by.keys(), ident =>
            structUtils.prettyIdent(configuration, state.itemMap.get(ident)!.ident),
          ).join(', ')}
        </Text>
      </Box>
    );
  }

  let suggestions = selectionOrRequirement?.suggestions;

  if (suggestions == null && state.suggestionsFetched.has(activeItem.identHash)) {
    suggestions = getSuggestions(activeItem.requestedDescriptors[0], null);
  }

  if (suggestions == null) {
    return (
      <Box
        borderColor="grey"
        borderStyle="round"
        {...props}
        alignItems="center"
        justifyContent="center"
      >
        <Text color="grey">Loading suggestions...</Text>
      </Box>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Box
        borderColor="grey"
        borderStyle="round"
        {...props}
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
      >
        <Text>Couldn't find suggested updates</Text>
        <Text>
          Using version{' '}
          {structUtils.prettyRange(configuration, activeItem.requestedDescriptors[0].range)}
        </Text>
      </Box>
    );
  }

  const validRange = selectionOrRequirement?.validRange ?? inclusion?.validRange;
  const isValidRange = validRange ? (range: string) => subset(range, validRange) : () => true;

  const currentRange = activeItem.requestedDescriptors[0].range;
  const options = [
    {
      value: null,
      label: structUtils.prettyRange(configuration, currentRange),
      disabled: !isValidRange(activeItem.requestedDescriptors[0].range),
    },
    ...suggestions
      .filter(range => range !== currentRange)
      .map(value => ({
        value,
        label: structUtils.prettyRange(configuration, value),
        disabled: !isValidRange(value),
      })),
  ];

  const activeOption =
    options.find(option => option.value === activeItem.selectedRange) ??
    options.find(option => !option.disabled) ??
    options[0];

  return (
    <Box
      borderColor="grey"
      borderStyle="round"
      {...props}
      flexDirection="column"
      paddingLeft={1}
      justifyContent="center"
      alignItems="flex-start"
    >
      <Text>
        Select a version using the <Key>tab</Key>/<Key>shift+tab</Key> keys
      </Text>
      <ItemOptions
        active
        items={options}
        activeItem={activeOption}
        onChange={({value}) => onChange(value)}
      />
    </Box>
  );
}
