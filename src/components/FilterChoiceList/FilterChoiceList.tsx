'use client';

import Checkbox from '@/components/Checkbox/Checkbox';
import { handleKeyboardClick } from '@/utils/keyboard';

export interface IFilterChoice<V extends string | number> {
  value: V;
  label: string;
  isChecked: boolean;
}

interface IFilterChoiceListProps<V extends string | number> {
  /** BEM prefix of the choice elements (`${base}-choice`, `${base}-choice-label`, …). */
  readonly base: string;
  readonly choices: IFilterChoice<V>[];
  readonly onToggle: (value: V) => void;
  readonly id?: string;
  /** Class of the list container; defaults to `base`. */
  readonly className?: string;
}

/**
 * List of checkbox choices shared by the filter facets. Both the checkbox and its
 * visible label toggle the choice.
 */
export default function FilterChoiceList<V extends string | number>({
  base,
  choices,
  onToggle,
  id,
  className,
}: IFilterChoiceListProps<V>): React.JSX.Element {
  return (
    <div id={id} className={className ?? base}>
      {choices.map(choice => (
        <div key={choice.value} className={`${base}-choice`}>
          <div className={`${base}-choice-checkbox`}>
            <Checkbox
              checked={choice.isChecked}
              onChangeCallback={(): void => onToggle(choice.value)}
              ariaLabel={choice.label}
            />
          </div>
          <span
            className={
              choice.isChecked
                ? `${base}-choice-label ${base}-choice-label-checked`
                : `${base}-choice-label`
            }
            role="button"
            tabIndex={0}
            onClick={(): void => onToggle(choice.value)}
            onKeyDown={e => handleKeyboardClick(e, (): void => onToggle(choice.value))}
          >
            {choice.label}
          </span>
        </div>
      ))}
    </div>
  );
}
