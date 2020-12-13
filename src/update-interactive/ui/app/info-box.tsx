/* eslint-disable @typescript-eslint/no-unused-vars */
import {Configuration, structUtils} from '@yarnpkg/core';
import {Box, BoxProps, Text} from 'ink';
import React from 'react';

import {AppState, rangeToString, UpdatableItem} from './state';

export function InfoBox({
  activeItem,
  state,
  configuration,
  ...boxProps
}: {
  activeItem: UpdatableItem | null;
  state: AppState;
  configuration: Configuration;
} & BoxProps): JSX.Element {
  if (activeItem == null) {
    return <Box borderColor="grey" borderStyle="round" {...boxProps} />;
  }

  const includers = state.included.get(activeItem.identHash)?.by;
  const requirers = state.selectedAndRequired.get(activeItem.identHash)?.by;
  const newRange =
    activeItem.selectedRange ?? state.selectedAndRequired.get(activeItem.identHash)?.selectedRange;

  return (
    <Box
      borderColor="grey"
      borderStyle="round"
      {...boxProps}
      flexDirection="column"
      justifyContent="center"
      alignItems="flex-start"
    >
      <Text>Package {structUtils.prettyIdent(configuration, activeItem.ident)}</Text>
      <Text>
        Current versions:{' '}
        {Array.from(
          new Set(
            activeItem.requestedDescriptors.map(({range}) =>
              structUtils.prettyRange(configuration, range),
            ),
          ),
        ).join(', ')}
      </Text>
      <Text>
        Selected new version: {newRange ? structUtils.prettyRange(configuration, newRange) : 'none'}
      </Text>
      <Box>
        {!!includers?.size && (
          <Box flexDirection="column">
            <Text>Included by:</Text>
            {Array.from(includers, ([ident, range]) => (
              <Text>
                - {structUtils.prettyIdent(configuration, state.itemMap.get(ident)!.ident)} {'->'}{' '}
                {structUtils.prettyRange(configuration, rangeToString(range, true))}
              </Text>
            ))}
          </Box>
        )}
        {!!requirers?.size && (
          <Box flexDirection="column">
            <Text>An update is required by:</Text>
            {Array.from(requirers, ([ident, range]) => (
              <Text>
                - {structUtils.prettyIdent(configuration, state.itemMap.get(ident)!.ident)} {'->'}{' '}
                {structUtils.prettyRange(configuration, rangeToString(range, true))}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
