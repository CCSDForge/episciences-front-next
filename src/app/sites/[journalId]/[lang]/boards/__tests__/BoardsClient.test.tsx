import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import BoardsClient from '../BoardsClient';
import { IBoardMember } from '@/types/board';
import { IBoardPage } from '@/services/board';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/components/icons', () => ({
  CaretUpBlackIcon: ({ ariaLabel }: any) => <span data-testid="caret-up" aria-label={ariaLabel} />,
  CaretDownBlackIcon: ({ ariaLabel }: any) => (
    <span data-testid="caret-down" aria-label={ariaLabel} />
  ),
}));

vi.mock('@/components/Breadcrumb/Breadcrumb', () => ({
  default: ({ crumbLabel }: any) => <nav data-testid="breadcrumb">{crumbLabel}</nav>,
}));

vi.mock('@/components/PageTitle/PageTitle', () => ({
  default: () => null,
}));

// BoardCard has its own dedicated test suite; stub it here so BoardsClient tests
// focus on grouping/toggle logic instead of BoardCard's internal rendering.
vi.mock('@/components/Cards/BoardCard/BoardCard', () => ({
  default: ({ member, state, onToggle }: any) => (
    <button
      type="button"
      data-testid={`board-card-${member.id}`}
      data-state={state}
      onClick={onToggle}
    >
      {member.firstname} {member.lastname}
    </button>
  ),
}));

const makePage = (page_code: string, title: string, content = 'Description'): IBoardPage => ({
  id: Math.random(),
  page_code,
  title: { en: title, fr: title },
  content: { en: content, fr: content },
  rvcode: 'test',
});

const makeMember = (overrides: Partial<IBoardMember>): IBoardMember => ({
  id: 0,
  firstname: 'First',
  lastname: 'Last',
  roles: [],
  affiliations: [],
  assignedSections: [],
  ...overrides,
});

const rolesLabels = {
  'editorial-board': 'Editorial Board',
  'scientific-advisory-board': 'Scientific Advisory Board',
};

