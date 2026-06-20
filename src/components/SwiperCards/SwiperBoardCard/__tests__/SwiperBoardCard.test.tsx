import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import SwiperBoardCard from '../SwiperBoardCard';
import { IBoardMember } from '@/types/board';

// --- Mocks ---

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

vi.mock('@/components/icons', () => ({
  OrcidIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="orcid-icon" aria-label={ariaLabel} />
  ),
  UserIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <svg data-testid="user-icon" role="img" aria-label={ariaLabel} />
  ),
  RorIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="ror-icon" aria-label={ariaLabel} />
  ),
}));

vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
    title,
    target,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    title?: string;
    target?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} title={title} target={target} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/services/board', () => ({
  getBoardRoles: vi.fn((_t: unknown, roles: string[]) => roles.join(', ')),
  defaultBoardRole: vi.fn(() => ({ label: 'Member' })),
}));

vi.mock('@/config/external-urls', () => ({
  ORCID_URL: 'https://orcid.org',
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => key) as any;

const baseMember: IBoardMember = {
  id: 1,
  firstname: 'Alice',
  lastname: 'Martin',
  roles: [],
  affiliations: [],
  assignedSections: [],
};

// --- Tests ---

describe('SwiperBoardCard', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Basic rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('basic rendering', () => {
    it('renders member name', () => {
      render(<SwiperBoardCard language="en" t={mockT} member={baseMember} />);
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    });

    it('renders default role when no roles are provided', () => {
      render(<SwiperBoardCard language="en" t={mockT} member={baseMember} />);
      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('renders assigned roles when provided', () => {
      const member: IBoardMember = { ...baseMember, roles: ['editor', 'reviewer'] };
      render(<SwiperBoardCard language="en" t={mockT} member={member} />);
      expect(screen.getByText('editor, reviewer')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Picture
  // ─────────────────────────────────────────────────────────────────────────
  describe('picture', () => {
    it('renders user placeholder icon when no picture', () => {
      render(<SwiperBoardCard language="en" t={mockT} member={baseMember} />);
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('renders img element when picture is provided', () => {
      const member: IBoardMember = {
        ...baseMember,
        picture: 'https://example.com/photo.jpg',
      };
      render(<SwiperBoardCard language="en" t={mockT} member={member} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
      expect(img).toHaveAttribute('alt', 'Alice Martin');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ORCID
  // ─────────────────────────────────────────────────────────────────────────
  describe('ORCID', () => {
    it('renders ORCID link when orcid is provided', () => {
      const member: IBoardMember = { ...baseMember, orcid: '0000-0001-2345-6789' };
      render(<SwiperBoardCard language="en" t={mockT} member={member} />);
      const orcidLink = screen.getByTitle('0000-0001-2345-6789');
      expect(orcidLink).toHaveAttribute('href', 'https://orcid.org/0000-0001-2345-6789');
      expect(orcidLink).toHaveAttribute('target', '_blank');
    });

    it('does not render ORCID link when orcid is absent', () => {
      render(<SwiperBoardCard language="en" t={mockT} member={baseMember} />);
      expect(screen.queryByTestId('orcid-icon')).not.toBeInTheDocument();
    });

    it('does not render ORCID link when orcid is empty string', () => {
      const member: IBoardMember = { ...baseMember, orcid: '' };
      render(<SwiperBoardCard language="en" t={mockT} member={member} />);
      expect(screen.queryByTestId('orcid-icon')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Affiliations
  // ─────────────────────────────────────────────────────────────────────────
  describe('affiliations', () => {
    it('renders affiliations when provided', () => {
      const member: IBoardMember = {
        ...baseMember,
        affiliations: [{ label: 'MIT' }, { label: 'CNRS' }],
      };
      render(<SwiperBoardCard language="en" t={mockT} member={member} />);
      expect(screen.getByText('MIT')).toBeInTheDocument();
      expect(screen.getByText('CNRS')).toBeInTheDocument();
    });

    it('renders affiliation with ROR link when rorId is present', () => {
      const member: IBoardMember = {
        ...baseMember,
        affiliations: [{ label: 'MIT', rorId: 'https://ror.org/042nb2s44' }],
      };
      render(<SwiperBoardCard language="en" t={mockT} member={member} />);
      expect(screen.getByTestId('ror-icon')).toBeInTheDocument();
      const rorLink = screen.getByTitle('ROR: MIT');
      expect(rorLink).toHaveAttribute('href', 'https://ror.org/042nb2s44');
    });

    it('does not render affiliations section when empty', () => {
      const { container } = render(
        <SwiperBoardCard language="en" t={mockT} member={baseMember} />
      );
      expect(container.querySelector('.swiperBoardCard-affiliations')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Assigned sections
  // ─────────────────────────────────────────────────────────────────────────
  describe('assigned sections', () => {
    it('renders assigned section titles for current language', () => {
      const member: IBoardMember = {
        ...baseMember,
        assignedSections: [
          { sid: 1, titles: { en: 'Mathematics', fr: 'Mathématiques' } },
        ],
      };
      render(<SwiperBoardCard language="en" t={mockT} member={member} />);
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });

    it('filters out sections without title for current language', () => {
      const member: IBoardMember = {
        ...baseMember,
        assignedSections: [
          { sid: 1, titles: { en: '', fr: 'Physique' } },
          { sid: 2, titles: { en: 'Chemistry', fr: 'Chimie' } },
        ],
      };
      render(<SwiperBoardCard language="en" t={mockT} member={member} />);
      expect(screen.queryByText('Physique')).not.toBeInTheDocument();
      expect(screen.getByText('Chemistry')).toBeInTheDocument();
    });

    it('does not render sections block when assignedSections is empty', () => {
      const { container } = render(
        <SwiperBoardCard language="en" t={mockT} member={baseMember} />
      );
      expect(
        container.querySelector('.swiperBoardCard-assignedSections')
      ).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Accessibility
  // ─────────────────────────────────────────────────────────────────────────
  describe('accessibility', () => {
    it('has no axe violations (minimal member)', async () => {
      const { container } = render(
        <SwiperBoardCard language="en" t={mockT} member={baseMember} />
      );
      const results = await checkA11y(container);
      expect(results.violations).toHaveLength(0);
    });

    it('has no axe violations (full member with picture)', async () => {
      const member: IBoardMember = {
        ...baseMember,
        picture: 'https://example.com/photo.jpg',
        orcid: '0000-0001-2345-6789',
        affiliations: [{ label: 'MIT', rorId: 'https://ror.org/042nb2s44' }],
        assignedSections: [{ sid: 1, titles: { en: 'Mathematics', fr: 'Math' } }],
      };
      const { container } = render(
        <SwiperBoardCard language="en" t={mockT} member={member} />
      );
      const results = await checkA11y(container);
      expect(results.violations).toHaveLength(0);
    });
  });
});
