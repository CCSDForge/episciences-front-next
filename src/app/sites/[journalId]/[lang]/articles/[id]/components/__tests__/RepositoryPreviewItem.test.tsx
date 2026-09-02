import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RepositoryPreviewItem, { RepositoryPreviewItemLabels } from '../RepositoryPreviewItem';
import { RepositoryPreview } from '@/types/repository-preview';

const labels: RepositoryPreviewItemLabels = {
  preview: 'Preview',
  hidePreview: 'Hide preview',
  viewerTitle: 'Nakala viewer',
  imageBadge: 'Image',
  loading: 'Loading…',
  error: 'Failed to load',
  retry: 'Retry',
  selectFile: 'Select a file',
  openOnRepository: 'Open on {{provider}}',
};

function makePreview(fileCount: number): RepositoryPreview {
  return {
    providerId: 'nakala',
    identifier: '10.34847/nkl.067bpg32',
    landingUrl: 'https://nakala.fr/10.34847/nkl.067bpg32',
    files: Array.from({ length: fileCount }, (_, i) => ({
      id: `sha1-${i}`,
      label: `File ${i}`,
      embedUrl: `https://api.nakala.fr/embed/10.34847/nkl.067bpg32/sha1-${i}?buttons=true`,
      kind: 'image' as const,
    })),
  };
}

describe('RepositoryPreviewItem', () => {
  it('renders the identifier link and preview toggle, viewer hidden by default', () => {
    render(
      <RepositoryPreviewItem
        preview={makePreview(1)}
        providerLabel="Nakala"
        icon={null}
        labels={labels}
      />
    );

    expect(screen.getByRole('link', { name: '10.34847/nkl.067bpg32' })).toHaveAttribute(
      'href',
      'https://nakala.fr/10.34847/nkl.067bpg32'
    );
    expect(screen.getByRole('button', { name: /Preview/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByTitle('Nakala viewer')).not.toBeInTheDocument();
  });

  it('toggles the viewer open and closed, updating the button label and aria-expanded', () => {
    render(
      <RepositoryPreviewItem
        preview={makePreview(1)}
        providerLabel="Nakala"
        icon={null}
        labels={labels}
      />
    );

    const toggle = screen.getByRole('button', { name: /Preview/ });
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: /Hide preview/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: /Hide preview/ }));
    expect(screen.getByRole('button', { name: /Preview/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('does not render a file selector for a single-file deposit', () => {
    render(
      <RepositoryPreviewItem
        preview={makePreview(1)}
        providerLabel="Nakala"
        icon={null}
        labels={labels}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Preview/ }));

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByText('Select a file')).not.toBeInTheDocument();
  });

  it('renders tabs for a deposit with 2-6 files', () => {
    render(
      <RepositoryPreviewItem
        preview={makePreview(3)}
        providerLabel="Nakala"
        icon={null}
        labels={labels}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Preview/ }));

    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('renders a select for a deposit with more than 6 files', () => {
    render(
      <RepositoryPreviewItem
        preview={makePreview(10)}
        providerLabel="Nakala"
        icon={null}
        labels={labels}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Preview/ }));

    expect(screen.getByText('Select a file')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('falls back to a plain outbound link when there are too many files to select', () => {
    render(
      <RepositoryPreviewItem
        preview={makePreview(51)}
        providerLabel="Nakala"
        icon={null}
        labels={labels}
      />
    );

    expect(screen.queryByRole('button', { name: /Preview/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: labels.openOnRepository })).toHaveAttribute(
      'href',
      'https://nakala.fr/10.34847/nkl.067bpg32'
    );
  });

  it('renders the relationship badge and citation children when provided', () => {
    render(
      <RepositoryPreviewItem
        preview={makePreview(1)}
        providerLabel="Nakala"
        icon={null}
        labels={labels}
        relationshipBadge={<span>Cites</span>}
      >
        <span>Some citation</span>
      </RepositoryPreviewItem>
    );

    expect(screen.getByText('Cites')).toBeInTheDocument();
    expect(screen.getByText('Some citation')).toBeInTheDocument();
  });

  it('does not render a toggle button when there are no files', () => {
    render(
      <RepositoryPreviewItem
        preview={{ ...makePreview(0) }}
        providerLabel="Nakala"
        icon={null}
        labels={labels}
      />
    );
    expect(screen.queryByRole('button', { name: /Preview/ })).not.toBeInTheDocument();
  });
});
