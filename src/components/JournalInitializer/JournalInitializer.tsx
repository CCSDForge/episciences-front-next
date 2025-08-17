'use client';

import { useEffect } from 'react';
import { useFetchJournalQuery } from '@/store/features/journal/journal.query';
import { setCurrentJournal } from '@/store/features/journal/journal.slice';
import { useAppDispatch, useAppSelector } from '@/store';
import { AvailableLanguage } from '@/utils/i18n';

export function JournalInitializer() {
  const dispatch = useAppDispatch();
  const currentJournal = useAppSelector((state) => state.journalReducer.currentJournal);
  const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || '';
  
  // Utiliser RTK Query pour récupérer le journal
  const { data: journal, error, isLoading, refetch } = useFetchJournalQuery(rvcode, {
    // Réessayer jusqu'à 3 fois en cas d'erreur
    pollingInterval: 0,
    refetchOnMountOrArgChange: true,
  });

  // Créer un journal par défaut pour le build statique
  const createDefaultJournal = () => {
    const journalName = process.env.NEXT_PUBLIC_JOURNAL_NAME || '[Pre-Production] Journal Epijinfo fake journalInitializer';
    return {
      id: parseInt(process.env.NEXT_PUBLIC_JOURNAL_ID || '3'),
      code: process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo',
      name: journalName,
      title: { fr: journalName, en: journalName } as Record<AvailableLanguage, string>,
      settings: [],
    };
  };

  // Effet pour initialiser le journal dans le store
  useEffect(() => {
    // Si nous avons les données du journal, les stocker dans Redux
    if (journal && !isLoading) {
      dispatch(setCurrentJournal(journal));
    }
    // Si nous sommes en build statique et n'avons pas de données, utiliser un fallback
    else if (typeof window === 'undefined' && !journal && !isLoading) {
      // Utiliser le journal par défaut pour le build statique
      dispatch(setCurrentJournal(createDefaultJournal()));
    }
  }, [journal, dispatch, isLoading]);

  // Gérer les erreurs de récupération du journal
  useEffect(() => {
    if (error) {
      // En cas d'erreur et absence de journal dans le store, utiliser un fallback
      if (!currentJournal) {
        dispatch(setCurrentJournal(createDefaultJournal()));
      }
      
      // Attendre 2 secondes et réessayer
      const timer = setTimeout(() => {
        refetch();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [error, refetch, currentJournal, dispatch]);

  return null;
} 