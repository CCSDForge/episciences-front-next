'use client';

import { CaretUpBlackIcon, CaretDownBlackIcon } from '@/components/icons';
import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';
import { useAppSelector } from '@/hooks/store';
import {
  generateIdFromText,
  unifiedProcessor,
  serializeMarkdown,
  getMarkdownImageURL,
  adjustNestedListsInMarkdownContent,
} from '@/utils/markdown';
import AboutSidebar, { IAboutHeader } from '@/components/Sidebars/AboutSidebar/AboutSidebar';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import { BreadcrumbItem } from '@/utils/breadcrumbs';
import '@/styles/transitions.scss';
import './MarkdownPageWithSidebar.scss';

interface IPageSection {
  id: string;
  value: string;
  title: string; // Plain text title (no markdown)
  opened: boolean;
}

interface MarkdownPageWithSidebarProps {
  content: string;
  title: string;
  isLoading?: boolean;
  isUpdating?: boolean;
  breadcrumbLabels: {
    parents: BreadcrumbItem[];
    current: string;
  };
  lang?: string;
  noContentMessage?: string;
  className?: string;
}

/**
 * Reusable component for rendering markdown content with an automatic sidebar
 * Extracts H2 and H3 headers to build a navigable table of contents
 * Used by About, Acknowledgements, Indexing, Ethical Charter, For Reviewers, and For Conference Organisers pages
 */
