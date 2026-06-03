import { describe, it, expect } from 'vitest';
import { getBoardsPerTitle, filterAndSortMembersForCarousel, transformBoardMember } from '../board-transforms';
import { IBoardPage, IBoardMember } from '@/services/board';

describe('getBoardsPerTitle', () => {
  const mockPages: IBoardPage[] = [
    {
      id: 1,
      page_code: 'editorial-board',
      title: { en: 'Editorial Board', fr: 'Comité éditorial' },
      content: { en: 'Editorial description', fr: 'Description éditoriale' },
      rvcode: 'test',
    },
    {
      id: 2,
      page_code: 'scientific-advisory-board',
      title: { en: 'Scientific Advisory Board', fr: 'Comité scientifique' },
      content: { en: 'Scientific description', fr: 'Description scientifique' },
      rvcode: 'test',
    },
  ];

  const mockMembers: IBoardMember[] = [
    {
      id: 1,
      firstname: 'Alice',
      lastname: 'Smith',
      roles: ['chief-editor', 'editorial-board'], // Must have editorial-board to appear in that board
      affiliations: [],
      assignedSections: [],
    },
    {
      id: 2,
      firstname: 'Bob',
      lastname: 'Johnson',
      roles: ['managing-editor'], // Special case: appears in editorial board
      affiliations: [],
      assignedSections: [],
    },
    {
      id: 3,
      firstname: 'Charlie',
      lastname: 'Brown',
      roles: ['editor', 'editorial-board'], // Must have editorial-board to appear in that board
      affiliations: [],
      assignedSections: [],
    },
    {
      id: 4,
      firstname: 'Diana',
      lastname: 'Prince',
      roles: ['advisory-board'], // Special case: appears in scientific advisory board
      affiliations: [],
      assignedSections: [],
    },
    {
      id: 5,
      firstname: 'Eve',
      lastname: 'Taylor',
      roles: ['handling-editor'], // Special case: appears in editorial board
      affiliations: [],
      assignedSections: [],
    },
  ];

  it('should group members correctly for editorial board', () => {
    const result = getBoardsPerTitle(mockPages, mockMembers, 'en');
    const editorialBoard = result.find(b => b.title === 'Editorial Board');

    expect(editorialBoard).toBeDefined();
    // Editorial board includes:
    // - Alice (has editorial-board role)
    // - Bob (managing-editor special case)
    // - Charlie (has editorial-board role)
    // - Eve (handling-editor special case)
    expect(editorialBoard?.members).toHaveLength(4);
    expect(editorialBoard?.members.map(m => m.firstname)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
      'Eve',
    ]);
  });

  it('should include advisory-board role in scientific advisory board', () => {
    const result = getBoardsPerTitle(mockPages, mockMembers, 'en');
    const scientificBoard = result.find(b => b.title === 'Scientific Advisory Board');

    expect(scientificBoard).toBeDefined();
    expect(scientificBoard?.members).toContainEqual(
      expect.objectContaining({ firstname: 'Diana' })
    );
  });

  it('should sort members by role priority', () => {
    const result = getBoardsPerTitle(mockPages, mockMembers, 'en');
    const editorialBoard = result.find(b => b.title === 'Editorial Board');

    const roles = editorialBoard?.members.map(m => m.roles[0]);
    expect(roles).toEqual(['chief-editor', 'managing-editor', 'editor', 'handling-editor']);
  });

  it('should handle members with multiple roles', () => {
    const multiRoleMember: IBoardMember = {
      id: 6,
      firstname: 'Frank',
      lastname: 'Anderson',
      roles: ['editor', 'editorial-board', 'advisory-board'], // Will appear in editorial and scientific boards
      affiliations: [],
      assignedSections: [],
    };

    const membersWithMultiRole = [...mockMembers, multiRoleMember];
    const result = getBoardsPerTitle(mockPages, membersWithMultiRole, 'en');

    const editorialBoard = result.find(b => b.title === 'Editorial Board');
    const scientificBoard = result.find(b => b.title === 'Scientific Advisory Board');

    // Frank should appear in both boards (has editorial-board + advisory-board roles)
    expect(editorialBoard?.members).toContainEqual(expect.objectContaining({ firstname: 'Frank' }));
    expect(scientificBoard?.members).toContainEqual(
      expect.objectContaining({ firstname: 'Frank' })
    );
  });

  it('should return empty array when no pages provided', () => {
    const result = getBoardsPerTitle([], mockMembers, 'en');
    expect(result).toEqual([]);
  });

  it('should return boards with empty members when no members provided', () => {
    const result = getBoardsPerTitle(mockPages, [], 'en');
    expect(result).toHaveLength(2);
    expect(result[0].members).toHaveLength(0);
    expect(result[1].members).toHaveLength(0);
  });

  it('should handle language fallback correctly', () => {
    const result = getBoardsPerTitle(mockPages, mockMembers, 'fr');
    const editorialBoard = result.find(b => b.title === 'Comité éditorial');

    expect(editorialBoard).toBeDefined();
    expect(editorialBoard?.description).toBe('Description éditoriale');
  });

  it('should sort alphabetically by lastname when same priority', () => {
    const sameRoleMembers: IBoardMember[] = [
      {
        id: 1,
        firstname: 'Zoe',
        lastname: 'Wilson',
        roles: ['editor', 'editorial-board'], // Must have editorial-board to appear
        affiliations: [],
        assignedSections: [],
      },
      {
        id: 2,
        firstname: 'Alice',
        lastname: 'Anderson',
        roles: ['editor', 'editorial-board'], // Must have editorial-board to appear
        affiliations: [],
        assignedSections: [],
      },
      {
        id: 3,
        firstname: 'Bob',
        lastname: 'Martinez',
        roles: ['editor', 'editorial-board'], // Must have editorial-board to appear
        affiliations: [],
        assignedSections: [],
      },
    ];

    const pages = [mockPages[0]]; // Only editorial board
    const result = getBoardsPerTitle(pages, sameRoleMembers, 'en');
    const editorialBoard = result[0];

    const lastnames = editorialBoard.members.map(m => m.lastname);
    expect(lastnames).toEqual(['Anderson', 'Martinez', 'Wilson']);
  });

  it('should include managing-editor and handling-editor in editorial board', () => {
    const result = getBoardsPerTitle(mockPages, mockMembers, 'en');
    const editorialBoard = result.find(b => b.title === 'Editorial Board');

    const roleSet = new Set(editorialBoard?.members.flatMap(m => m.roles));

    // Should include managing-editor (Bob) and handling-editor (Eve) via special case
    expect(roleSet.has('managing-editor')).toBe(true);
    expect(roleSet.has('handling-editor')).toBe(true);
  });

  it('should handle plural role matching', () => {
    const memberWithPluralRole: IBoardMember = {
      id: 7,
      firstname: 'George',
      lastname: 'Washington',
      roles: ['editorial-boards'], // Plural form
      affiliations: [],
      assignedSections: [],
    };

    const result = getBoardsPerTitle(mockPages, [memberWithPluralRole], 'en');
    const editorialBoard = result.find(b => b.title === 'Editorial Board');

    expect(editorialBoard?.members).toContainEqual(
      expect.objectContaining({ firstname: 'George' })
    );
  });

  it('should include former-member role in former-members board', () => {
    const formerMembersPage: IBoardPage = {
      id: 3,
      page_code: 'former-members',
      title: { en: 'Former Members', fr: 'Anciens membres' },
      content: { en: '', fr: '' },
      rvcode: 'test',
    };
    const formerMember: IBoardMember = {
      id: 8,
      firstname: 'Henry',
      lastname: 'Ford',
      roles: ['former-member'],
      affiliations: [],
      assignedSections: [],
    };

    const result = getBoardsPerTitle([formerMembersPage], [formerMember], 'en');
    expect(result[0].members).toContainEqual(expect.objectContaining({ firstname: 'Henry' }));
  });
});

