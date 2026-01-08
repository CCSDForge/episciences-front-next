import { AvailableLanguage } from '@/utils/i18n';

export interface IPage {
  id: number;
  title: Record<AvailableLanguage, string>;
  content: Record<AvailableLanguage, string>;
  rvcode: string;
  page_code: string;
}
