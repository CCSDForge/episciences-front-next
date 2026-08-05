const nextConfig = require('eslint-config-next');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['.claude/**', 'coverage/**'],
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
      // React Compiler readiness rules from eslint-plugin-react-hooks v7 (bundled with
      // eslint-config-next 16.3). All call sites have been cleaned up except the ones below.
      //
      // `set-state-in-effect` still has 26 occurrences, all concentrated in four heavily
      // tested list components whose state flow needs a dedicated rewrite:
      //   - articles/ArticlesClient.tsx (7)
      //   - volumes/VolumesClient.tsx (7)
      //   - search/SearchClient.tsx (7)
      //   - articles-accepted/ArticlesAcceptedClient.tsx (5)
      // Promote it to 'error' once those are migrated to render-time derivation.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
