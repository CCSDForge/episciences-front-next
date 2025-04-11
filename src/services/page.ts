import { AvailableLanguage } from "@/utils/i18n";

export interface IPage {
  id: number;
  title: Record<AvailableLanguage, string>;
  content: Record<AvailableLanguage, string>;
  rvcode: string;
  page_code: string;
}

export async function fetchPage(pageCode: string, rvcode: string): Promise<IPage | undefined> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/pages?page_code=${pageCode}&rvcode=${rvcode}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch page with code ${pageCode}`);
  }
  
  const data: IPage[] = await response.json();
  return data.length > 0 ? data[0] : undefined;
} 