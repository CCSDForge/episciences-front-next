'use client';

import { TFunction } from 'i18next';
import { Swiper as SwiperReactLib, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import { useEffect, useState } from 'react';
import { AvailableLanguage } from '@/utils/i18n';
import Card, { SwiperCardType, SwiperCardContent } from '@/components/SwiperCards/SwiperCard';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import './Swiper.scss';

// Importation des icônes comme dans la version originale
// (mais avec le chemin ajusté pour Next.js)
const caretLeft = '/icons/caret-left-red.svg';
const caretRight = '/icons/caret-right-red.svg';

interface ISwiperProps {
  id: string;
  type: SwiperCardType;
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>;
  slidesPerView: number;
  slidesPerGroup: number;
  cards: SwiperCardContent[];
}

export default function Swiper({ id, type, language, t, slidesPerView, slidesPerGroup, cards }: ISwiperProps): JSX.Element {
  // État pour stocker l'information si l'écran est mobile ou tablet
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    // Fonction pour déterminer si l'écran est mobile ou tablette
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    // Initialiser
    checkDevice();
    
    // Écouter les redimensionnements
    window.addEventListener('resize', checkDevice);
    
    // Nettoyage
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Fonction pour filtrer les cartes comme dans la version d'origine
  const getRenderedCards = (): SwiperCardContent[] => {
    const filteredCards = cards.filter(Boolean);
    
    if (isMobile) {
      return filteredCards.slice(0, 4);
    }

    if (isTablet) {
      return filteredCards.slice(0, 8);
    }

    return filteredCards;
  };

  // Si aucune carte à afficher, ne rien rendre
  if (!cards || cards.length === 0) {
    return <></>;
  }

  return (
    <>
      <div className="swiper-page-wrapper">
        <div className={`${id}-button-prev swiper-button-prev`}>
          <img className="swiper-button-prev-icon" src={caretLeft} alt="Caret left icon" />
        </div>
        <SwiperReactLib
          slidesPerView={slidesPerView}
          slidesPerGroup={slidesPerGroup}
          spaceBetween={15}
          modules={[Pagination, Navigation]}
          pagination={{
            el: `.${id}-pagination`,
            clickable: true
          }}
          navigation={{
            prevEl: `.${id}-button-prev`,
            nextEl: `.${id}-button-next`,
          }}
          breakpoints={{
            0: {
              slidesPerView: 1,
              slidesPerGroup: 1,
            },
            480: {
              slidesPerView: 2,
              slidesPerGroup: 2
            },
            1368: {
              slidesPerView: slidesPerView,
              slidesPerGroup: slidesPerGroup
            }
          }}
        >
          {getRenderedCards().map((content: SwiperCardContent, key: number) => (
            <SwiperSlide key={key}>
              <Card language={language} t={t} type={type} content={content} />
            </SwiperSlide>
          ))}
        </SwiperReactLib>
        <div className={`${id}-button-next swiper-button-next`}>
          <img className="swiper-button-next-icon" src={caretRight} alt="Caret right icon" />
        </div>
      </div>
      <div className={`${id}-pagination swiper-pagination`}></div>
    </>
  );
} 