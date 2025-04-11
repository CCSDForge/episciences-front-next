declare module '@citation-js/core'

interface MathJaxHub {
  Queue: (commands: [string, MathJaxHub]) => void;
}

interface MathJax {
  Hub: MathJaxHub;
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