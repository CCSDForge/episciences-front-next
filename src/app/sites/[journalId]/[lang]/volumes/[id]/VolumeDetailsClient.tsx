'use client';

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { isMobileOnly } from "react-device-detect";
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import { Link } from '@/components/Link/Link';
import { useAppSelector } from "@/hooks/store";
import { formatArticle, FetchedArticle } from "@/utils/article";
import { useFetchVolumesQuery } from '@/store/features/volume/volume.query';
import { RawArticle, IArticle } from "@/types/article";
import { IVolume, IVolumeMetadata } from "@/types/volume";
import { formatDate } from "@/utils/date";
import { VOLUME_TYPE } from "@/utils/volume";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from '@/components/Loader/Loader';
import VolumeArticleCard from "@/components/Cards/VolumeArticleCard/VolumeArticleCard";
import VolumeDetailsMobileModal from "@/components/Modals/VolumeDetailsMobileModal/VolumeDetailsMobileModal";
import VolumeDetailsSidebar from "@/components/Sidebars/VolumeDetailsSidebar/VolumeDetailsSidebar";
import PageTitle from "@/components/PageTitle/PageTitle";
import './VolumeDetails.scss';

interface VolumeDetailsClientProps {
  initialVolume: IVolume | null;
  initialArticles?: FetchedArticle[];
}

const MAX_MOBILE_DESCRIPTION_LENGTH = 200;
const RELATED_VOLUMES = 20;

