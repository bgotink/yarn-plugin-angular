/* eslint-disable @typescript-eslint/no-unused-vars */

import {Configuration, DescriptorHash, Ident, IdentHash, Project, structUtils} from '@yarnpkg/core';
import {Box, Text, useInput} from 'ink';
import {intersects, minVersion, Range, sort, valid} from 'own-semver';
import React from 'react';

import {cleanRange, getUpdatableRange, simplifyRange} from '../../utils/ranges';
import {Key} from '../elements/key';

import {AppState, isIncluded, isRequired, isSelected} from './state';
import {getIncluders, getRequiredRange, getRequirers, rangeToString} from './state/status';
import {UpdateCollection} from './update-collection';

interface ItemUpdateCollection {
  ident: Ident;
  notes: string[];
  migrate?: {
    from: string;
    to?: string;
  };
  updates: ReadonlyMap<DescriptorHash, [oldRange: string, newRange: string]>;
}

export function PageConfirm({
  configuration,
  project,
  state: {itemMap, itemOrder, fetchMetaQueue},
  goToPreviousPage,
  goToNextPage,
}: {
  configuration: Configuration;
  project: Project;
  state: AppState;
  goToPreviousPage: () => void;
  goToNextPage: (collection: UpdateCollection) => void;
}): JSX.Element {
  const updateItems = fetchMetaQueue?.size
    ? null
    : itemOrder
        .filter(
          ident =>
            isSelected({itemMap}, ident) ||
            isRequired({itemMap}, ident) ||
            isIncluded({itemMap}, ident),
        )
        .map(ident => getItemUpdateCollection({configuration, project, itemMap, ident}));

  useInput(
    (ch, key) => {
      if (key.backspace || key.escape || key.leftArrow) {
        goToPreviousPage();
      }

      if (key.return && updateItems != null) {
        goToNextPage(
          new Map(
            updateItems.map(({ident, updates, migrate}) => [
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
          itemMap={itemMap}
          updateItem={item}
        />
      ))}
      <Box height={1} />
      <Text>
        If this looks correct, hit <Key>enter</Key> to confirm and start the update. Use{' '}
        <Key>backspace</Key> to go back and edit the selection, or <Key>ctrl-c</Key> to quit.
      </Text>
    </>
  );
}

function getItemUpdateCollection({
  configuration,
  project,
  itemMap,
  ident,
}: {
  configuration: Configuration;
  project: Project;
  itemMap: AppState['itemMap'];
  ident: IdentHash;
}): ItemUpdateCollection {
  const item = itemMap.get(ident)!;

  const notes: string[] = [];
  let versionOrRange: string | Range | undefined;

  if (item.selectedRange != null) {
    const requiredRange = getRequiredRange({itemMap}, ident);
    if (requiredRange == null || intersects(requiredRange, item.selectedRange)) {
      versionOrRange = item.selectedRange;
    }
  }

  if (versionOrRange == null) {
    const includers = getIncluders({itemMap}, ident);
    const requirers = getRequirers({itemMap}, ident);

    if (includers != null) {
      versionOrRange = includers[0].range;

      if (includers.length !== 1) {
        const ranges = new Set(includers.map(includer => rangeToString(includer.range)));

        if (ranges.size > 1) {
          notes.push(
            `Multiple versions are included: ${Array.from(ranges, range =>
              structUtils.prettyRange(configuration, range),
            ).join(', ')}`,
          );
        }
      }
    } else if (requirers != null) {
      const suggestedRanges = item.suggestions;
      const requiredRange = getRequiredRange({itemMap}, ident);

      if (suggestedRanges != null && requiredRange != null) {
        versionOrRange = suggestedRanges.find(range => intersects(range, requiredRange));
      }

      if (versionOrRange == null) {
        versionOrRange = requirers[0].range;
      }

      if (requirers.length !== 1) {
        const ranges = new Set(requirers.map(requirer => rangeToString(requirer.range)));

        if (ranges.size > 1) {
          notes.push(
            `Multiple versions are required: ${Array.from(ranges, range =>
              structUtils.prettyRange(configuration, range),
            ).join(', ')}`,
          );
        }
      }
    } else {
      throw new Error(`Unexpected updated item: ${item.label}`);
    }
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

  const newRange = rangeToString(versionOrRange);

  return {
    ident: item.ident,
    notes,
    migrate: item.meta?.hasMigrations
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
  updateItem: {ident, notes, updates, migrate},
  itemMap,
}: {
  project: Project;
  configuration: Configuration;
  updateItem: ItemUpdateCollection;
  itemMap: AppState['itemMap'];
}) {
  const item = itemMap.get(ident.identHash)!;

  const numberOfWorkspaces = project.workspaces.length;

  return (
    <Box>
      <Box width={2}>
        <Text>•</Text>
      </Box>
      <Box flexDirection="column">
        <Text>Package {item.label}</Text>
        <Box marginLeft={2} flexDirection="column">
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
          {migrate != null && <Text>This package has migrations</Text>}
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
