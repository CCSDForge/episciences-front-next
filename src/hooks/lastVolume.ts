'use client';

import { useEffect } from "react";

import { useFetchVolumesQuery } from "@/store/features/volume/volume.query";
import { setLastVolume } from "@/store/features/volume/volume.slice";
import { useAppDispatch, useAppSelector } from "@/hooks/store";

function LastVolumeHook (): null {
  const dispatch = useAppDispatch();

  const language = useAppSelector(state => state.i18nReducer.language)
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);
  const lastVolume = useAppSelector(state => state.volumeReducer.lastVolume);

  const { data: volumes } = useFetchVolumesQuery({ rvcode: currentJournal?.code!, language: language, page: 1, itemsPerPage: 1 }, { skip: !currentJournal?.code });

  useEffect(() => {
    if (volumes && volumes.data.length > 0 && currentJournal && !lastVolume) {
      const foundVolume = volumes.data[0];
      dispatch(setLastVolume(foundVolume));
    }
  }, [dispatch, volumes, currentJournal, lastVolume]);

  return null;
}

export default LastVolumeHook; 