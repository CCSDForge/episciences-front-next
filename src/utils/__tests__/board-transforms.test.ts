import { describe, it, expect } from 'vitest';
import { getBoardsPerTitle } from '../board-transforms';
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
    expect(editorialBoard?.members).toContainEqual(
      expect.objectContaining({ firstname: 'Frank' })
    );
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
});
