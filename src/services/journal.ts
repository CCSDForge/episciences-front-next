import { API_URL } from '@/config/api';
import { IJournal } from '@/types/journal';

interface Journal {
  code: string;
  name: string;
  description?: string;
  url?: string;
  logo?: string;
}

export const getJournalCode = (): string => {
  return process.env.NEXT_PUBLIC_JOURNAL_CODE || '';
};

export const getJournal = async (): Promise<IJournal> => {
  const journalCode = getJournalCode();
  const response = await fetch(`${API_URL}/journals/${journalCode}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch journal with code ${journalCode}`);
  }
  return response.json();
};

export const fetchJournalWithoutCode = async (): Promise<IJournal | null> => {
  try {
    return await getJournal();
  } catch (error) {
    console.error('Error fetching journal:', error);
    return null;
  }
};

export async function getJournalByCode(rvcode: string): Promise<IJournal> {
 // console.log('getJournalByCode', rvcode);
 // console.log(`${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/journals/${rvcode}`);
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/journals/${rvcode}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch journal with code ${rvcode}`);
  }

  const data = await response.json();
  return {
    ...data,
    id: data.rvid
  };
}

export async function fetchJournal(rvcode: string): Promise<IJournal> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/journals/${rvcode}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch journal with code ${rvcode}`);
    }

    const data = await response.json();
    return {
      ...data,
      id: data.rvid
    };
  } catch (error) {
    console.error('Error fetching journal:', error);
    throw error;
  }
} 