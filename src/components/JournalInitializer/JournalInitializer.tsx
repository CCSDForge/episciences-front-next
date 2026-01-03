'use client';

import { useEffect } from 'react';
import { useFetchJournalQuery } from '@/store/features/journal/journal.query';
import { setCurrentJournal } from '@/store/features/journal/journal.slice';
import { useAppDispatch, useAppSelector } from '@/store';
import { AvailableLanguage } from '@/utils/i18n';

export function JournalInitializer({ journalId }: { journalId?: string }) {
  const dispatch = useAppDispatch();
  const currentJournal = useAppSelector((state) => state.journalReducer.currentJournal);
  
  // Use the provided journalId, or fallback to env var (for backward compatibility during migration)
  const rvcode = journalId || process.env.NEXT_PUBLIC_JOURNAL_RVCODE || '';
  
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
      // Eviter les mises à jour infinies si l'objet journal n'est pas stable référentiellement
      // On compare l'ID ou le code pour savoir si c'est vraiment un changement
      const shouldUpdate = !currentJournal || currentJournal.code !== journal.code;
      
      if (shouldUpdate) {
        console.log('[JournalInitializer] Updating journal in store:', journal.code);
        dispatch(setCurrentJournal(journal));
      } else {
        // console.log('[JournalInitializer] Journal already up to date:', journal.code);
      }
    }
  }, [journal, dispatch, isLoading, currentJournal]);

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