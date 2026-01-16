declare module '@citation-js/core';

// MathJax v3 type declarations
interface MathJax {
  typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
  typeset?: (elements?: HTMLElement[]) => void;
  startup?: {
    promise?: Promise<void>;
  };
}

interface Window {
  MathJax?: MathJax;
}

// Déclarations minimales nécessaires pour Next.js
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}
