'use client'

import './Button.scss'

interface IButtonProps {
  text: string;
  onClickCallback: () => void;
  icon?: string;
}

export default function Button({ text, onClickCallback, icon }: IButtonProps): JSX.Element {
  if (icon) {
    return (
      <button className='button button-withIcon' onClick={onClickCallback}>
        {text}
        <img src={icon} className='button-withIcon-icon' aria-hidden='true' alt=""/>
      </button>
    )
  }

  return (
    <button className='button' onClick={onClickCallback}>{text}</button>
  )
} 