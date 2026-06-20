import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import SearchResultsSidebar from '../SearchResultsSidebar';
import type {
  ISearchResultTypeSelection,
  ISearchResultYearSelection,
  ISearchResultVolumeSelection,
  ISearchResultSectionSelection,
  ISearchResultAuthorSelection,
} from '../SearchResultsSidebar';

// --- Mocks ---

vi.mock('@/components/Checkbox/Checkbox', () => ({
  default: ({
    checked,
    onChangeCallback,
    ariaLabel,
  }: {
    checked: boolean;
    onChangeCallback: () => void;
    ariaLabel?: string;
  }) => (
    <input type="checkbox" checked={checked} onChange={onChangeCallback} aria-label={ariaLabel} />
  ),
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const t: Record<string, string> = {
    'common.filters.documentTypes': 'Document Types',
    'common.filters.years': 'Years',
    'common.filters.volumes': 'Volumes',
    'common.filters.sections': 'Sections',
    'common.filters.authors': 'Authors',
    'filters.type.article': 'Article',
    'filters.type.review': 'Review',
  };
  return t[key] ?? key;
}) as any;

const types: ISearchResultTypeSelection[] = [
  { labelPath: 'filters.type.article', value: 'article', count: 10, isChecked: false },
  { labelPath: 'filters.type.review', value: 'review', count: 5, isChecked: true },
];

const years: ISearchResultYearSelection[] = [
  { year: 2024, count: 8, isChecked: false },
  { year: 2023, count: 12, isChecked: true },
];

const volumes: ISearchResultVolumeSelection[] = [
  { id: 1, label: { en: 'Volume 1', fr: 'Volume 1' }, isChecked: false },
  { id: 2, label: { en: 'Volume 2', fr: 'Volume 2' }, isChecked: false },
];

const sections: ISearchResultSectionSelection[] = [
  { id: 10, label: { en: 'Mathematics', fr: 'Mathématiques' }, isChecked: false },
];

const authors: ISearchResultAuthorSelection[] = [
  { fullname: 'Alice Martin', count: 3, isChecked: false },
  { fullname: 'Bob Dupont', count: 1, isChecked: true },
];

const defaultProps = {
  language: 'en' as const,
  t: mockT,
  types,
  onCheckTypeCallback: vi.fn(),
  years,
  onCheckYearCallback: vi.fn(),
  volumes,
  onCheckVolumeCallback: vi.fn(),
  sections,
  onCheckSectionCallback: vi.fn(),
  authors,
  onCheckAuthorCallback: vi.fn(),
};

function renderSidebar(props = {}) {
  return render(<SearchResultsSidebar {...defaultProps} {...props} />);
}

// --- Tests ---

describe('SearchResultsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Conditional rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('conditional section rendering', () => {
    it('renders types section when types are provided', () => {
      renderSidebar();
      expect(screen.getByText('Document Types')).toBeInTheDocument();
    });

    it('hides types section when types array is empty', () => {
      renderSidebar({ types: [] });
      expect(screen.queryByText('Document Types')).not.toBeInTheDocument();
    });

    it('renders years section when years are provided', () => {
      renderSidebar();
      expect(screen.getByText('Years')).toBeInTheDocument();
    });

    it('hides years section when years array is empty', () => {
      renderSidebar({ years: [] });
      expect(screen.queryByText('Years')).not.toBeInTheDocument();
    });

    it('renders volumes section when volumes are provided', () => {
      renderSidebar();
      expect(screen.getByText('Volumes')).toBeInTheDocument();
    });

    it('hides volumes section when volumes array is empty', () => {
      renderSidebar({ volumes: [] });
      expect(screen.queryByText('Volumes')).not.toBeInTheDocument();
    });

    it('renders sections section when sections are provided', () => {
      renderSidebar();
      expect(screen.getByText('Sections')).toBeInTheDocument();
    });

    it('hides sections section when sections array is empty', () => {
      renderSidebar({ sections: [] });
      expect(screen.queryByText('Sections')).not.toBeInTheDocument();
    });

    it('renders authors section when authors are provided', () => {
      renderSidebar();
      expect(screen.getByText('Authors')).toBeInTheDocument();
    });

    it('hides authors section when authors array is empty', () => {
      renderSidebar({ authors: [] });
      expect(screen.queryByText('Authors')).not.toBeInTheDocument();
    });

    it('renders completely empty when all arrays are empty', () => {
      const { container } = renderSidebar({
        types: [],
        years: [],
        volumes: [],
        sections: [],
        authors: [],
      });
      expect(container.querySelector('.searchResultsSidebar')!.children).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Types callbacks
  // ─────────────────────────────────────────────────────────────────────────
  describe('types callbacks', () => {
    it('calls onCheckTypeCallback when checkbox changes', async () => {
      const onCheckTypeCallback = vi.fn();
      const user = userEvent.setup();
      renderSidebar({ onCheckTypeCallback });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(onCheckTypeCallback).toHaveBeenCalledWith('article');
    });

    it('calls onCheckTypeCallback when label is clicked', () => {
      const onCheckTypeCallback = vi.fn();
      renderSidebar({ onCheckTypeCallback });

      fireEvent.click(screen.getByText('Article'));
      expect(onCheckTypeCallback).toHaveBeenCalledWith('article');
    });

    it('calls onCheckTypeCallback on Enter key on label', () => {
      const onCheckTypeCallback = vi.fn();
      renderSidebar({ onCheckTypeCallback });

      fireEvent.keyDown(screen.getByText('Article'), { key: 'Enter' });
      expect(onCheckTypeCallback).toHaveBeenCalledWith('article');
    });

    it('calls onCheckTypeCallback on Space key on label', () => {
      const onCheckTypeCallback = vi.fn();
      renderSidebar({ onCheckTypeCallback });

      fireEvent.keyDown(screen.getByText('Article'), { key: ' ' });
      expect(onCheckTypeCallback).toHaveBeenCalledWith('article');
    });

    it('renders type count badge', () => {
      renderSidebar();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('reflects checked state on checkboxes', () => {
      renderSidebar();
      const checkboxes = screen.getAllByRole('checkbox');
      // 'review' is isChecked=true at index 1 of types (index 0 overall)
      // 'article' is isChecked=false at index 0 of types
      const typeCheckboxes = checkboxes.slice(0, 2);
      expect(typeCheckboxes[0]).not.toBeChecked();
      expect(typeCheckboxes[1]).toBeChecked();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Years callbacks
  // ─────────────────────────────────────────────────────────────────────────
  describe('years callbacks', () => {
    it('calls onCheckYearCallback when year label is clicked', () => {
      const onCheckYearCallback = vi.fn();
      renderSidebar({ onCheckYearCallback });

      fireEvent.click(screen.getByText('2024'));
      expect(onCheckYearCallback).toHaveBeenCalledWith(2024);
    });

    it('calls onCheckYearCallback on Enter key on year', () => {
      const onCheckYearCallback = vi.fn();
      renderSidebar({ onCheckYearCallback });

      fireEvent.keyDown(screen.getByText('2023'), { key: 'Enter' });
      expect(onCheckYearCallback).toHaveBeenCalledWith(2023);
    });

    it('renders year count badge', () => {
      renderSidebar();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Volumes callbacks
  // ─────────────────────────────────────────────────────────────────────────
  describe('volumes callbacks', () => {
    it('calls onCheckVolumeCallback when volume label is clicked', () => {
      const onCheckVolumeCallback = vi.fn();
      renderSidebar({ onCheckVolumeCallback });

      fireEvent.click(screen.getByText('Volume 1'));
      expect(onCheckVolumeCallback).toHaveBeenCalledWith(1);
    });

    it('calls onCheckVolumeCallback on Enter key', () => {
      const onCheckVolumeCallback = vi.fn();
      renderSidebar({ onCheckVolumeCallback });

      fireEvent.keyDown(screen.getByText('Volume 2'), { key: 'Enter' });
      expect(onCheckVolumeCallback).toHaveBeenCalledWith(2);
    });

    it('renders label in correct language', () => {
      renderSidebar({ language: 'fr' });
      expect(screen.getByText('Volume 1')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Sections callbacks
  // ─────────────────────────────────────────────────────────────────────────
  describe('sections callbacks', () => {
    it('calls onCheckSectionCallback when section label is clicked', () => {
      const onCheckSectionCallback = vi.fn();
      renderSidebar({ onCheckSectionCallback });

      fireEvent.click(screen.getByText('Mathematics'));
      expect(onCheckSectionCallback).toHaveBeenCalledWith(10);
    });

    it('renders section label in correct language', () => {
      renderSidebar({ language: 'fr' });
      expect(screen.getByText('Mathématiques')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Authors callbacks
  // ─────────────────────────────────────────────────────────────────────────
  describe('authors callbacks', () => {
    it('calls onCheckAuthorCallback when author label is clicked', () => {
      const onCheckAuthorCallback = vi.fn();
      renderSidebar({ onCheckAuthorCallback });

      fireEvent.click(screen.getByText('Alice Martin'));
      expect(onCheckAuthorCallback).toHaveBeenCalledWith('Alice Martin');
    });

    it('calls onCheckAuthorCallback on Enter key', () => {
      const onCheckAuthorCallback = vi.fn();
      renderSidebar({ onCheckAuthorCallback });

      fireEvent.keyDown(screen.getByText('Bob Dupont'), { key: 'Enter' });
      expect(onCheckAuthorCallback).toHaveBeenCalledWith('Bob Dupont');
    });

    it('renders author count badge', () => {
      renderSidebar();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('reflects checked author state', () => {
      renderSidebar();
      // Bob Dupont is checked
      const checkboxes = screen.getAllByRole('checkbox');
      // Last 2 are authors
      const authorCheckboxes = checkboxes.slice(-2);
      expect(authorCheckboxes[0]).not.toBeChecked();
      expect(authorCheckboxes[1]).toBeChecked();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Accessibility
  // ─────────────────────────────────────────────────────────────────────────
  describe('accessibility', () => {
    it('has no axe violations', async () => {
      const { container } = renderSidebar();
      const results = await checkA11y(container);
      expect(results.violations).toHaveLength(0);
    });

    it('all interactive labels have tabIndex=0', () => {
      const { container } = renderSidebar();
      const buttons = container.querySelectorAll('[role="button"]');
      buttons.forEach(btn => {
        expect(btn).toHaveAttribute('tabindex', '0');
      });
    });
  });
});
