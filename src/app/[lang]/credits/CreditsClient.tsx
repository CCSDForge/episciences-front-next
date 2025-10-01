'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/components/Link/Link';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';
import PageTitle from '@/components/PageTitle/PageTitle';

// import caretUp from '/icons/caret-up-red.svg';
// import caretDown from '/icons/caret-down-red.svg';
import caretUp from '/public/icons/caret-up-red.svg';
import caretDown from '/public/icons/caret-down-red.svg';
import { useAppSelector } from '@/hooks/store';
import { generateIdFromText, unifiedProcessor, serializeMarkdown, getMarkdownImageURL, adjustNestedListsInMarkdownContent } from '@/utils/markdown';
import CreditsSidebar, { ICreditsHeader } from '@/components/Sidebars/CreditsSidebar/CreditsSidebar';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';

interface ICreditsSection {
  id: string;
  value: string;
  opened: boolean;
}

interface CreditsClientProps {
  creditsPage: any;
}

export default function CreditsClient({ creditsPage }: CreditsClientProps): JSX.Element {
  const { t } = useTranslation();

  const language = useAppSelector(state => state.i18nReducer.language)
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code)
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name)

  const [pageSections, setPageSections] = useState<ICreditsSection[]>([]);
  const [sidebarHeaders, setSidebarHeaders] = useState<ICreditsHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const parseContentSections = (toBeParsed: string | undefined): ICreditsSection[] => {
    const tree = unifiedProcessor.parse(toBeParsed);
    const sections: ICreditsSection[] = [];
    let currentSection: ICreditsSection | null = null;
  
    tree.children.forEach((node) => {
      if (node.type === 'heading' && node.depth === 2) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const titleText = node.children
          .filter(child => child.type === 'text')
          .map(textNode => (textNode as { value: string }).value)
          .join('');
        currentSection = {
          id: generateIdFromText(titleText),
          value: serializeMarkdown(node),
          opened: true
        };
      } else {
        if (!currentSection) {
          currentSection = {
            id: 'intro',
            value: '',
            opened: true
          };
        }
        currentSection.value += serializeMarkdown(node) + '\n';
      }
    });
  
    if (currentSection) {
      sections.push(currentSection);
    }
  
    return sections;
  };

  const parseSidebarHeaders = (toBeParsed: string | undefined): ICreditsHeader[] => {
    const tree = unifiedProcessor.parse(toBeParsed);
    const headings = [];
    let lastH2 = null;
  
    for (const node of tree.children) {
      if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
        const textNode = node.children.find(child => child.type === 'text') as { value: string };
        
        if (textNode) {
          const header: ICreditsHeader = {
            id: generateIdFromText(textNode.value),
            value: textNode.value,
            opened: true,
            children: []
          };
  
          if (node.depth === 2) {
            lastH2 = header;
            headings.push(header);
          } else if (node.depth === 3 && lastH2) {
            lastH2.children.push(header);
          }
        }
      }
    }
  
    return headings;
  };

  const toggleSectionHeader = (id: string): void => {
    const newSections = pageSections.map(section => {
      if (section.id === id) {
        return { ...section, opened: !section.opened };
      }
      return section;
    });

    setPageSections(newSections);
  };

  const toggleSidebarHeader = (id: string): void => {
    const newHeaders = sidebarHeaders.map(header => {
      if (header.id === id) {
        return { ...header, opened: !header.opened };
      }
      return header;
    });

    setSidebarHeaders(newHeaders);
  };

  useEffect(() => {
    setIsLoading(true);
    try {
      if (creditsPage?.content && language) {
        const content = creditsPage.content[language];
        const adjustedContent = adjustNestedListsInMarkdownContent(content);
        
        setPageSections(parseContentSections(adjustedContent));
        setSidebarHeaders(parseSidebarHeaders(adjustedContent));
      }
    } catch (error) {
      console.error('Erreur lors du traitement du contenu des crédits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [creditsPage, language]);

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} >` },
  ];

  return (
    <main className='credits'>
      <PageTitle title={t('pages.credits.title')} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={t('pages.credits.title')} />
      <h1 className='credits-title'>{t('pages.credits.title')}</h1>
      {isLoading ? (
        <Loader />
      ) : (
        <div className='credits-content'>
          <CreditsSidebar headers={sidebarHeaders} toggleHeaderCallback={toggleSidebarHeader} />
            <div className='credits-content-body'>
            {pageSections.map(section => (
              <div
                key={section.id}
                className={`credits-content-body-section ${!section.opened && 'credits-content-body-section-hidden'}`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  urlTransform={uri => uri.includes('/public/') ? getMarkdownImageURL(uri, rvcode!) : uri}
                  components={{
                    a: ({ ...props }) => (
                      <Link href={props.href!} target='_blank' className='credits-content-body-section-link'>
                        {props.children?.toString()}
                      </Link>
                    ),
                    h2: ({ ...props }) => {
                      const id = generateIdFromText(props.children?.toString()!)

                      return (
                        <div className='credits-content-body-section-subtitle' onClick={(): void => toggleSectionHeader(id!)}>
                          <h2 id={id} className='credits-content-body-section-subtitle-text' {...props} />
                          {pageSections.find(pageSection => pageSection.id === id)?.opened ? (
                            <img className='credits-content-body-section-subtitle-caret' src={caretUp} alt='Caret up icon' />
                          ) : (
                            <img className='credits-content-body-section-subtitle-caret' src={caretDown} alt='Caret down icon' />
                          )}
                        </div>
                      )
                    },
                    h3: ({ ...props }) => <h3 id={generateIdFromText(props.children?.toString()!)} {...props} />,
                  }}
                >
                  {section.value}
                </ReactMarkdown>
              </div>
            ))}
            </div>
        </div>
      )}
    </main>
  );
} 