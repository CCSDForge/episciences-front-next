/**
 * Real journal brand colors, extracted from external-assets/.env.local.* (gitignored).
 * Committed here as the reference palette for the OKLCH engine's regression test —
 * see tmp/PLAN_DARK_MODE.md §6 "Le test à plus forte valeur".
 *
 * Regenerate with:
 *   grep -h "^NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR=" external-assets/.env.local.* \
 *     | sed -E 's/^NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR="?([^"]*)"?$/\1/' \
 *     | tr 'A-Z' 'a-z' | sort -u
 */
export const JOURNAL_BRAND_COLORS: readonly string[] = [
  '#000000',
  '#005078',
  '#005885',
  '#0086c7',
  '#014188',
  '#024e73',
  '#118acb',
  '#1f5b93',
  '#242021',
  '#248386',
  '#269f9e',
  '#2e1099',
  '#2e2a1f',
  '#357ab7',
  '#35a7b8',
  '#36579b',
  '#393e60',
  '#3b588c',
  '#49737e',
  '#4aadef',
  '#659892',
  '#6d2190',
  '#711517',
  '#73493a',
  '#94d4c7',
  '#962323',
  '#9f3121',
  '#a42435',
  '#b10035',
  '#b21316',
  '#b9cde0',
  '#c04641',
  '#c5421b',
  '#ce232b',
  '#d25458',
  '#d45041',
  '#dbd3d3',
  '#ef5d2e',
  '#fbe62c',
  '#ffba50',
  '#ffca5f',
];
