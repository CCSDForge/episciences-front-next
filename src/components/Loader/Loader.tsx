'use client';

import { TailSpin } from "react-loader-spinner"
import './Loader.scss'

export default function Loader(): JSX.Element {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

    return (
        <div className="loader">
            <TailSpin
                color={primaryColor || "#000000"} // Fallback to #000000 if --primary isn't defined
                width={60}
            />
        </div>
    );
} 