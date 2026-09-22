import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TFunction } from 'i18next';
import CommitteeMembers from '../CommitteeMembers';
import { ICommitteeMember } from '@/types/committee';
import { checkA11y } from '@/test-utils/axe-helper';

const t = ((key: string, options?: { name?: string }) =>
  options?.name ? `${key}:${options.name}` : key) as unknown as TFunction<'translation', undefined>;

const members: ICommitteeMember[] = [
  { uuid: 'a', screenName: 'Corina Cirstea', orcid: '0000-0003-3165-5678' },
  { uuid: 'b', screenName: 'Henning Fernau', orcid: '' },
  { uuid: 'c', screenName: 'Val Tannen', orcid: null },
  { uuid: 'd', screenName: 'Pascal Weil', orcid: ' https://orcid.org/0000-0001-7996-5291 ' },
];

describe('CommitteeMembers', () => {
  it('renders names as a comma-separated list', () => {
    const { container } = render(<CommitteeMembers members={members} t={t} />);
    expect(container).toHaveTextContent('Corina Cirstea, Henning Fernau, Val Tannen, Pascal Weil');
  });

  it('links members with an ORCID, with an accessible name and a new-window warning', () => {
    render(<CommitteeMembers members={members} t={t} />);

    const link = screen.getByRole('link', {
      name: 'common.orcidOf:Corina Cirstea components.header.newWindow',
    });
    expect(link).toHaveAttribute('href', 'https://orcid.org/0000-0003-3165-5678');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('title', '0000-0003-3165-5678');
  });

  it('keeps full ORCID URLs as is (trimmed)', () => {
    render(<CommitteeMembers members={members} t={t} />);
    expect(screen.getByRole('link', { name: /Pascal Weil/ })).toHaveAttribute(
      'href',
      'https://orcid.org/0000-0001-7996-5291'
    );
  });

  it('renders no link for an ORCID that is not an orcid.org iD', () => {
    render(
      <CommitteeMembers
        members={[{ uuid: 'x', screenName: 'Mallory', orcid: 'https://attacker.example' }]}
        t={t}
      />
    );
    expect(screen.getByText('Mallory')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders no link for empty or null ORCIDs', () => {
    render(<CommitteeMembers members={members} t={t} />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('Henning Fernau').closest('a')).toBeNull();
    expect(screen.getByText('Val Tannen').closest('a')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <p>
        <CommitteeMembers members={members} t={t} />
      </p>
    );
    const results = await checkA11y(container);
    expect(results).toHaveNoViolations();
  });
});
