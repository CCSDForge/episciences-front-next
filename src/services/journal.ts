import { API_URL } from '@/config/api';
import { IJournal } from '@/types/journal';
import { getJournalApiUrl } from '@/utils/env-loader';

interface Journal {
  code: string;
  name: string;
  description?: string;
  url?: string;
  logo?: string;
}

export const getJournalCode = (): string => {
  const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
  if (!rvcode) {
    throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
  }
  return rvcode;
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
  const apiUrl = getJournalApiUrl(rvcode);
  // console.log(`${apiUrl}/journals/${rvcode}`);
  const response = await fetch(`${apiUrl}/journals/${rvcode}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch journal with code ${rvcode}`);
  }

  const data = await response.json();
  return {
    ...data,
    id: data.rvid,
  };
}

export async function fetchJournal(rvcode: string): Promise<IJournal> {
  try {
    const apiUrl = getJournalApiUrl(rvcode);
    const response = await fetch(`${apiUrl}/journals/${rvcode}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch journal with code ${rvcode}`);
    }

    const data = await response.json();
    return {
      ...data,
      id: data.rvid,
    };
  } catch (error) {
    console.error('Error fetching journal:', error);
    throw error;
  }
}
