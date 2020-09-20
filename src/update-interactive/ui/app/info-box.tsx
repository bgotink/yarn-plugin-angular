/* eslint-disable @typescript-eslint/no-unused-vars */
import {Configuration, IdentHash, structUtils} from '@yarnpkg/core';
import {Box, BoxProps, Text} from 'ink';
import React from 'react';

import {getIncluders, getRequirers, rangeToString, UpdatableItem} from './state';

export function InfoBox({
  activeItem,
  itemMap,
  configuration,
  ...boxProps
}: {
  activeItem: UpdatableItem | null;
  itemMap: ReadonlyMap<IdentHash, UpdatableItem>;
  configuration: Configuration;
} & BoxProps): JSX.Element {
  if (activeItem == null) {
    return <Box borderColor="grey" borderStyle="round" {...boxProps} />;
  }

  const includers = getIncluders({itemMap}, activeItem.identHash);
  const requirers = getRequirers({itemMap}, activeItem.identHash);

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
        Selected new version:{' '}
        {activeItem.selectedRange
          ? structUtils.prettyRange(configuration, activeItem.selectedRange)
          : 'none'}
      </Text>
      <Box>
        {includers && (
          <Box flexDirection="column">
            <Text>Included by:</Text>
            {includers.map(({ident, range}) => (
              <Text>
                - {structUtils.prettyIdent(configuration, itemMap.get(ident)!.ident)} {'->'}{' '}
                {structUtils.prettyRange(configuration, rangeToString(range, true))}
              </Text>
            ))}
          </Box>
        )}
        {requirers && (
          <Box flexDirection="column">
            <Text>An update is required by:</Text>
            {requirers.map(({ident, range}) => (
              <Text>
                - {structUtils.prettyIdent(configuration, itemMap.get(ident)!.ident)} {'->'}{' '}
                {structUtils.prettyRange(configuration, rangeToString(range, true))}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
