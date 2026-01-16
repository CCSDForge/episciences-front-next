import { MathJax3Config } from 'better-react-mathjax';

export const mathJaxConfig: MathJax3Config = {
  startup: {
    typeset: false,
  },
  tex: {
    inlineMath: [
      ['$', '$'],
      ['\\(', '\\)'],
    ],
    displayMath: [
      ['$$', '$$'],
      ['\\[', '\\]'],
    ],
  },
};

export const mathJaxSrc = `${process.env.NEXT_PUBLIC_MATHJAX_HOMEPAGE}/3.2.2/es5/tex-mml-chtml.js`;
