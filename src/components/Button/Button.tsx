'use client';

import React from 'react';
import './Button.scss';

interface IconProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

interface IButtonProps {
  text: string;
  onClickCallback: () => void;
  IconComponent?: React.ComponentType<IconProps>;
  iconSize?: number;
}

export default function Button({
  text,
  onClickCallback,
  IconComponent,
  iconSize = 16,
}: IButtonProps): React.JSX.Element {
  if (IconComponent) {
    return (
      <button className="button button-withIcon" onClick={onClickCallback}>
        {text}
        <IconComponent size={iconSize} className="button-withIcon-icon" />
      </button>
    );
  }

  return (
    <button className="button" onClick={onClickCallback}>
      {text}
    </button>
  );
}
