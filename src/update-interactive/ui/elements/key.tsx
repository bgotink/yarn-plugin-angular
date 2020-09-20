/* eslint-disable @typescript-eslint/no-unused-vars */

import {Text} from 'ink';
import React from 'react';

export function Key({children}: {children: string}): JSX.Element {
  return (
    <Text>
      `<Text color="cyanBright">{children}</Text>`
    </Text>
  );
}
