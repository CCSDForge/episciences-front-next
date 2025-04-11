'use client';

import { TFunction } from "i18next";

import { AvailableLanguage } from "@/utils/i18n";
import SwiperArticleCard, { SwiperArticleCardProps } from "./SwiperArticleCard/SwiperArticleCard";
import SwiperArticleAcceptedCard, { SwiperArticleAcceptedCardProps } from "./SwiperArticleAcceptedCard/SwiperArticleAcceptedCard";
import SwiperBoardCard, { SwiperBoardCardProps } from "./SwiperBoardCard/SwiperBoardCard";

export type SwiperCardType = 'article' | 'board' | 'article-accepted';

export type SwiperCardContent = SwiperArticleCardProps | SwiperArticleAcceptedCardProps | SwiperBoardCardProps;

export interface ISwiperCardProps {
  type: SwiperCardType;
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>
  content: SwiperCardContent;
}

export default function Card({ type, language, t, content }: ISwiperCardProps): JSX.Element {
  if (type === 'board') {
    return <SwiperBoardCard language={language} t={t} member={content as SwiperBoardCardProps} />
  }

  if (type === 'article-accepted') {
    return <SwiperArticleAcceptedCard language={language} t={t} article={content as SwiperArticleAcceptedCardProps} />
  }

  return <SwiperArticleCard language={language} t={t} article={content as SwiperArticleCardProps} />
} 