export default function MarkdownPageWithSidebar({
  content,
  title,
  isLoading = false,
  isUpdating = false,
  breadcrumbLabels,
  lang,
  noContentMessage,
  className = 'markdown-page',
}: MarkdownPageWithSidebarProps): React.JSX.Element {
  const { t } = useTranslation();
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const [pageSections, setPageSections] = useState<IPageSection[]>([]);
  const [sidebarHeaders, setSidebarHeaders] = useState<IAboutHeader[]>([]);

  // Recursive function to extract all text from a node, regardless of structure
  const extractTextFromNode = useCallback((node: any): string => {
    if (node.type === 'text') {
      return node.value || '';
    }
    if (node.children && Array.isArray(node.children)) {
      return node.children.map((child: any) => extractTextFromNode(child)).join('');
    }
    return '';
  }, []);

  const parseContentSections = useCallback(
    (toBeParsed: string | undefined): IPageSection[] => {
      if (!toBeParsed) return [];

      const tree = unifiedProcessor.parse(toBeParsed);
      const sections: IPageSection[] = [];
      let currentSection: IPageSection | null = null;

      tree.children.forEach(node => {
        // Accept both H1 and H2 as section headers
        if (node.type === 'heading' && (node.depth === 1 || node.depth === 2)) {
          if (currentSection) {
            sections.push(currentSection);
          }
          const titleText = extractTextFromNode(node).trim();
          currentSection = {
            id: generateIdFromText(titleText),
            value: serializeMarkdown(node),
            title: titleText, // Store plain text title separately
            opened: true,
          };
        } else {
          if (!currentSection) {
            currentSection = {
              id: 'intro',
              value: '',
              title: '', // Empty title for intro section
              opened: true,
            };
          }
          currentSection.value += serializeMarkdown(node) + '\n';
        }
      });

      if (currentSection) {
        sections.push(currentSection);
      }

      // Filter out empty sections (sections with only whitespace or just the heading)
      return sections.filter(section => {
        // Remove the heading line and check if there's actual content
        const contentWithoutHeading = section.value.replace(/^#{1,3}\s*.*$/m, '').trim();
        // Also filter out sections that are just the title (empty title sections)
        if (section.title === '' && contentWithoutHeading.length === 0) {
          return false;
        }
        return contentWithoutHeading.length > 0;
      });
    },
    [extractTextFromNode]
  );

  const parseSidebarHeaders = useCallback(
    (toBeParsed: string | undefined): IAboutHeader[] => {
      if (!toBeParsed) return [];

      const tree = unifiedProcessor.parse(toBeParsed);
      const headers: IAboutHeader[] = [];
      let lastMainHeader: IAboutHeader | null = null;

      tree.children.forEach(node => {
        if (node.type === 'heading') {
          // Use recursive extraction to get ALL text from the heading
          const titleText = extractTextFromNode(node).trim();

          // Skip empty titles
          if (!titleText) return;

          // H1 or H2 as main headers
          if (node.depth === 1 || node.depth === 2) {
            lastMainHeader = {
              id: generateIdFromText(titleText),
              value: titleText,
              opened: true,
              children: [],
            };
            headers.push(lastMainHeader);
          } else if (node.depth === 3) {
            // H3 as subheaders if there's a parent, otherwise as main headers
            if (lastMainHeader) {
              lastMainHeader.children.push({
                id: generateIdFromText(titleText),
                value: titleText,
                opened: false,
                children: [],
              });
            } else {
              // No parent H1/H2 found yet, treat H3 as main header
              const header = {
                id: generateIdFromText(titleText),
                value: titleText,
                opened: true,
                children: [],
              };
              headers.push(header);
            }
          }
        }
      });

      return headers;
    },
    [extractTextFromNode]
  );

  const toggleSectionHeader = (id: string): void => {
    setPageSections(prevSections =>
      prevSections.map(section => ({
        ...section,
        opened: section.id === id ? !section.opened : section.opened,
      }))
    );
  };

  const toggleSidebarHeader = (id: string): void => {
    setSidebarHeaders(prevHeaders =>
      prevHeaders.map(header => ({
        ...header,
        opened: header.id === id ? !header.opened : header.opened,
      }))
    );
  };

  useEffect(() => {
    if (content) {
      const adjustedContent = adjustNestedListsInMarkdownContent(content);
      const sections = parseContentSections(adjustedContent);
      const headers = parseSidebarHeaders(adjustedContent);

      setPageSections(sections);
      setSidebarHeaders(headers);
    }
  }, [content, parseContentSections, parseSidebarHeaders]);

  // Handle URL hash on initial load and when content changes
  useEffect(() => {
    if (pageSections.length > 0 && window.location.hash) {
      const hash = window.location.hash.substring(1); // Remove the #
      // Use double requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }
  }, [pageSections]);

  return (
    <main className={className}>
      <Breadcrumb
        parents={breadcrumbLabels.parents}
        crumbLabel={breadcrumbLabels.current}
        lang={lang}
      />
      <h1 className={`${className}-title`}>{title}</h1>
      <div className={`${className}-content content-transition ${isUpdating ? 'updating' : ''}`}>
        {sidebarHeaders.length > 0 && (
          <AboutSidebar headers={sidebarHeaders} toggleHeaderCallback={toggleSidebarHeader} />
        )}
        {isLoading ? (
          <Loader />
        ) : (
          <div className={`${className}-content-body`}>
            {pageSections.length > 0 ? (
              pageSections.map((section, index) => (
                <div
                  key={`${section.id}-${index}`}
                  className={`${className}-content-body-section ${!section.opened ? `${className}-content-body-section-hidden` : ''}`}
                >
                  {section.title && (
                    <div
                      className={`${className}-content-body-section-subtitle`}
                      role="button"
                      tabIndex={0}
                      aria-expanded={section.opened}
                      aria-controls={`section-content-${section.id}`}
                      onClick={(): void => toggleSectionHeader(section.id)}
                      onKeyDown={(e): void => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSectionHeader(section.id);
                        }
                      }}
                    >
                      <h2
                        id={section.id}
                        className={`${className}-content-body-section-subtitle-text`}
                      >
                        {section.title}
                      </h2>
                      {section.opened ? (
                        <CaretUpBlackIcon
                          size={16}
                          className={`${className}-content-body-section-subtitle-caret`}
                          ariaLabel="Collapse section"
                        />
                      ) : (
                        <CaretDownBlackIcon
                          size={16}
                          className={`${className}-content-body-section-subtitle-caret`}
                          ariaLabel="Expand section"
                        />
                      )}
                    </div>
                  )}
                  <div
                    id={`section-content-${section.id}`}
                    role="region"
                    aria-labelledby={section.id}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img: ({ src, alt }) => (
                          <img src={getMarkdownImageURL(src || '', rvcode || '')} alt={alt} />
                        ),
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className={`${className}-content-body-section-link`}
                          >
                            {children}
                          </a>
                        ),
                        h1: ({ children }) => <></>,
                        h2: ({ children }) => <></>,
                        h3: ({ node, children }) => {
                          // Extract text from the AST node for proper ID generation
                          const text = node ? extractTextFromNode(node) : '';
                          const id = generateIdFromText(text);
                          return <h3 id={id}>{children}</h3>;
                        },
                      }}
                    >
                      {section.value}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            ) : (
              <p>{noContentMessage || t('pages.common.noContent')}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
