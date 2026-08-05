'use client';

import { TailSpin } from 'react-loader-spinner';
import './Loader.scss';

export default function Loader(): React.JSX.Element {
  // TailSpin forwards `color` to the SVG `stroke` attribute, so the CSS variable can be
  // handed over as-is — no need to read the computed style from the DOM.
  return (
    <div className="loader">
      <TailSpin color="var(--primary)" width={60} />
    </div>
  );
}
