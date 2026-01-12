'use client';

import { useId } from 'react';
import './Checkbox.scss';

interface ICheckboxProps {
  checked: boolean;
  onChangeCallback: () => void;
  /**
   * Optional label text to display next to the checkbox.
   * If provided, creates an accessible label association.
   */
  label?: string;
  /**
   * Optional ID for the checkbox input.
   * If not provided, a unique ID will be generated automatically.
   */
  id?: string;
  /**
   * Optional aria-label for cases where no visual label is needed.
   * Use when the checkbox purpose is clear from context.
   */
  ariaLabel?: string;
  /**
   * Optional aria-describedby for additional description.
   */
  ariaDescribedBy?: string;
}

export default function Checkbox({
  checked,
  onChangeCallback,
  label,
  id: providedId,
  ariaLabel,
  ariaDescribedBy,
}: ICheckboxProps): React.JSX.Element {
  // Generate unique ID if not provided
  const generatedId = useId();
  const inputId = providedId || generatedId;

  if (label) {
    // With label: wrap in label element for accessibility
    return (
      <div className="checkbox-wrapper">
        <input
          id={inputId}
          type="checkbox"
          className="checkbox"
          checked={checked}
          onChange={onChangeCallback}
          aria-describedby={ariaDescribedBy}
        />
        <label htmlFor={inputId} className="checkbox-label">
          {label}
        </label>
      </div>
    );
  }

  // Without label: standalone checkbox (must have aria-label)
  return (
    <input
      id={inputId}
      type="checkbox"
      className="checkbox"
      checked={checked}
      onChange={onChangeCallback}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    />
  );
}
