import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchBoardPages,
  fetchBoardMembers,
  getBoardRoles,
  getRolePriority,
  defaultBoardRole,
  BOARD_TYPE,
  BOARD_ROLE,
  ROLE_PRIORITIES,
  boardTypes,
} from '../board';

// Mock dependencies
vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((rvcode: string) => `https://api.${rvcode}.episciences.org`),
}));

vi.mock('@/utils/board-transforms', () => ({
  transformBoardMembers: vi.fn((members) =>
    members.map((m: any) => ({
      id: m.uid,
      firstname: m.firstname,
      lastname: m.lastname,
      roles: m.roles || [],
      affiliations: [],
      assignedSections: [],
    }))
  ),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('board service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BOARD_TYPE enum', () => {
    it('should have all expected board types', () => {
      expect(BOARD_TYPE.INTRODUCTION_BOARD).toBe('introduction-board');
      expect(BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD).toBe('scientific-advisory-board');
      expect(BOARD_TYPE.EDITORIAL_BOARD).toBe('editorial-board');
      expect(BOARD_TYPE.TECHNICAL_BOARD).toBe('technical-board');
      expect(BOARD_TYPE.REVIEWERS_BOARD).toBe('reviewers-board');
      expect(BOARD_TYPE.FORMER_MEMBERS).toBe('former-members');
      expect(BOARD_TYPE.OPERATING_CHARTER_BOARD).toBe('operating-charter-board');
    });
  });

  describe('BOARD_ROLE enum', () => {
    it('should have all expected roles', () => {
      expect(BOARD_ROLE.CHIEF_EDITOR).toBe('chief-editor');
      expect(BOARD_ROLE.MANAGING_EDITOR).toBe('managing-editor');
      expect(BOARD_ROLE.EDITOR).toBe('editor');
      expect(BOARD_ROLE.HANDLING_EDITOR).toBe('handling-editor');
      expect(BOARD_ROLE.GUEST_EDITOR).toBe('guest-editor');
      expect(BOARD_ROLE.SECRETARY).toBe('secretary');
      expect(BOARD_ROLE.ADVISORY_BOARD).toBe('advisory-board');
      expect(BOARD_ROLE.MEMBER).toBe('member');
      expect(BOARD_ROLE.FORMER_MEMBER).toBe('former-member');
    });
  });

  describe('boardTypes', () => {
    it('should contain all board types in correct order', () => {
      expect(boardTypes).toHaveLength(7);
      expect(boardTypes[0]).toBe(BOARD_TYPE.INTRODUCTION_BOARD);
      expect(boardTypes[1]).toBe(BOARD_TYPE.EDITORIAL_BOARD);
      expect(boardTypes[2]).toBe(BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD);
    });
  });

  describe('ROLE_PRIORITIES', () => {
    it('should have chief editor as highest priority', () => {
      expect(ROLE_PRIORITIES[BOARD_ROLE.CHIEF_EDITOR]).toBe(1);
    });

    it('should have former member as lowest priority', () => {
      expect(ROLE_PRIORITIES[BOARD_ROLE.FORMER_MEMBER]).toBe(9);
    });
  });

  describe('getRolePriority', () => {
    it('should return correct priority for known roles', () => {
      expect(getRolePriority(BOARD_ROLE.CHIEF_EDITOR)).toBe(1);
      expect(getRolePriority(BOARD_ROLE.EDITOR)).toBe(3);
      expect(getRolePriority(BOARD_ROLE.MEMBER)).toBe(8);
    });

    it('should return 999 for unknown roles', () => {
      expect(getRolePriority('unknown-role')).toBe(999);
    });
  });

  describe('defaultBoardRole', () => {
    it('should return member role with translated label', () => {
      const mockT = vi.fn((key: string) => `Translated: ${key}`);

      const result = defaultBoardRole(mockT);

      expect(result.key).toBe(BOARD_ROLE.MEMBER);
      expect(result.label).toBe('Translated: pages.boards.roles.member');
      expect(mockT).toHaveBeenCalledWith('pages.boards.roles.member');
    });
  });

  describe('getBoardRoles', () => {
    const mockT = (key: string) => {
      const translations: Record<string, string> = {
        'pages.boards.roles.chiefEditor': 'Chief Editor',
        'pages.boards.roles.editor': 'Editor',
        'pages.boards.roles.member': 'Member',
        'pages.boards.types.editorialBoard': 'Editorial Board',
      };
      return translations[key] || key;
    };

    it('should return translated roles joined by comma', () => {
      const roles = [BOARD_ROLE.CHIEF_EDITOR, BOARD_ROLE.EDITOR];

      const result = getBoardRoles(mockT, roles);

      expect(result).toBe('Chief Editor, Editor');
    });

    it('should return empty string for no matching roles', () => {
      const result = getBoardRoles(mockT, ['unknown-role']);

      expect(result).toBe('');
    });

    it('should handle board types as roles', () => {
      const roles = [BOARD_TYPE.EDITORIAL_BOARD];

      const result = getBoardRoles(mockT, roles);

      expect(result).toBe('Editorial Board');
    });
  });

  describe('fetchBoardPages', () => {
    it('should fetch and filter board pages correctly', async () => {
      const mockPages = {
        'hydra:member': [
          { id: 1, page_code: 'editorial-board', title: { en: 'Editorial Board' }, content: { en: '' }, rvcode: 'test' },
          { id: 2, page_code: 'about', title: { en: 'About' }, content: { en: '' }, rvcode: 'test' },
          { id: 3, page_code: 'technical-board', title: { en: 'Technical Board' }, content: { en: '' }, rvcode: 'test' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPages),
      });

      const result = await fetchBoardPages('testjournal');

      expect(result).toHaveLength(2);
      expect(result[0].page_code).toBe('editorial-board');
      expect(result[1].page_code).toBe('technical-board');
    });

    it('should sort pages by board type order', async () => {
      const mockPages = {
        'hydra:member': [
          { id: 1, page_code: 'technical-board', title: {}, content: {}, rvcode: 'test' },
          { id: 2, page_code: 'introduction-board', title: {}, content: {}, rvcode: 'test' },
          { id: 3, page_code: 'editorial-board', title: {}, content: {}, rvcode: 'test' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPages),
      });

      const result = await fetchBoardPages('testjournal');

      expect(result[0].page_code).toBe('introduction-board');
      expect(result[1].page_code).toBe('editorial-board');
      expect(result[2].page_code).toBe('technical-board');
    });

    it('should return empty array on fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchBoardPages('testjournal');

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should handle array response format', async () => {
      const mockPages = [
        { id: 1, page_code: 'editorial-board', title: {}, content: {}, rvcode: 'test' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPages),
      });

      const result = await fetchBoardPages('testjournal');

      expect(result).toHaveLength(1);
    });
  });

  describe('fetchBoardMembers', () => {
    it('should fetch and transform board members', async () => {
      const mockMembers = [
        { uid: 1, firstname: 'John', lastname: 'Doe', roles: ['editor'] },
        { uid: 2, firstname: 'Jane', lastname: 'Smith', roles: ['chief-editor'] },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMembers),
      });

      const result = await fetchBoardMembers('testjournal');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].firstname).toBe('John');
    });

    it('should return empty array on fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchBoardMembers('nonexistent');

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should handle hydra collection format', async () => {
      const mockResponse = {
        'hydra:member': [
          { uid: 1, firstname: 'Test', lastname: 'User', roles: [] },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchBoardMembers('testjournal');

      expect(result).toHaveLength(1);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchBoardMembers('testjournal');

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should use correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await fetchBoardMembers('myjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/journals/boards/myjournal')
      );
    });
  });
});
