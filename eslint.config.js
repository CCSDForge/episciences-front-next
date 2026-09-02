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
      // The React Compiler readiness rules from eslint-plugin-react-hooks v7 (bundled with
      // eslint-config-next 16.3) are all clean and left at the severity the preset ships,
      // i.e. 'error'. Nothing to override here.
    },
  },
];