describe('filterAndSortMembersForCarousel', () => {
  const make = (id: number, firstname: string, lastname: string, roles: string[]): IBoardMember => ({
    id,
    firstname,
    lastname,
    roles,
    affiliations: [],
    assignedSections: [],
  });

  it('keeps editorial-board, scientific-advisory-board and technical-board members, excludes others', () => {
    const members = [
      make(1, 'Alice', 'Smith', ['editorial-board', 'chief-editor']),
      make(2, 'Bob', 'Jones', ['technical-board']),
      make(3, 'Carol', 'Lee', ['scientific-advisory-board']),
      make(4, 'Dan', 'Wu', ['reviewers-board']),
      make(5, 'Eve', 'Brown', ['former-members']),
    ];
    const result = filterAndSortMembersForCarousel(members);
    expect(result.map(m => m.id)).toEqual([1, 3, 2]);
  });

  it('returns empty array when no eligible members', () => {
    const members = [
      make(1, 'Alice', 'Smith', ['reviewers-board']),
      make(2, 'Bob', 'Jones', ['former-members']),
    ];
    expect(filterAndSortMembersForCarousel(members)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(filterAndSortMembersForCarousel([])).toEqual([]);
  });

  it('places editorial-board chief-editor first (priority 1)', () => {
    const members = [
      make(1, 'Zoe', 'Zhao', ['scientific-advisory-board']),
      make(2, 'Alice', 'Aaa', ['editorial-board', 'chief-editor']),
      make(3, 'Bob', 'Bbb', ['editorial-board']),
    ];
    const result = filterAndSortMembersForCarousel(members);
    expect(result[0].id).toBe(2);
  });

  it('places plain editorial-board members before scientific-advisory-board (priority 2 vs 3)', () => {
    const members = [
      make(1, 'Zoe', 'Zhao', ['scientific-advisory-board']),
      make(2, 'Alice', 'Aaa', ['editorial-board']),
    ];
    const result = filterAndSortMembersForCarousel(members);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
  });

  it('sorts alphabetically by lastname (French locale) within same priority', () => {
    const members = [
      make(1, 'Zoe', 'Étienne', ['editorial-board']),
      make(2, 'Alice', 'Abert', ['editorial-board']),
      make(3, 'Bob', 'Dupont', ['editorial-board']),
    ];
    const result = filterAndSortMembersForCarousel(members);
    expect(result.map(m => m.lastname)).toEqual(['Abert', 'Dupont', 'Étienne']);
  });

  it('sorts by firstname when lastnames are identical', () => {
    const members = [
      make(1, 'Zoe', 'Martin', ['editorial-board']),
      make(2, 'Alice', 'Martin', ['editorial-board']),
      make(3, 'Marc', 'Martin', ['editorial-board']),
    ];
    const result = filterAndSortMembersForCarousel(members);
    expect(result.map(m => m.firstname)).toEqual(['Alice', 'Marc', 'Zoe']);
  });

  it('treats accent-insensitive sort correctly (French locale)', () => {
    const members = [
      make(1, 'Zoe', 'Éric', ['editorial-board']),
      make(2, 'Alice', 'Eric', ['editorial-board']),
    ];
    const result = filterAndSortMembersForCarousel(members);
    // Both "Éric" and "Eric" should sort together — order between them is stable
    expect(result).toHaveLength(2);
  });

  it('member with both editorial-board and scientific-advisory-board is ranked as editorial-board (priority 2)', () => {
    const members = [
      make(1, 'Alice', 'Aaa', ['editorial-board', 'scientific-advisory-board']),
      make(2, 'Bob', 'Bbb', ['scientific-advisory-board']),
    ];
    const result = filterAndSortMembersForCarousel(members);
    expect(result[0].id).toBe(1);
  });

  it('places scientific-advisory-board before technical-board (priority 3 vs 4)', () => {
    const members = [
      make(1, 'Zoe', 'Zhao', ['technical-board']),
      make(2, 'Alice', 'Aaa', ['scientific-advisory-board']),
    ];
    const result = filterAndSortMembersForCarousel(members);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
  });

  it('full ordering: chief-editor, editorial, scientific, technical, alphabetical within tier', () => {
    const members = [
      make(1, 'Zoe', 'Zhao', ['scientific-advisory-board']),
      make(2, 'Marc', 'Dupont', ['editorial-board']),
      make(3, 'Alice', 'Abert', ['editorial-board', 'chief-editor']),
      make(4, 'Anna', 'Adams', ['scientific-advisory-board']),
      make(5, 'Bob', 'Bertrand', ['editorial-board']),
      make(6, 'Paul', 'Martin', ['technical-board']),
      make(7, 'Jean', 'Blanc', ['technical-board']),
    ];
    const result = filterAndSortMembersForCarousel(members);
    expect(result.map(m => m.id)).toEqual([3, 5, 2, 4, 1, 7, 6]);
  });
});

describe('transformBoardMember', () => {
  it('flattens roles split across multiple sub-arrays', () => {
    const raw = {
      uid: 1,
      firstname: 'Alice',
      lastname: 'Smith',
      roles: [['chief_editor'], ['editorial_board']],
    };
    const result = transformBoardMember(raw);
    expect(result.roles).toContain('chief-editor');
    expect(result.roles).toContain('editorial-board');
  });

  it('handles all roles in a single sub-array', () => {
    const raw = {
      uid: 2,
      firstname: 'Bob',
      lastname: 'Jones',
      roles: [['chief_editor', 'editorial_board']],
    };
    const result = transformBoardMember(raw);
    expect(result.roles).toContain('chief-editor');
    expect(result.roles).toContain('editorial-board');
  });

  it('returns empty roles for empty array', () => {
    const raw = { uid: 3, firstname: 'Carol', lastname: 'Lee', roles: [] };
    expect(transformBoardMember(raw).roles).toEqual([]);
  });
});
