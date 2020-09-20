import {useInput, Key} from 'ink';

export interface KeyMatcher {
  (char: string, key: Key): boolean;
}

export function useListInput<T extends {readonly disabled?: boolean}>(
  value: T,
  values: T[],
  {
    active,
    minus,
    plus,
    onChange,
  }: {
    active: boolean;
    minus: KeyMatcher;
    plus: KeyMatcher;
    onChange: (value: T) => void;
  },
): void {
  useInput(
    (char, key) => {
      const index = values.indexOf(value);
      let newIndex = index;

      if (minus(char, key)) {
        do {
          newIndex = (values.length + newIndex - 1) % values.length;
        } while (values[newIndex].disabled && newIndex !== index);
      } else if (plus(char, key)) {
        do {
          newIndex = (newIndex + 1) % values.length;
        } while (values[newIndex].disabled && newIndex !== index);
      }

      if (newIndex !== index) {
        onChange(values[newIndex]);
      }
    },
    {isActive: active},
  );
}
