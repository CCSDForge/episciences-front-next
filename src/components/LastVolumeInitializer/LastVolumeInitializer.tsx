'use client';

import { useEffect } from 'react';
import { setLastVolume } from '@/store/features/volume/volume.slice';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { IVolume } from '@/types/volume';

interface LastVolumeInitializerProps {
  initialVolume?: IVolume;
}

export function LastVolumeInitializer({ initialVolume }: LastVolumeInitializerProps): null {
  const dispatch = useAppDispatch();
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);
  const lastVolume = useAppSelector(state => state.volumeReducer.lastVolume);

  useEffect(() => {
    // Si nous avons un volume initial et qu'aucun volume n'est déjà défini dans le store
    if (initialVolume && currentJournal && !lastVolume) {
      dispatch(setLastVolume(initialVolume));
    }
  }, [dispatch, initialVolume, currentJournal, lastVolume]);

  return null;
}
