import { IPage } from '@/types/page';
import { getJournalCode } from './journal';

/**
 * Récupère la page du workflow éditorial
 * @returns La page du workflow éditorial
 */
export async function fetchEditorialWorkflowPage(): Promise<IPage> {
  const rvcode = getJournalCode();
  const url = `${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/journal/${rvcode}/pages/editorial-workflow`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération de la page du workflow éditorial: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération de la page du workflow éditorial:', error);
    throw error;
  }
}

/**
 * Récupère la page de la charte éthique
 * @returns La page de la charte éthique
 */
export async function fetchEthicalCharterPage(): Promise<IPage> {
  const rvcode = getJournalCode();
  const url = `${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/journal/${rvcode}/pages/ethical-charter`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération de la page de la charte éthique: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération de la page de la charte éthique:', error);
    throw error;
  }
}

/**
 * Récupère la page de préparation des soumissions
 * @returns La page de préparation des soumissions
 */
export async function fetchPrepareSubmissionPage(): Promise<IPage> {
  const rvcode = getJournalCode();
  const url = `${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/journal/${rvcode}/pages/prepare-submission`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération de la page de préparation des soumissions: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération de la page de préparation des soumissions:', error);
    throw error;
  }
} 