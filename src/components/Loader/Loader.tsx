'use client';

import { useState, useEffect } from 'react';
import { TailSpin } from "react-loader-spinner"
import './Loader.scss'

export default function Loader(): JSX.Element {
    const [primaryColor, setPrimaryColor] = useState("#000000");

    useEffect(() => {
        // Only run on client side
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        if (color) {
            setPrimaryColor(color);
        }
    }, []);

    return (
        <div className="loader">
            <TailSpin
                color={primaryColor}
                width={60}
            />
        </div>
    );
} 