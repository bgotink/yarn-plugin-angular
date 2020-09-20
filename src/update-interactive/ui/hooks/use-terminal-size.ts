import assert from 'assert';
import {useStdout} from 'ink';
import {useEffect, useState} from 'react';

export function useTerminalSize(): {width: number; height: number} {
  const {stdout} = useStdout();

  assert(stdout != null, 'no stdout found');

  const [dimensions, setDimensions] = useState<{width: number; height: number}>({
    width: stdout.columns,
    height: stdout.rows,
  });

  useEffect(() => {
    const handler = () => setDimensions({width: stdout.columns, height: stdout.rows});
    stdout.on('resize', handler);
    return () => {
      stdout.off('resize', handler);
    };
  }, [stdout]);

  return dimensions;
}
