import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VolumeDetailsDesktop } from '../VolumeDetailsDesktop';
import { VOLUME_TYPE } from '@/utils/volume';
import { IVolume } from '@/types/volume';

const mockLanguage = { i18nReducer: { language: 'en' } };

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) => selector(mockLanguage),
}));

const baseVolume: IVolume = {
  id: 1,
  num: 1,
  title: { en: 'Volume One', fr: 'Volume Un' },
  types: [],
} as never;

describe('VolumeDetailsDesktop', () => {
  it('renders the plain volume title', () => {
    render(<VolumeDetailsDesktop volume={baseVolume} />);
    expect(screen.getByText('Volume One')).toBeInTheDocument();
  });

  it('renders the committee note for non-proceedings volumes', () => {
    render(
      <VolumeDetailsDesktop
        volume={{
          ...baseVolume,
          committee: [{ screenName: 'Jane' }, { screenName: 'John' }] as never,
        }}
      />
    );

    expect(screen.getByText(/Volume committee/)).toBeInTheDocument();
    expect(screen.getByText(/Jane, John/)).toBeInTheDocument();
  });

  it('omits the committee note label for proceedings volumes', () => {
    render(
      <VolumeDetailsDesktop
        volume={{
          ...baseVolume,
          types: [VOLUME_TYPE.PROCEEDINGS],
          committee: [{ screenName: 'Jane' }] as never,
        }}
      />
    );

    expect(screen.queryByText(/Volume committee/)).not.toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('renders the description as markdown when present', () => {
    render(
      <VolumeDetailsDesktop volume={{ ...baseVolume, description: { en: 'A description' } }} />
    );

    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('renders proceedings info (theme, location, dates, DOI) when present', () => {
    render(
      <VolumeDetailsDesktop
        volume={{
          ...baseVolume,
          types: [VOLUME_TYPE.PROCEEDINGS],
          settingsProceeding: [
            { setting: 'conference_theme', value: 'AI Ethics' },
            { setting: 'conference_location', value: 'Paris' },
            { setting: 'conference_start', value: '2024-01-01' },
            { setting: 'conference_end', value: '2024-01-03' },
            { setting: 'conference_proceedings_doi', value: '10.1234/proceedings' },
          ] as never,
        }}
      />
    );

    expect(screen.getByText('AI Ethics')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    const doiLink = screen.getByText('10.1234/proceedings');
    expect(doiLink.closest('a')).toHaveAttribute('href', '10.1234/proceedings');
  });

  it('appends the conference name to the title for proceedings with a conference_name setting', () => {
    render(
      <VolumeDetailsDesktop
        volume={{
          ...baseVolume,
          types: [VOLUME_TYPE.PROCEEDINGS],
          settingsProceeding: [{ setting: 'conference_name', value: 'ICML' }] as never,
        }}
      />
    );

    expect(screen.getByText('Volume One (ICML)')).toBeInTheDocument();
  });

  it('renders the edito section when a metadata entry titled "edito" exists', () => {
    render(
      <VolumeDetailsDesktop
        volume={{
          ...baseVolume,
          metadatas: [
            {
              title: { en: 'Edito' },
              content: { en: 'Edito content' },
            } as never,
          ],
        }}
      />
    );

    expect(screen.getByText('Edito content')).toBeInTheDocument();
  });

  it('matches "edito" titles with decomposed (NFD) diacritics, case-insensitively', () => {
    // The component only strips combining diacritical marks (U+0300-036F), i.e. NFD-decomposed
    // accents - a precomposed accented codepoint would NOT match, only base "E" followed by a
    // separate combining acute accent (U+0301).
    const decomposedTitle = 'E' + String.fromCharCode(0x0301) + 'DITO';
    render(
      <VolumeDetailsDesktop
        volume={{
          ...baseVolume,
          metadatas: [
            {
              title: { en: decomposedTitle },
              content: { en: 'Accented edito content' },
            } as never,
          ],
        }}
      />
    );

    expect(screen.getByText('Accented edito content')).toBeInTheDocument();
  });

  it('does not render the edito section when no metadata matches', () => {
    render(
      <VolumeDetailsDesktop
        volume={{
          ...baseVolume,
          metadatas: [{ title: { en: 'Other' }, content: { en: 'Other content' } } as never],
        }}
      />
    );

    expect(screen.queryByText('Other content')).not.toBeInTheDocument();
  });
});
