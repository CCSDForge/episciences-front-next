'use client';

import './Checkbox.scss';

interface ICheckboxProps {
  checked: boolean;
  onChangeCallback: () => void;
}

export default function Checkbox({ checked, onChangeCallback }: ICheckboxProps): JSX.Element {
  return (
    <input
      type="checkbox"
      className="checkbox"
      checked={checked}
      onChange={onChangeCallback}
    />
  )
} 