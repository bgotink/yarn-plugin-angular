/* eslint-disable @typescript-eslint/no-unused-vars */

import {Box, BoxProps} from 'ink';
import React from 'react';

import {useTerminalSize} from '../hooks/use-terminal-size';

export function FullScreenBox({
  children,
  ...props
}: React.PropsWithChildren<Omit<BoxProps, 'width' | 'height'>>): JSX.Element {
  const {width, height} = useTerminalSize();

  // Width - 1, because using the full width would cause the terminal to jump when the user is
  // typing visible characters -> this greatly limits what interactions we could define
  return (
    <Box {...props} width={width - 1} height={height}>
      {children}
    </Box>
  );
}
