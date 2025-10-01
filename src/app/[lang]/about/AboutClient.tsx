'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';

import caretUp from '@/assets/icons/caret-up-red.svg';
import caretDown from '@/assets/icons/caret-down-red.svg';
import { useAppSelector } from '@/hooks/store';
import { generateIdFromText, unifiedProcessor, serializeMarkdown, getMarkdownImageURL, adjustNestedListsInMarkdownContent } from '@/utils/markdown';
import AboutSidebar, { IAboutHeader } from '@/components/Sidebars/AboutSidebar/AboutSidebar';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';

// Interface personnalisée qui accepte n'importe quel format de page
interface IPageData {
  content?: Record<string, string>;
  [key: string]: any;
}

interface IAboutSection {
  id: string;
  value: string;
  opened: boolean;
}

interface AboutClientProps {
  initialPage: IPageData | null;
}

export default function AboutClient({ initialPage }: AboutClientProps): JSX.Element {
  const { t } = useTranslation();

  const language = useAppSelector(state => state.i18nReducer.language)
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code)
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name)

  const [pageData, setPageData] = useState<IPageData | null>(initialPage);
  const [pageSections, setPageSections] = useState<IAboutSection[]>([]);
  const [sidebarHeaders, setSidebarHeaders] = useState<IAboutHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const parseContentSections = (toBeParsed: string | undefined): IAboutSection[] => {
    if (!toBeParsed) return [];
    
    const tree = unifiedProcessor.parse(toBeParsed);
    const sections: IAboutSection[] = [];
    let currentSection: IAboutSection | null = null;
  
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

  const parseSidebarHeaders = (toBeParsed: string | undefined): IAboutHeader[] => {
    if (!toBeParsed) return [];
    
    const tree = unifiedProcessor.parse(toBeParsed);
    const headers: IAboutHeader[] = [];
    let lastH2: IAboutHeader | null = null;
  
    tree.children.forEach((node) => {
      if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
        const textNode = node.children.find(child => child.type === 'text') as { value: string };
        
        if (textNode) {
          const header: IAboutHeader = {
            id: generateIdFromText(textNode.value),
            value: textNode.value,
            opened: true,
            children: []
          };
  
          if (node.depth === 2) {
            lastH2 = header;
            headers.push(header);
          } else if (node.depth === 3 && lastH2) {
            lastH2.children.push(header);
          }
        }
      }
    });
  
    return headers;
  };

  const toggleSectionHeader = (id: string): void => {
    const updatedSections = pageSections.map((section) => {
      if (section.id === id) {
        return { ...section, opened: !section.opened };
      }
      return section;
    });

    setPageSections(updatedSections);
  };

  const toggleSidebarHeader = (id: string): void => {
    const updatedHeaders = sidebarHeaders.map((header) => {
      if (header.id === id) {
        return { ...header, opened: !header.opened };
      }
      return header;
    });

    setSidebarHeaders(updatedHeaders);
  };

  // Effet pour traiter les données initiales
  useEffect(() => {
    if (initialPage) {
      setPageData(initialPage);
    }
  }, [initialPage]);

  // Effet pour traiter le contenu de la page
  useEffect(() => {
    if (pageData) {
      try {
        // Extraire le contenu en fonction du format des données
        let content = '';
        
        // Vérifier si nous avons le format attendu
        if (pageData.content && pageData.content[language]) {
          content = pageData.content[language];
        }
        
        // Si content est vide, essayer d'autres formats possibles
        if (!content && pageData.content) {
          content = pageData.content['en'] || pageData.content['fr'] || '';
        }
        
        if (content) {
          const adjustedContent = adjustNestedListsInMarkdownContent(content);
          setPageSections(parseContentSections(adjustedContent));
          setSidebarHeaders(parseSidebarHeaders(adjustedContent));
        } else {
          // Si pas de contenu, initialiser avec des sections vides
          setPageSections([]);
          setSidebarHeaders([]);
        }
      } catch (error) {
        console.error("Erreur lors du traitement du contenu:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [pageData, language]);

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} >` }
  ];

  return (
    <main className='about'>
      <Breadcrumb parents={breadcrumbItems} crumbLabel={t('pages.about.title')} />
      <h1 className='about-title'>{t('pages.about.title')}</h1>
      <div className='about-content'>
        <AboutSidebar headers={sidebarHeaders} toggleHeaderCallback={toggleSidebarHeader} />
        {isLoading ? (
          <Loader />
        ) : (
          <div className='about-content-body'>
            {pageSections.length > 0 ? (
              pageSections.map((section) => (
                <div
                  key={section.id}
                  className={`about-content-body-section ${!section.opened && 'about-content-body-section-hidden'}`}
                >
                  <div className='about-content-body-section-subtitle' onClick={(): void => toggleSectionHeader(section.id)}>
                    <h2 id={section.id} className='about-content-body-section-subtitle-text'>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ src, alt }) => <img src={getMarkdownImageURL(src || '', rvcode || '')} alt={alt} />,
                          a: ({ href, children }) => <a href={href} target='_blank' rel='noreferrer'>{children}</a>
                        }}
                      >
                        {section.value.split('\n')[0]}
                      </ReactMarkdown>
                    </h2>
                    <img className='about-content-body-section-subtitle-caret' src={section.opened ? caretUp : caretDown} alt='Caret icon' />
                  </div>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ src, alt }) => <img src={getMarkdownImageURL(src || '', rvcode || '')} alt={alt} />,
                      a: ({ href, children }) => <a href={href} target='_blank' rel='noreferrer' className='about-content-body-section-link'>{children}</a>
                    }}
                  >
                    {section.value.split('\n').slice(1).join('\n')}
                  </ReactMarkdown>
                </div>
              ))
            ) : (
              <p className="about-content-body-empty">Aucun contenu disponible pour la page "À propos".</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
} 