'use client';

import { Fragment, useState, useMemo, useCallback } from 'react';
import type { RootContent } from 'mdast';
import { AvailableLanguage } from '@/utils/i18n';
import { getLocalizedContent } from '@/utils/content-fallback';
import { Link } from '@/components/Link/Link';
import CollapsibleSectionHeader from '@/components/CollapsibleSectionHeader/CollapsibleSectionHeader';
import MarkdownRenderer from '@/components/MarkdownRenderer/MarkdownRenderer';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';
import {
  generateIdFromText,
  unifiedProcessor,
  serializeMarkdown,
  getMarkdownImageURL,
  getNodeText,
} from '@/utils/markdown';
import ForAuthorsSidebar, {
  IForAuthorsHeader,
} from '@/components/Sidebars/ForAuthorsSidebar/ForAuthorsSidebar';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import { BreadcrumbItem } from '@/utils/breadcrumbs';
import { formatDate } from '@/utils/date';
import { ForAuthorsPage } from '@/services/forAuthors';
import type { Components } from 'react-markdown';
import '@/styles/transitions.scss';
import './ForAuthors.scss';

type ForAuthorsSectionType = 'editorialWorkflow' | 'prepareSubmission';

const toggleClosedId = (set: Set<string>, id: string): Set<string> => {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

// Only prefix the page title as a synthetic H2 when the content doesn't already
// open with its own H2 - otherwise the title would become its own empty collapsible section.
// `titleInjected` tells the caller whether the title is already shown as that first H2,
// or still needs to be displayed separately (as a static heading above the sections).
const buildSectionTree = (title: string, content: string) => {
  const contentTree = unifiedProcessor.parse(content);
  const firstNode = contentTree.children[0];
  const startsWithH2 = firstNode?.type === 'heading' && firstNode.depth === 2;

  if (title && !startsWithH2) {
    return {
      tree: unifiedProcessor.parse(`## ${title} \n\n\n ${content}`),
      titleInjected: true,
    };
  }

  return { tree: contentTree, titleInjected: false };
};

interface IForAuthorsSection {
  id: string;
  value: string;
  opened: boolean;
  cards?: { id: string; title: string; content: string; index: number }[];
  pageTitle?: string;
}

type ForAuthorsContentMap = Record<
  ForAuthorsSectionType,
  { title: string | undefined; content: string | undefined }
>;

interface SectionBuilderState {
  currentSection: IForAuthorsSection;
  h3Counter: number;
  currentCardContent: string;
}

const createEmptySection = (withNumerotation: boolean): IForAuthorsSection =>
  withNumerotation ? { id: '', value: '', opened: true, cards: [] } : { id: '', value: '', opened: true };

const flushCardContent = (section: IForAuthorsSection, cardContent: string): void => {
  if (cardContent && section.cards && section.cards.length > 0) {
    section.cards[section.cards.length - 1].content = cardContent.trim();
  }
};

const startNewH2Section = (
  node: RootContent,
  sections: IForAuthorsSection[],
  state: SectionBuilderState,
  withNumerotation: boolean
): void => {
  if (state.currentSection.id) {
    flushCardContent(state.currentSection, state.currentCardContent);
    state.currentCardContent = '';
    sections.push(state.currentSection);
    state.currentSection = createEmptySection(withNumerotation);
  }

  const titleText = getNodeText(node);
  state.currentSection.id = generateIdFromText(titleText);
  state.currentSection.value += serializeMarkdown(node);
};

const startNewCard = (node: RootContent, state: SectionBuilderState): void => {
  state.h3Counter += 1;
  const h3Title = getNodeText(node);
  const h3Id = generateIdFromText(h3Title);

  flushCardContent(state.currentSection, state.currentCardContent);
  state.currentCardContent = '';
  state.currentSection.cards!.push({ id: h3Id, title: h3Title, content: '', index: state.h3Counter });
};

const appendNumberedNode = (node: RootContent, state: SectionBuilderState): void => {
  if (state.currentSection.cards && state.currentSection.cards.length > 0) {
    state.currentCardContent += serializeMarkdown(node) + '\n';
  } else {
    state.currentSection.value += serializeMarkdown(node);
    state.currentSection.value += '\n';
  }
};

const appendSectionNode = (node: RootContent, state: SectionBuilderState): void => {
  state.currentSection.value += serializeMarkdown(node);
  state.currentSection.value += '\n';
};

const processSectionNode = (
  node: RootContent,
  sections: IForAuthorsSection[],
  state: SectionBuilderState,
  withNumerotation: boolean
): void => {
  if (node.type === 'heading' && node.depth === 2) {
    startNewH2Section(node, sections, state, withNumerotation);
  } else if (!withNumerotation) {
    appendSectionNode(node, state);
  } else if (node.type === 'heading' && node.depth === 3) {
    startNewCard(node, state);
  } else {
    appendNumberedNode(node, state);
  }
};

const parseContentSections = (toBeParsed: ForAuthorsContentMap): IForAuthorsSection[] => {
  const sections: IForAuthorsSection[] = [];

  Object.entries(toBeParsed).forEach(([key, entry]) => {
    const withNumerotation = key === 'prepareSubmission';
    const title = entry.title ?? '';
    const content = entry.content ?? '';
    const { tree, titleInjected } = buildSectionTree(title, content);
    const entryStartIndex = sections.length;

    const state: SectionBuilderState = {
      currentSection: createEmptySection(withNumerotation),
      h3Counter: 0,
      currentCardContent: '',
    };

    tree.children.forEach(node => processSectionNode(node, sections, state, withNumerotation));

    flushCardContent(state.currentSection, state.currentCardContent);

    if (state.currentSection.id) {
      sections.push(state.currentSection);
    }

    if (title && !titleInjected && sections.length > entryStartIndex) {
      sections[entryStartIndex].pageTitle = title;
    }
  });

  return sections;
};

interface SidebarBuilderState {
  lastH2: IForAuthorsHeader | null;
  h3Counter: number;
}

const processSidebarNode = (
  node: RootContent,
  headings: IForAuthorsHeader[],
  withNumerotation: boolean,
  state: SidebarBuilderState
): void => {
  if (node.type !== 'heading' || (node.depth !== 2 && node.depth !== 3)) {
    return;
  }

  const titleText = getNodeText(node);
  if (!titleText) {
    return;
  }

  const id = generateIdFromText(titleText);
  let value = titleText;

  if (withNumerotation && node.depth === 3) {
    state.h3Counter += 1;
    value = `${state.h3Counter}. ${value}`;
  }

  const header: IForAuthorsHeader = { id, value, opened: true, children: [] };

  if (node.depth === 2) {
    state.lastH2 = header;
    headings.push(header);
    state.h3Counter = 0;
  } else if (node.depth === 3 && state.lastH2) {
    state.lastH2.children.push(header);
  }
};

const parseSidebarHeaders = (toBeParsed: ForAuthorsContentMap): IForAuthorsHeader[] => {
  const headings: IForAuthorsHeader[] = [];

  Object.entries(toBeParsed).forEach(([key, entry]) => {
    const withNumerotation = key === 'prepareSubmission';
    const title = entry.title ?? '';
    const content = entry.content ?? '';
    const { tree } = buildSectionTree(title, content);
    const state: SidebarBuilderState = { lastH2: null, h3Counter: 0 };

    tree.children.forEach(node => processSidebarNode(node, headings, withNumerotation, state));
  });

  return headings;
};

interface ForAuthorsClientProps {
  editorialWorkflowPage: ForAuthorsPage | null;
  prepareSubmissionPage: ForAuthorsPage | null;
  lang?: string;
  breadcrumbLabels?: {
    parents: BreadcrumbItem[];
    current: string;
  };
}

export default function ForAuthorsClient({
  editorialWorkflowPage,
  prepareSubmissionPage,
  lang,
  breadcrumbLabels,
}: ForAuthorsClientProps): React.JSX.Element {
  const { t } = useTranslation();

  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const language = (lang as AvailableLanguage) || reduxLanguage;
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const lastUpdated = useMemo(() => {
    const dates = [editorialWorkflowPage?.date_updated, prepareSubmissionPage?.date_updated].filter(
      (d): d is string => !!d
    );
    return dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
  }, [editorialWorkflowPage, prepareSubmissionPage]);

  const [closedSectionIds, setClosedSectionIds] = useState<Set<string>>(new Set());
  const [collapsedHeaderIds, setCollapsedHeaderIds] = useState<Set<string>>(new Set());

  // Stable identities (empty deps - both only use the functional setState form) so the
  // memoized MarkdownRenderer `components` map below doesn't get a new reference - and
  // doesn't force React to remount the whole rendered subtree - on every render.
  const toggleSectionHeader = useCallback((id: string): void => {
    setClosedSectionIds(prev => toggleClosedId(prev, id));
  }, []);

  const toggleSidebarHeader = useCallback((id: string): void => {
    setCollapsedHeaderIds(prev => toggleClosedId(prev, id));
  }, []);

  // Data is already resolved server-side and passed as props, so it can be
  // derived synchronously during render instead of via an effect + loading state.
  const { content, languageNotice } = useMemo(() => {
    const ewTitle = getLocalizedContent(editorialWorkflowPage?.title, language);
    const ewContent = getLocalizedContent(editorialWorkflowPage?.content, language);
    const psTitle = getLocalizedContent(prepareSubmissionPage?.title, language);
    const psContent = getLocalizedContent(prepareSubmissionPage?.content, language);

    const hasFallback = [ewTitle, ewContent, psTitle, psContent].some(
      r => r.isAvailable && !r.isOriginalLanguage
    );

    return {
      content: {
        editorialWorkflow: {
          title: ewTitle.value || '',
          content: ewContent.value || '',
        },
        prepareSubmission: {
          title: psTitle.value || '',
          content: psContent.value || '',
        },
      } satisfies ForAuthorsContentMap,
      languageNotice: hasFallback ? t('common.contentNotInLanguage') : undefined,
    };
  }, [editorialWorkflowPage, prepareSubmissionPage, language, t]);

  const pageSections = useMemo(
    () =>
      parseContentSections(content).map(section => ({
        ...section,
        opened: !closedSectionIds.has(section.id),
      })),
    [content, closedSectionIds]
  );

  const sidebarHeaders = useMemo(
    () =>
      parseSidebarHeaders(content).map(header => ({
        ...header,
        opened: !collapsedHeaderIds.has(header.id),
      })),
    [content, collapsedHeaderIds]
  );

  // Memoized so MarkdownRenderer's `components` map keeps a stable identity across
  // unrelated re-renders - react-markdown remounts the rendered subtree whenever a
  // custom component's function identity changes, which would otherwise happen on
  // every render since these were previously defined inline.
  const markdownComponents = useMemo<Components>(
    () => ({
      a: ({ href, children }) => {
        const isExternal =
          !!href &&
          (href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:'));

        return (
          <Link
            href={href || '#'}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="forAuthors-content-body-section-link"
          >
            {children}
          </Link>
        );
      },
      h2: ({ node, children }) => {
        const id = generateIdFromText(node ? getNodeText(node) : '');
        const isOpened = pageSections.find(pageSection => pageSection.id === id)?.opened;

        return (
          <CollapsibleSectionHeader
            triggerClassName="forAuthors-content-body-section-subtitle"
            headingClassName="forAuthors-content-body-section-subtitle-text"
            caretClassName="forAuthors-content-body-section-subtitle-caret"
            headingId={id}
            title={children}
            isOpen={!!isOpened}
            onToggle={(): void => toggleSectionHeader(id)}
          />
        );
      },
      h3: ({ node, children }) => (
        <h3 id={generateIdFromText(node ? getNodeText(node) : '')}>{children}</h3>
      ),
    }),
    [pageSections, toggleSectionHeader]
  );

  return (
    <main className="forAuthors">
      <Breadcrumb
        parents={breadcrumbLabels?.parents || [{ path: '/', label: `${t('pages.home.title')} >` }]}
        crumbLabel={breadcrumbLabels?.current || t('pages.forAuthors.title')}
        lang={lang}
      />
      <h1 className="forAuthors-title">
        {breadcrumbLabels?.current || t('pages.forAuthors.title')}
      </h1>
      {languageNotice && (
        <p className="forAuthors-language-notice" role="status">
          {languageNotice}
        </p>
      )}
      {pageSections.length === 0 ? (
        <div>No content available</div>
      ) : (
        <div className="forAuthors-content">
          <ForAuthorsSidebar headers={sidebarHeaders} toggleHeaderCallback={toggleSidebarHeader} />
          <div className="forAuthors-content-body">
            {pageSections.map(section => (
              <Fragment key={section.id}>
                {section.pageTitle && (
                  <h2 className="forAuthors-content-body-pageTitle">{section.pageTitle}</h2>
                )}
                <div
                  className={`forAuthors-content-body-section ${!section.opened && 'forAuthors-content-body-section-hidden'}`}
                >
                  <MarkdownRenderer
                    urlTransform={uri =>
                      uri.includes('/public/') ? getMarkdownImageURL(uri, rvcode!) : uri
                    }
                    components={markdownComponents}
                  >
                    {section.value}
                  </MarkdownRenderer>
                  <div className="forAuthors-content-body-section-cards">
                    {section.cards?.map(card => (
                      <div
                        key={card.id}
                        className={`forAuthors-content-body-section-cards-card ${!section.opened && 'forAuthors-content-body-section-cards-card-hidden'}`}
                      >
                        <div className="forAuthors-content-body-section-cards-card-index">
                          {card.index}
                        </div>
                        <div className="forAuthors-content-body-section-cards-card-content">
                          <h3
                            id={card.id}
                            className="forAuthors-content-body-section-cards-card-content-title"
                          >
                            {card.title}
                          </h3>
                          <MarkdownRenderer>{card.content}</MarkdownRenderer>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Fragment>
            ))}
            {lastUpdated && (
              <p className="forAuthors-last-updated">
                {t('common.lastUpdated')} {formatDate(lastUpdated, language)}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