describe('BoardsClient', () => {
  describe('members count', () => {
    it('shows the plural label when there is more than one member', () => {
      const members = [
        makeMember({ id: 1, roles: ['editorial-board'] }),
        makeMember({ id: 2, roles: ['editorial-board'] }),
      ];
      render(
        <BoardsClient
          initialPages={[makePage('editorial-board', 'Editorial Board')]}
          initialMembers={members}
          membersCountLabels={{ member: 'member', members: 'members' }}
        />
      );

      expect(screen.getByText('2', { exact: false })).toBeInTheDocument();
      expect(screen.getByText(/members$/)).toBeInTheDocument();
    });

    it('shows the singular label when there is exactly one member', () => {
      const members = [makeMember({ id: 1, roles: ['editorial-board'] })];
      render(
        <BoardsClient
          initialPages={[makePage('editorial-board', 'Editorial Board')]}
          initialMembers={members}
          membersCountLabels={{ member: 'member', members: 'members' }}
        />
      );

      expect(screen.getByText(/^1 member$/)).toBeInTheDocument();
    });

    it('renders no count when there are no members', () => {
      render(<BoardsClient initialPages={[]} initialMembers={[]} />);

      expect(screen.queryByText(/member/i)).not.toBeInTheDocument();
    });
  });

  describe('missing CMS page fallback (regression)', () => {
    it('still renders a board group and member cards when no page exists for the matching board type', () => {
      // Reproduces the resciencex-preprod case: members exist with a known board
      // role but the journal has no "editorial-board" CMS page configured.
      const members = [
        makeMember({ id: 1, firstname: 'Etienne', lastname: 'Roesch', roles: ['editorial-board'] }),
        makeMember({ id: 2, firstname: 'Nicolas', lastname: 'Rougier', roles: ['editorial-board'] }),
      ];

      const { container } = render(
        <BoardsClient initialPages={[]} initialMembers={members} rolesLabels={rolesLabels} />
      );
      const content = container.querySelector('.boards-content-groups') as HTMLElement;

      expect(within(content).getByText('Editorial Board')).toBeInTheDocument();
      expect(screen.getByTestId('board-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('board-card-2')).toBeInTheDocument();
    });
  });

  describe('group toggle', () => {
    it('toggles a group open/closed on click and updates aria-expanded', async () => {
      const user = userEvent.setup();
      const members = [makeMember({ id: 1, roles: ['editorial-board'] })];
      const { container } = render(
        <BoardsClient
          initialPages={[makePage('editorial-board', 'Editorial Board')]}
          initialMembers={members}
          rolesLabels={rolesLabels}
        />
      );

      const header = container.querySelector('.boards-content-groups-group-title') as HTMLElement;
      expect(header).toHaveAttribute('aria-expanded', 'true');

      await user.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'false');

      await user.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('toggles a group via the keyboard (Enter)', async () => {
      const user = userEvent.setup();
      const members = [makeMember({ id: 1, roles: ['editorial-board'] })];
      const { container } = render(
        <BoardsClient
          initialPages={[makePage('editorial-board', 'Editorial Board')]}
          initialMembers={members}
          rolesLabels={rolesLabels}
        />
      );

      const header = container.querySelector('.boards-content-groups-group-title') as HTMLElement;
      header.focus();
      await user.keyboard('{Enter}');
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('member card expansion (cross-group regression)', () => {
    // Reproduces a bug where the expanded/blurred member state was tracked by a
    // bare per-group array index, so expanding the Nth member in one board group
    // also visually expanded the Nth member of every other group.
    it('only expands the clicked member, not the member at the same position in another group', async () => {
      const user = userEvent.setup();
      const members = [
        // scientific-advisory-board (rendered first per canonical board order)
        makeMember({ id: 3, firstname: 'Carol', lastname: 'Aaron', roles: ['advisory-board'] }),
        makeMember({ id: 4, firstname: 'Dan', lastname: 'Zorro', roles: ['advisory-board'] }),
        // editorial-board (rendered second)
        makeMember({ id: 1, firstname: 'Alice', lastname: 'Anderson', roles: ['editor', 'editorial-board'] }),
        makeMember({ id: 2, firstname: 'Bob', lastname: 'Brown', roles: ['secretary', 'editorial-board'] }),
      ];

      render(
        <BoardsClient
          initialPages={[
            makePage('scientific-advisory-board', 'Scientific Advisory Board'),
            makePage('editorial-board', 'Editorial Board'),
          ]}
          initialMembers={members}
          rolesLabels={rolesLabels}
        />
      );

      // Bob is the 2nd (index 1) member of the editorial-board group.
      const bobCard = screen.getByTestId('board-card-2');
      // Dan is the 2nd (index 1) member of the scientific-advisory-board group.
      const danCard = screen.getByTestId('board-card-4');

      expect(bobCard).toHaveAttribute('data-state', 'default');
      expect(danCard).toHaveAttribute('data-state', 'default');

      await user.click(bobCard);

      expect(bobCard).toHaveAttribute('data-state', 'expanded');
      // Dan shares Bob's local index in a different group — it must stay blurred,
      // not flip to "expanded" alongside Bob.
      expect(danCard).toHaveAttribute('data-state', 'blurred');
      expect(screen.getByTestId('board-card-1')).toHaveAttribute('data-state', 'blurred');
      expect(screen.getByTestId('board-card-3')).toHaveAttribute('data-state', 'blurred');
    });

    it('collapses the member back to default when clicked again', async () => {
      const user = userEvent.setup();
      const members = [makeMember({ id: 1, roles: ['editorial-board'] })];
      render(
        <BoardsClient
          initialPages={[makePage('editorial-board', 'Editorial Board')]}
          initialMembers={members}
          rolesLabels={rolesLabels}
        />
      );

      const card = screen.getByTestId('board-card-1');
      await user.click(card);
      expect(card).toHaveAttribute('data-state', 'expanded');

      await user.click(card);
      expect(card).toHaveAttribute('data-state', 'default');
    });
  });

  describe('sidebar group labels', () => {
    it('falls back to the page title when no rolesLabels entry exists for the board type', () => {
      const members = [makeMember({ id: 1, roles: ['unknown-board-type'] })];
      render(
        <BoardsClient
          initialPages={[makePage('reviewers-board', 'Reviewers')]}
          initialMembers={members}
        />
      );

      expect(within(document.body).getAllByText('Reviewers').length).toBeGreaterThan(0);
    });
  });
});
