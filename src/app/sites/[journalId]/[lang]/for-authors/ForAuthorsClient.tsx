'use client';

import { Fragment, useState, useMemo, useCallback } from 'react';
import { AvailableLanguage } from '@/utils/i18n';
import { getLocalizedContent } from '@/utils/content-fallback';
import { Link } from '@/components/Link/Link';
import MarkdownRenderer from '@/components/MarkdownRenderer/MarkdownRenderer';
import { useTranslation } from 'react-i18next';
import { CaretUpBlackIcon, CaretDownBlackIcon } from '@/components/icons';
import { useAppSelector } from '@/hooks/store';
import {
  generateIdFromText,
  unifiedProcessor,
  serializeMarkdown,
  getMarkdownImageURL,
  adjustNestedListsInMarkdownContent,
  getNodeText,
} from '@/utils/markdown';
import ForAuthorsSidebar, {
  IForAuthorsHeader,
} from '@/components/Sidebars/ForAuthorsSidebar/ForAuthorsSidebar';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import { BreadcrumbItem } from '@/utils/breadcrumbs';
import { handleKeyboardClick } from '@/utils/keyboard';
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
  const adjustedContent = adjustNestedListsInMarkdownContent(content);
  const contentTree = unifiedProcessor.parse(adjustedContent);
  const firstNode = contentTree.children[0];
  const startsWithH2 = firstNode?.type === 'heading' && firstNode.depth === 2;

  if (title && !startsWithH2) {
    return {
      tree: unifiedProcessor.parse(`## ${title} \n\n\n ${adjustedContent}`),
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

  const parseContentSections = (
    toBeParsed: Record<
      ForAuthorsSectionType,
      { title: string | undefined; content: string | undefined }
    >
  ): IForAuthorsSection[] => {
    const sections: IForAuthorsSection[] = [];

    Object.entries(toBeParsed).forEach(toBeParsedEntry => {
      const withNumerotation = toBeParsedEntry[0] === 'prepareSubmission';
      const title = toBeParsedEntry[1].title ?? '';
      const content = toBeParsedEntry[1].content ?? '';
      const { tree, titleInjected } = buildSectionTree(title, content);
      const entryStartIndex = sections.length;

      let currentSection: IForAuthorsSection = withNumerotation
        ? { id: '', value: '', opened: true, cards: [] }
        : { id: '', value: '', opened: true };
      let h3Counter = 0;
      let currentCardContent = '';

      tree.children.forEach(node => {
        if (node.type === 'heading' && node.depth === 2) {
          if (currentSection.id) {
            if (currentCardContent && currentSection.cards && currentSection.cards.length > 0) {
              const lastCard = currentSection.cards[currentSection.cards.length - 1];
              lastCard.content = currentCardContent.trim();
            }
            currentCardContent = '';

            sections.push(currentSection);
            currentSection = withNumerotation
              ? { id: '', value: '', opened: true, cards: [] }
              : { id: '', value: '', opened: true };
          }

          const titleText = getNodeText(node);

          currentSection.id = generateIdFromText(titleText);
          currentSection.value += serializeMarkdown(node);
        } else if (withNumerotation) {
          if (node.type === 'heading' && node.depth === 3) {
            h3Counter += 1;

            const h3Title = getNodeText(node);
            const h3Id = generateIdFromText(h3Title);

            if (currentCardContent && currentSection.cards && currentSection.cards.length > 0) {
              const lastCard = currentSection.cards[currentSection.cards.length - 1];
              lastCard.content = currentCardContent.trim();
            }

            currentCardContent = '';
            currentSection.cards!.push({ id: h3Id, title: h3Title, content: '', index: h3Counter });
          } else if (currentSection.cards && currentSection.cards.length > 0) {
            currentCardContent += serializeMarkdown(node) + '\n';
          } else {
            currentSection.value += serializeMarkdown(node);
            currentSection.value += '\n';
          }
        } else {
          currentSection.value += serializeMarkdown(node);
          currentSection.value += '\n';
        }
      });

      if (currentCardContent && currentSection.cards && currentSection.cards.length > 0) {
        const lastCard = currentSection.cards[currentSection.cards.length - 1];
        lastCard.content = currentCardContent.trim();
      }

      if (currentSection.id) {
        sections.push(currentSection);
      }

      if (title && !titleInjected && sections.length > entryStartIndex) {
        sections[entryStartIndex].pageTitle = title;
      }
    });

    return sections;
  };

  const parseSidebarHeaders = (
    toBeParsed: Record<
      ForAuthorsSectionType,
      { title: string | undefined; content: string | undefined }
    >
  ): IForAuthorsHeader[] => {
    const headings: IForAuthorsHeader[] = [];

    Object.entries(toBeParsed).forEach(toBeParsedEntry => {
      const withNumerotation = toBeParsedEntry[0] === 'prepareSubmission';
      const title = toBeParsedEntry[1].title ?? '';
      const content = toBeParsedEntry[1].content ?? '';
      const { tree } = buildSectionTree(title, content);

      let lastH2 = null;
      let h3Counter = 0;

      for (const node of tree.children) {
        if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
          const titleText = getNodeText(node);

          if (titleText) {
            const id = generateIdFromText(titleText);
            let value = titleText;

            if (withNumerotation && node.depth === 3) {
              h3Counter += 1;
              value = `${h3Counter}. ${value}`;
            }

            const header: IForAuthorsHeader = {
              id,
              value,
              opened: true,
              children: [],
            };

            if (node.depth === 2) {
              lastH2 = header;
              headings.push(header);
              h3Counter = 0;
            } else if (node.depth === 3 && lastH2) {
              lastH2.children.push(header);
            }
          }
        }
      }
    });

    return headings;
  };

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
      } satisfies Record<
        ForAuthorsSectionType,
        { title: string | undefined; content: string | undefined }
      >,
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
          <div
            className="forAuthors-content-body-section-subtitle"
            role="button"
            tabIndex={0}
            aria-expanded={isOpened}
            onClick={(): void => toggleSectionHeader(id)}
            onKeyDown={e => handleKeyboardClick(e, () => toggleSectionHeader(id))}
          >
            <h2 id={id} className="forAuthors-content-body-section-subtitle-text">
              {children}
            </h2>
            {isOpened ? (
              <CaretUpBlackIcon
                size={16}
                className="forAuthors-content-body-section-subtitle-caret"
                ariaLabel="Collapse section"
              />
            ) : (
              <CaretDownBlackIcon
                size={16}
                className="forAuthors-content-body-section-subtitle-caret"
                ariaLabel="Expand section"
              />
            )}
          </div>
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
                    {section.cards?.map((card, index) => (
                      <div
                        key={index}
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
