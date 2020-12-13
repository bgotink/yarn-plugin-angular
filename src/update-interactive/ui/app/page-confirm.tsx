/* eslint-disable @typescript-eslint/no-unused-vars */

import {Configuration, DescriptorHash, Ident, IdentHash, Project, structUtils} from '@yarnpkg/core';
import {Box, Text, useInput} from 'ink';
import {minVersion, sort, valid} from 'own-semver';
import React from 'react';

import {cleanRange, getUpdatableRange, simplifyRange} from '../../utils/ranges';
import {Key} from '../elements/key';

import {AppState, rangeToString} from './state';
import type {UpdateCollection} from './update-collection';

interface ItemUpdateCollection {
  ident: Ident;
  notes: string[];
  migrate?: {
    from: string;
    to?: string;
  };
  updates: ReadonlyMap<DescriptorHash, [oldRange: string, newRange: string]>;
}

interface ItemWithoutUpdateCollection {
  ident: Ident;
  notes: string[];
  updates: null;
}

export function PageConfirm({
  configuration,
  project,
  state,
  goToPreviousPage,
  goToNextPage,
}: {
  configuration: Configuration;
  project: Project;
  state: AppState;
  goToPreviousPage: () => void;
  goToNextPage: (collection: UpdateCollection) => void;
}): JSX.Element {
  const updateItems = state.metaFetching?.size
    ? null
    : state.itemOrder
        .filter(ident => state.selectedAndRequired.has(ident))
        .map(ident => getItemUpdateCollection({configuration, project, state, ident}));

  useInput(
    (ch, key) => {
      if (key.backspace || key.escape || key.leftArrow) {
        goToPreviousPage();
      }

      if (key.return && updateItems != null) {
        goToNextPage(
          new Map(
            updateItems
              .filter((item): item is ItemUpdateCollection => item.updates != null)
              .map(({ident, updates, migrate}) => [
                ident.identHash,
                {
                  migrate,
                  ident,
                  updates: new Map(
                    Array.from(updates, ([descriptor, [, range]]) => [descriptor, range]),
                  ),
                },
              ]),
          ),
        );
      }
    },
    {isActive: true},
  );

  if (updateItems == null) {
    return <Text>Loading data...</Text>;
  }

  return (
    <>
      {updateItems.map(item => (
        <ConfirmationItem
          key={item.ident.identHash}
          configuration={configuration}
          project={project}
          itemMap={state.itemMap}
          updateItem={item}
        />
      ))}
      <Box height={1} />
      <Text>
        If this looks correct, hit <Key>enter</Key> to confirm and start the update. Use{' '}
        <Key>arrow left</Key> to go back and edit the selection, or <Key>ctrl-c</Key> to quit.
      </Text>
    </>
  );
}

