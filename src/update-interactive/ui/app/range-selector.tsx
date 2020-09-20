/* eslint-disable @typescript-eslint/no-unused-vars */

import {Configuration, IdentHash, structUtils} from '@yarnpkg/core';
import {Box, BoxProps, Text} from 'ink';
import {Range, subset} from 'own-semver';
import React from 'react';

import {getIntersection} from '../../utils';
import {ItemOptions} from '../elements/item-options';
import {Key} from '../elements/key';

import {getRequirers, isIncluded, UpdatableItem} from './state';
import {getIncluders} from './state/status';

export function RangeSelector({
  configuration,
  activeItem,
  itemMap,
  onChange,
  ...props
}: {
  configuration: Configuration;
  activeItem: UpdatableItem | null;
  itemMap: ReadonlyMap<IdentHash, UpdatableItem>;
  onChange: (range: string | null) => void;
} & BoxProps): JSX.Element {
  if (activeItem != null && isIncluded({itemMap}, activeItem.identHash)) {
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
          {getIncluders({itemMap}, activeItem.identHash)!
            .map(item => structUtils.prettyIdent(configuration, itemMap.get(item.ident)!.ident))
            .join(', ')}
        </Text>
      </Box>
    );
  }

  if (activeItem == null || activeItem.suggestions == null) {
    return (
      <Box
        borderColor="grey"
        borderStyle="round"
        {...props}
        alignItems="center"
        justifyContent="center"
      >
        <Text color="grey">{activeItem != null ? 'Loading suggestions...' : 'Select an item'}</Text>
      </Box>
    );
  }

  if (activeItem.suggestions.length === 0) {
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

  let isValidRange: (range: string) => boolean = () => true;
  const requirers = getRequirers({itemMap}, activeItem.identHash);
  if (requirers != null) {
    const requirement = requirers
      .map(req => req.range)
      .filter((r): r is Range => typeof r !== 'string')
      .reduce((previous, current) =>
        previous != null ? getIntersection(previous, current)! : null!,
      ) as Range | null;

    if (requirement != null) {
      isValidRange = range => subset(range, requirement);
    }
  }

  const options = [
    {
      value: null,
      label: structUtils.prettyRange(configuration, activeItem.requestedDescriptors[0].range),
      disabled: !isValidRange(activeItem.requestedDescriptors[0].range),
    },
    ...activeItem.suggestions.map(value => ({
      value,
      label: structUtils.prettyRange(configuration, value),
      disabled: !isValidRange(value),
    })),
  ];

  if (options.every(option => option.disabled)) {
    return (
      <Box
        borderColor="grey"
        borderStyle="round"
        {...props}
        flexDirection="column"
        justifyContent="center"
        alignItems="flex-start"
        paddingLeft={1}
      >
        <Text>
          <Text color="redBright" bold>
            Warning:
          </Text>{' '}
          No update could be suggested for {options[0].label}
        </Text>
        <Box height={1} />
        <Text>
          This can be caused by conflicting peer dependencies, or peer dependencies requiring a
          downgrade.
        </Text>
        <Text>You might have to update this package manually.</Text>
      </Box>
    );
  }

  const activeOption =
    options.find(option => option.value === activeItem.selectedRange && !option.disabled) ??
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