export default function VolumeDetailsClient({
  initialVolume,
  initialArticles = []
}: VolumeDetailsClientProps): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const language = useAppSelector(state => state.i18nReducer.language);
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);

  const [volume, setVolume] = useState(initialVolume);
  const [isFetchingArticles, setIsFetchingArticles] = useState(false);
  const [articles, setArticles] = useState<FetchedArticle[]>(initialArticles);
  const [showFullMobileDescription, setShowFullMobileDescription] = useState(false);
  const [openedRelatedVolumesMobileModal, setOpenedRelatedVolumesMobileModal] = useState(false);
  const [relatedVolumesData, setRelatedVolumesData] = useState<IVolume[]>([]);

  // Vérifier si on est en mode statique
  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

  const reorderRelatedVolumes = useCallback((volumesToBeOrdered: IVolume[]): IVolume[] => {
    if (!volume || !volumesToBeOrdered || !volumesToBeOrdered.length) return volumesToBeOrdered;

    const currentVolumeIndex = volumesToBeOrdered.findIndex(v => v.id === volume.id);
    if (currentVolumeIndex > -1) {
      const newVolumes = [...volumesToBeOrdered];
      const [currentVolume] = newVolumes.splice(currentVolumeIndex, 1);
      newVolumes.unshift(currentVolume);
      return newVolumes;
    }
  
    return volumesToBeOrdered;
  }, [volume]);

  // Utiliser useFetchVolumesQuery uniquement en mode développement
  const { data: relatedVolumes, isFetching: isFetchingRelatedVolumes } = useFetchVolumesQuery({ 
    rvcode: rvcode!, 
    language: language,
    page: 1, 
    itemsPerPage: RELATED_VOLUMES, 
    types: volume?.types 
  }, { 
    skip: !rvcode || !volume?.types || isStaticBuild 
  });

  // Effet pour gérer les volumes liés en mode statique
  useEffect(() => {
    if (isStaticBuild) {
      // En mode statique, ne pas faire d'appels API
      setRelatedVolumesData(volume ? [volume] : []);
    } else if (relatedVolumes?.data) {
      // En mode développement, utiliser les données de l'API
      setRelatedVolumesData(reorderRelatedVolumes(relatedVolumes.data));
    }
  }, [relatedVolumes, volume, isStaticBuild, reorderRelatedVolumes]);

  // Update articles when initialArticles changes (only needed in dev mode for client-side navigation)
  useEffect(() => {
    if (initialArticles && initialArticles.length > 0) {
      setArticles(initialArticles);
      setIsFetchingArticles(false);
    }
  }, [initialArticles]);

  const renderVolumeType = (): JSX.Element => {
    if (volume?.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        return <h1 className='volumeDetails-id-text'>{t('pages.volumeDetails.titleProceeding')} {volume?.num}</h1>;
      }

      if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        return <h1 className='volumeDetails-id-text'>{t('pages.volumeDetails.titleSpecialIssue')} {volume?.num}</h1>;
      }
    }

    return <h1 className='volumeDetails-id-text'>{t('pages.volumeDetails.title')} {volume?.num}</h1>;
  };

  const renderVolumeMobileRelatedVolumes = (): JSX.Element | null => {
    if (!isMobileOnly) return null;

    const caretIcon = <img 
      className='volumeDetails-id-mobileRelatedList-icon' 
      src={openedRelatedVolumesMobileModal ? "/icons/caret-up-grey.svg" : "/icons/caret-down-grey.svg"} 
      alt={openedRelatedVolumesMobileModal ? "Caret up icon" : "Caret down icon"} 
    />;

    if (volume?.types && volume.types.length) {
      if (volume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        return <div className='volumeDetails-id-mobileRelatedList' onClick={(): void => setOpenedRelatedVolumesMobileModal(true)}>
          <div>{t('pages.volumeDetails.relatedVolumes.proceedings')}</div>
          {caretIcon}
        </div>;
      }

      if (volume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        return <div className='volumeDetails-id-mobileRelatedList' onClick={(): void => setOpenedRelatedVolumesMobileModal(true)}>
          <div>{t('pages.volumeDetails.relatedVolumes.specialIssues')}</div>
          {caretIcon}
        </div>;
      }
    }

    return <div className='volumeDetails-id-mobileRelatedList' onClick={(): void => setOpenedRelatedVolumesMobileModal(true)}>
      <div>{t('pages.volumeDetails.relatedVolumes.volumes')}</div>
      {caretIcon}
    </div>;
  };

  const renderVolumeTitle = (isMobile: boolean): JSX.Element => {
    const className = isMobile ? 'volumeDetails-content-results-content-title volumeDetails-content-results-content-title-mobile' : 'volumeDetails-content-results-content-title';

    if (volume?.types && volume.types.length && volume.types.includes(VOLUME_TYPE.PROCEEDINGS) && volume.settingsProceeding && volume.settingsProceeding.length) {
      const conferenceName = volume.settingsProceeding.find((setting) => setting.setting === "conference_name");

      if (conferenceName && conferenceName.value) {
        return <div className={className}>{volume?.title ? `${volume?.title[language]} (${conferenceName.value})` : ''}</div>;
      }
    }

    return <div className={className}>{volume?.title ? volume?.title[language] : ''}</div>;
  };

  const renderVolumeCommittee = (isMobile: boolean): JSX.Element | null => {
    const className = isMobile ? 'volumeDetails-content-results-content-committee volumeDetails-content-results-content-committee-mobile' : 'volumeDetails-content-results-content-committee';

    if (volume?.committee && volume.committee.length > 0) {
      return (
        <div className={className}>
          {(!volume?.types || !volume?.types.includes(VOLUME_TYPE.PROCEEDINGS)) && (
            <span className="volumeDetails-content-results-content-committee-note">{t('common.volumeCommittee')} :</span>
          )}
          {volume?.committee.map((member) => member.screenName).join(', ')}
        </div>
      );
    }

    return null;
  };

  const renderVolumeDescription = (): JSX.Element => {
    if (volume?.description && volume.description[language]) {
      if (isMobileOnly) {
        if (volume.description[language].length <= MAX_MOBILE_DESCRIPTION_LENGTH) {
          return (
            <div className='volumeDetails-content-results-content-description'>
              <ReactMarkdown>{volume.description[language]}</ReactMarkdown>
            </div>
          );
        }

        return (
          <div className='volumeDetails-content-results-content-description'>
            {showFullMobileDescription ? (
              <ReactMarkdown>{volume?.description[language]}</ReactMarkdown>
            ) : (
              <ReactMarkdown>{`${volume?.description[language].substring(0, MAX_MOBILE_DESCRIPTION_LENGTH)}...`}</ReactMarkdown>
            )}
            <div onClick={(): void => setShowFullMobileDescription(!showFullMobileDescription)} className='volumeDetails-content-results-content-description-toggleMobile'>
              {showFullMobileDescription ? t('common.seeLess') : t('common.seeMore')}
              <img 
                src={showFullMobileDescription ? "/icons/caret-up-grey-light.svg" : "/icons/caret-down-grey-light.svg"} 
                alt={showFullMobileDescription ? "See less" : "See more"} 
              />
            </div>
          </div>
        );
      }

      return (
        <div className='volumeDetails-content-results-content-description'>
          <ReactMarkdown>{volume?.description[language]}</ReactMarkdown>
        </div>
      );
    }

    return <div className='volumeDetails-content-results-content-description'>{''}</div>;
  };

  const renderProceedingTheme = (): string | null => {
    if (!volume?.settingsProceeding) return null;
    const proceedingTheme = volume.settingsProceeding.find((setting) => setting.setting === "conference_theme");
    return proceedingTheme?.value ? `${t('pages.volumeDetails.proceedingSettings.theme')} : ${proceedingTheme.value}` : null;
  };

  const renderProceedingDOI = (): string | null => {
    if (!volume?.settingsProceeding) return null;
    const proceedingDOI = volume.settingsProceeding.find((setting) => setting.setting === "conference_proceedings_doi");
    return proceedingDOI?.value ?? null;
  };

  const renderProceedingLocation = (): string | null => {
    if (!volume?.settingsProceeding) return null;
    const conferenceLocation = volume.settingsProceeding.find((setting) => setting.setting === "conference_location");
    return conferenceLocation?.value ?? null;
  };

  const renderProceedingDates = (): string | null => {
    if (!volume?.settingsProceeding) return null;
    const conferenceStart = volume.settingsProceeding.find((setting) => setting.setting === "conference_start");
    const conferenceEnd = volume.settingsProceeding.find((setting) => setting.setting === "conference_end");
    return conferenceStart?.value && conferenceEnd?.value ? `${formatDate(conferenceStart.value, language)} - ${formatDate(conferenceEnd.value, language)}` : null;
  };

  const getEdito = (): IVolumeMetadata | null => {
    if (!volume?.metadatas || !volume.metadatas.length) return null;

    const edito = volume.metadatas.find((metadata) => 
      metadata.title && 
      metadata.title[language] && 
      metadata.title[language].replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'edito'
    );

    return edito || null;
  };

  if (!volume) return <div>Volume not found</div>;

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.content')} >` },
    { path: '/volumes', label: `${t('pages.volumes.title')} >` }
  ];

  return (
    <main className='volumeDetails'>
      <PageTitle title={`${t('pages.volumeDetails.title')} ${volume?.num}`} />
      
      <Breadcrumb parents={breadcrumbItems} crumbLabel={`${t('pages.volumeDetails.title')} ${volume?.num}`} />

      {openedRelatedVolumesMobileModal && (
        <VolumeDetailsMobileModal 
          t={t} 
          volume={volume} 
          language={language}
          relatedVolumes={relatedVolumesData}
          onCloseCallback={(): void => setOpenedRelatedVolumesMobileModal(false)}
          onSelectRelatedVolumeCallback={(id: number): void => {
            router.push(`/volumes/${id}`);
          }}
        />
      )}

      {isFetchingArticles || isFetchingRelatedVolumes ? (
        <Loader />
      ) : (
        <div className="volumeDetails-volume">
          <div className="volumeDetails-id">
            {renderVolumeType()}
            {renderVolumeMobileRelatedVolumes()}
          </div>
          <div className="volumeDetails-content">
            <div className="volumeDetails-content-year">{volume?.year}</div>
            <div className='volumeDetails-content-results'>
              {renderVolumeTitle(true)}
              {renderVolumeCommittee(true)}
              <VolumeDetailsSidebar 
                language={language}
                t={t}
                volume={volume}
                articles={articles as IArticle[]}
                currentJournal={currentJournal}
                relatedVolumes={relatedVolumesData}
              />
              <div className="volumeDetails-content-results-content">
                {renderVolumeTitle(false)}
                {renderVolumeCommittee(false)}
                {volume?.types && volume?.types.includes(VOLUME_TYPE.PROCEEDINGS) && volume.settingsProceeding && volume.settingsProceeding.length && (
                  <div className="volumeDetails-content-results-content-proceedingSettings">
                    <div className='volumeDetails-content-results-content-proceedingSettings-setting'>{renderProceedingTheme()}</div>
                    {renderProceedingDOI() && (
                      <Link 
                        href={`${process.env.NEXT_PUBLIC_DOI_HOMEPAGE}/${renderProceedingDOI()}`} 
                        className='volumeDetails-content-results-content-proceedingSettings-setting volumeDetails-content-results-content-proceedingSettings-setting-doi' 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {renderProceedingDOI()}
                      </Link>
                    )}
                    <div className='volumeDetails-content-results-content-proceedingSettings-setting'>{renderProceedingLocation()}</div>
                    <div className='volumeDetails-content-results-content-proceedingSettings-setting'>{renderProceedingDates()}</div>
                  </div>
                )}
                {renderVolumeDescription()}
                <div className='volumeDetails-content-results-content-mobileCount'>
                  {articles.length > 1 ? `${articles.length} ${t('common.articles')}` : `${articles.length} ${t('common.article')}`}
                </div>
                {getEdito() && getEdito()!.content && getEdito()!.content![language] && (
                  <div className="volumeDetails-content-results-content-edito">
                    <div className="volumeDetails-content-results-content-edito-title">{getEdito()!.title![language]}</div>
                    <div className="volumeDetails-content-results-content-edito-content">{getEdito()!.content![language]}</div>
                    <div className='volumeDetails-content-results-content-edito-anchor'>
                      {getEdito()?.createdAt ? (
                        <div className="volumeDetails-content-results-content-edito-anchor-publicationDate">
                          {`${t('common.publishedOn')} ${formatDate(getEdito()!.createdAt!, language)}`}
                        </div>
                      ) : getEdito()?.updatedAt && (
                        <div className="volumeDetails-content-results-content-edito-anchor-publicationDate">
                          {`${t('common.publishedOn')} ${formatDate(getEdito()!.updatedAt!, language)}`}
                        </div>
                      )}
                      {getEdito()?.file && (
                        <div className="volumeDetails-content-results-content-edito-anchor-icons">
                          <a 
                            href={`https://${currentJournal?.code}.episciences.org/public/volumes/${volume?.id}/${getEdito()!.file!}`} 
                            target='_blank' 
                            rel="noopener noreferrer"
                          >
                            <div className="volumeDetails-content-results-content-edito-anchor-icons-download">
                              <img 
                                className="volumeDetails-content-results-content-edito-anchor-icons-download-download-icon" 
                                src="/icons/download-red.svg" 
                                alt='Download icon' 
                              />
                              <div className="volumeDetails-content-results-content-edito-anchor-icons-download-text">
                                {t('common.pdf')}
                              </div>
                            </div>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className='volumeDetails-content-results-content-cards'>
                  {articles?.filter((article) => article).map((article, index) => (
                    <VolumeArticleCard
                      key={index}
                      language={language}
                      t={t}
                      article={article as IArticle}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 