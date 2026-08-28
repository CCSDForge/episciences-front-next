const nextConfig = require('eslint-config-next');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['.claude/**', 'coverage/**', '.next/**', 'out/**', 'build/**', 'dist/**'],
  },
  ...nextConfig,
  prettierConfig,
  {
    rules: {
      '@next/next/no-img-element': 'off',
      'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      // ESLint 9 / react-hooks v7 readiness rules
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
];
