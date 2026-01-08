import { AvailableLanguage } from "@/utils/i18n";
import { getJournalApiUrl } from "@/utils/env-loader";

export interface IPage {
  id: number;
  title: Record<AvailableLanguage, string>;
  content: Record<AvailableLanguage, string>;
  rvcode: string;
  page_code: string;
}

export async function fetchPage(pageCode: string, rvcode: string): Promise<IPage | undefined> {
  const apiUrl = getJournalApiUrl(rvcode);
  const response = await fetch(
    `${apiUrl}/pages?page_code=${pageCode}&rvcode=${rvcode}`,
    { next: { tags: ['pages', `page-${pageCode}`, `page-${pageCode}-${rvcode}`] } }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch page with code ${pageCode}`);
  }
  
  const data: IPage[] = await response.json();
  return data.length > 0 ? data[0] : undefined;
} 