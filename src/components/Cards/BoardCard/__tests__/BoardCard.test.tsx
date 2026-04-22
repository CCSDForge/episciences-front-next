import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import BoardCard from '../BoardCard';
import { IBoardMember } from '@/types/board';

// Mock Link
vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
    title,
    target,
  }: {
    href: string;
    children: React.ReactNode;
    title?: string;
    target?: string;
  }) => (
    <a href={href} title={title} target={target}>
      {children}
    </a>
  ),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// Mock icons
vi.mock('@/components/icons', () => ({
  UserIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="user-icon" aria-label={ariaLabel} />
  ),
  OrcidIcon: () => <span data-testid="orcid-icon" />,
  TwitterIcon: () => <span data-testid="twitter-icon" />,
  MastodonIcon: () => <span data-testid="mastodon-icon" />,
  BlueskyIcon: () => <span data-testid="bluesky-icon" />,
  ExternalLinkBlackIcon: () => <span data-testid="external-link-icon" />,
  RorIcon: () => <span data-testid="ror-icon" />,
}));

// Mock board service
vi.mock('@/services/board', () => ({
  defaultBoardRole: () => ({ label: 'Member' }),
  getBoardRoles: (_t: any, roles: string[]) => roles.join(', '),
}));

const mockT = vi.fn((key: string) => key);

const baseMember: IBoardMember = {
  id: 1,
  firstname: 'Alice',
  lastname: 'Martin',
  roles: [],
  affiliations: [],
  assignedSections: [],
};

const fullMember: IBoardMember = {
  id: 2,
  firstname: 'Bob',
  lastname: 'Smith',
  roles: ['editor'],
  affiliations: [
    { label: 'University of Paris', rorId: '' },
    { label: 'CNRS', rorId: 'https://ror.org/02feahw73' },
  ],
  assignedSections: [
    { sid: 1, titles: { en: 'Mathematics', fr: 'Mathématiques' } },
  ],
  biography: 'Prof. Bob Smith is an expert in...',
  twitter: 'https://twitter.com/bobsmith',
  mastodon: 'https://mastodon.social/@bob',
  bluesky: 'https://bsky.app/profile/bob',
  website: 'https://bob.example.com',
  orcid: '0000-0001-2345-6789',
  picture: 'https://example.com/bob.jpg',
};

describe('BoardCard', () => {
  describe('collapsed card (fullCard=false)', () => {
    it('renders member name', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    });

    it('renders default role when no roles', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('renders member roles when provided', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={{ ...baseMember, roles: ['editor'] }}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByText('editor')).toBeInTheDocument();
    });

    it('renders placeholder icon when no picture', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('renders picture when available', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={fullMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/bob.jpg');
      expect(img).toHaveAttribute('alt', 'Bob Smith');
    });

    it('applies blur class when blurCard is true', () => {
      const { container } = render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="blurred"
          onToggle={vi.fn()}
        />
      );
      expect(container.querySelector('.boardCard-blur')).toBeInTheDocument();
    });

    it('does not apply blur class when blurCard is false', () => {
      const { container } = render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      expect(container.querySelector('.boardCard-blur')).not.toBeInTheDocument();
    });

    it('renders affiliations', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={fullMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByText('University of Paris')).toBeInTheDocument();
      expect(screen.getByText('CNRS')).toBeInTheDocument();
    });

    it('renders ROR icon for affiliations with rorId', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={fullMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      // fullMember has CNRS with a rorId
      expect(screen.getByTestId('ror-icon')).toBeInTheDocument();
    });

    it('renders assigned sections', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={fullMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });

    it('renders ORCID link when orcid is present', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={fullMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByTestId('orcid-icon')).toBeInTheDocument();
    });

    it('calls setFullMemberIndexCallback on click', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="default"
          
          onToggle={callback}
        />
      );
      await user.click(screen.getByRole('button'));
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('card is keyboard accessible via Enter', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="default"
          
          onToggle={callback}
        />
      );
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('full card (fullCard=true)', () => {
    it('renders biography when available', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={fullMember}
          state="expanded"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByText('Prof. Bob Smith is an expert in...')).toBeInTheDocument();
    });

    it('renders social network icons in full card', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={fullMember}
          state="expanded"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByTestId('twitter-icon')).toBeInTheDocument();
      expect(screen.getByTestId('mastodon-icon')).toBeInTheDocument();
      expect(screen.getByTestId('bluesky-icon')).toBeInTheDocument();
    });

    it('renders website link in full card', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={fullMember}
          state="expanded"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.getByText('Website')).toBeInTheDocument();
    });

    it('does not render social icons when member has no social networks', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="expanded"
          
          onToggle={vi.fn()}
        />
      );
      expect(screen.queryByTestId('twitter-icon')).not.toBeInTheDocument();
    });

    it('applies boardCard-full class', () => {
      const { container } = render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="expanded"
          
          onToggle={vi.fn()}
        />
      );
      expect(container.querySelector('.boardCard-full')).toBeInTheDocument();
    });
  });

  describe('rolesLabels prop', () => {
    it('uses rolesLabels mapping when provided', () => {
      const rolesLabels = { editor: 'Editor-in-Chief', member: 'Board Member' };
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={{ ...baseMember, roles: ['editor'] }}
          state="default"
          
          onToggle={vi.fn()}
          rolesLabels={rolesLabels}
        />
      );
      expect(screen.getByText('Editor-in-Chief')).toBeInTheDocument();
    });

    it('uses rolesLabels["member"] as default role when no roles', () => {
      const rolesLabels = { member: 'Board Member' };
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="default"
          
          onToggle={vi.fn()}
          rolesLabels={rolesLabels}
        />
      );
      expect(screen.getByText('Board Member')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have no violations in collapsed mode', async () => {
      const { container } = render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('card has role="button" and tabIndex=0', () => {
      render(
        <BoardCard
          language="en"
          t={mockT as any}
          member={baseMember}
          state="default"
          
          onToggle={vi.fn()}
        />
      );
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });
});