function getItemUpdateCollection({
  configuration,
  ident,
  project,
  state,
}: {
  configuration: Configuration;
  ident: IdentHash;
  project: Project;
  state: AppState;
}): ItemUpdateCollection | ItemWithoutUpdateCollection {
  const item = state.itemMap.get(ident)!;
  const selectionInfo = state.selectedAndRequired.get(ident);
  const inclusionInfo = state.included.get(ident);

  const versionOrRange = item.selectedRange ?? state.selectedAndRequired.get(ident)!.selectedRange;
  const notes: string[] = [];

  if (versionOrRange == null) {
    if (!selectionInfo?.conflictingRanges) {
      throw new Error(`Unexpected updated item: ${item.label}`);
    }

    notes.push(
      `Couldn't find a version to update to, keeping ${item.label} at the current version`,
    );
  }

  if (inclusionInfo != null) {
    if (inclusionInfo.by.size > 1) {
      const ranges = new Set(Array.from(inclusionInfo.by.values(), range => rangeToString(range)));

      if (ranges.size > 1) {
        notes.push(
          `Multiple versions are included: ${Array.from(ranges, range =>
            structUtils.prettyRange(configuration, range),
          ).join(', ')}`,
        );
      }
    }
  }

  if (selectionInfo?.conflictingRanges) {
    const ranges = new Set(Array.from(selectionInfo.by.values(), range => rangeToString(range)));

    notes.push(
      `Multiple versions are required: ${Array.from(ranges, range =>
        structUtils.prettyRange(configuration, range),
      ).join(', ')}`,
    );
  }

  const {installedDescriptors, requestedDescriptors} = item;
  const installedLocators = new Set(
    installedDescriptors.map(descriptor => {
      let locator = project.storedResolutions.get(descriptor.descriptorHash);

      if (locator == null) {
        locator = project.storedResolutions.get(
          structUtils.makeDescriptor(
            descriptor,
            `${configuration.get<string>('defaultProtocol')}${descriptor.range}`,
          ).descriptorHash,
        );
      }

      if (locator == null) {
        throw new Error(`No resolution found for ${structUtils.stringifyDescriptor(descriptor)}`);
      }

      return locator;
    }),
  );

  if (installedLocators.size > 1) {
    notes.push(
      `Multiple versions of this package are installed: ${Array.from(installedLocators, locator =>
        structUtils.prettyRange(
          configuration,
          project.storedPackages.get(locator)?.version ?? 'no version',
        ),
      ).join(', ')}`,
    );
  }

  const lowestInstalledVersion = sort(
    Array.from(installedLocators, locator => {
      const installedPackage = project.storedPackages.get(locator)!;
      return installedPackage.version;
    }).filter((version): version is string => version != null),
  )[0];

  if (versionOrRange == null) {
    return {
      ident: item.ident,
      notes,
      updates: null,
    };
  }

  const newRange = rangeToString(versionOrRange);

  return {
    ident: item.ident,
    notes,
    migrate: selectionInfo?.hasMigrations
      ? {
          from: lowestInstalledVersion,
          to: valid(newRange) ? newRange : minVersion(newRange)?.version ?? undefined,
        }
      : undefined,
    updates: new Map(
      requestedDescriptors.map(descriptor => {
        const {parsedRange, stringifyRange} = parseRange(descriptor.range);

        return [
          descriptor.descriptorHash,
          [
            descriptor.range,
            stringifyRange(getUpdatableRange(simplifyRange(newRange), cleanRange(parsedRange))),
          ],
        ];
      }),
    ),
  };
}

function parseRange(
  range: string,
): {parsedRange: string; stringifyRange: (selector: string) => string} {
  const parsedRange = structUtils.parseRange(range);

  if (parsedRange.protocol !== 'patch:') {
    return {
      parsedRange: parsedRange.selector,
      stringifyRange(selector) {
        return structUtils.makeRange({...parsedRange, selector});
      },
    };
  }

  const patchDescriptor = structUtils.parseDescriptor(parsedRange.source!);
  const {parsedRange: parsedPatchRange, stringifyRange: stringifyPatchRange} = parseRange(
    patchDescriptor.range,
  );

  return {
    parsedRange: parsedPatchRange,
    stringifyRange(selector) {
      return structUtils.makeRange({
        ...parsedRange,
        source: structUtils.stringifyDescriptor(
          structUtils.makeDescriptor(patchDescriptor, stringifyPatchRange(selector)),
        ),
      });
    },
  };
}

function ConfirmationItem({
  project,
  configuration,
  updateItem,
  itemMap,
}: {
  project: Project;
  configuration: Configuration;
  updateItem: ItemUpdateCollection | ItemWithoutUpdateCollection;
  itemMap: AppState['itemMap'];
}) {
  const {ident, notes} = updateItem;
  const item = itemMap.get(ident.identHash)!;

  let content;

  if (updateItem.updates == null) {
    content = <></>;
  } else {
    const numberOfWorkspaces = project.workspaces.length;
    const {updates, migrate} = updateItem;

    content = (
      <>
        <Text>
          Updating {updates.size === 1 ? 'version' : 'versions'} in package.json{' '}
          {numberOfWorkspaces === 1 ? 'file' : 'files'}:
        </Text>
        {Array.from(updates.entries(), ([descriptorHash, [oldRange, newRange]]) => (
          <Text key={descriptorHash}>
            - {structUtils.prettyRange(configuration, oldRange)} {'=>'}{' '}
            {structUtils.prettyRange(configuration, newRange)}
          </Text>
        ))}
        {migrate != null && (
          <Text>
            <Text color="blueBright">ℹ</Text> This package has migrations
          </Text>
        )}
      </>
    );
  }

  return (
    <Box>
      <Box width={2}>
        <Text>•</Text>
      </Box>
      <Box flexDirection="column">
        <Text>Package {item.label}</Text>
        <Box marginLeft={2} flexDirection="column">
          {content}
        </Box>
        {notes.length > 0 && (
          <Box>
            <Box width={2}>
              <Text color="redBright">⚠</Text>
            </Box>
            <Box flexDirection="column">
              {notes.map((note, i) => (
                <Text key={i}>{note}</Text>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
