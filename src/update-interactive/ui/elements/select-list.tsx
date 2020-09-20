/* eslint-disable */

import {Box, DOMElement, Text, measureElement} from 'ink';
import React, {useLayoutEffect, useRef, useState} from 'react';

import {KeyMatcher, useListInput} from '../hooks/use-list-input';
import {useTerminalSize} from '../hooks/use-terminal-size';

const minus: KeyMatcher = (char, key) => {
  return key.upArrow || char === 'k';
};

const plus: KeyMatcher = (char, key) => {
  return key.downArrow || char === 'j';
};

export function SelectList<T extends {label: string; disabled?: boolean}>({
  active,
  values,
  value: selectedValue,
  onChange,
}: {
  active: boolean;
  values: T[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const ref = useRef<DOMElement>() as React.RefObject<DOMElement>;

  selectedValue = selectedValue ?? values[0];

  useListInput<T>(selectedValue, values, {
    active,
    minus,
    plus,
    onChange,
  });

  const [numberOfItems, setNumberOfItems] = useState<number>(0);

  useLayoutEffect(() => {
    if (ref.current == null) {
      return;
    }

    setNumberOfItems(measureElement(ref.current).height);
  }, [ref.current, useTerminalSize()]);

  const previousFromIndex = useRef<number>(0);
  const visibleItems = (() => {
    if (values.length <= numberOfItems) {
      return values;
    }

    const activeIndex = values.indexOf(selectedValue!);
    let fromIndex = previousFromIndex.current;
    if (activeIndex !== -1) {
      const padding = Math.floor((numberOfItems - 1) / 2);
      fromIndex = activeIndex - padding;
    }

    if (fromIndex < 0) {
      fromIndex = 0;
    } else if (fromIndex + numberOfItems > values.length) {
      fromIndex = values.length - numberOfItems;
    }

    previousFromIndex.current = fromIndex;

    return values.slice(fromIndex, fromIndex + numberOfItems);
  })();

  return (
    <Box ref={ref} flexDirection="column">
      {visibleItems.map(value => {
        if (value === selectedValue) {
          return (
            <Box key={value.label}>
              <Text bold wrap="truncate">
                <Text color={active ? 'blueBright' : 'grey'}>{'> '}</Text>
                {value.label}
              </Text>
            </Box>
          );
        } else if (value.disabled) {
          return (
            <Box key={value.label} paddingLeft={2}>
              <Text wrap="truncate" color="grey">
                {value.label}
              </Text>
            </Box>
          );
        } else {
          return (
            <Box key={value.label} paddingLeft={2}>
              <Text wrap="truncate">{value.label}</Text>
            </Box>
          );
        }
      })}
    </Box>
  );
}
