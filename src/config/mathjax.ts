import { MathJax3Config } from 'better-react-mathjax';
import { MATHJAX_URL } from '@/config/external-urls';

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

export const mathJaxSrc = `${MATHJAX_URL}/3.2.2/es5/tex-mml-chtml.js`;
