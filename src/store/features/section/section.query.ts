import { createApi } from '@reduxjs/toolkit/query/react';

import { RawSection, ISection } from '@/types/section';
import { PaginatedResponseWithCount } from '@/utils/pagination';
import { createBaseQueryWithLdJsonAccept } from '@/store/utils';

export const sectionApi = createApi({
  baseQuery: createBaseQueryWithLdJsonAccept,
  reducerPath: 'section',
  tagTypes: ['Section'],
  endpoints: build => ({
    fetchSections: build.query<
      { data: ISection[]; totalItems: number; articlesCount?: number },
      { rvcode: string; page: number; itemsPerPage: number }
    >({
      query: ({
        rvcode,
        page,
        itemsPerPage,
      }: {
        rvcode: string;
        page: number;
        itemsPerPage: number;
      }) => `sections?page=${page}&itemsPerPage=${itemsPerPage}&rvcode=${rvcode}`,
      transformResponse(baseQueryReturnValue: PaginatedResponseWithCount<RawSection>) {
        const articlesCount = baseQueryReturnValue['hydra:totalPublishedArticles'];

        const totalItems = baseQueryReturnValue['hydra:totalItems'];
        const formattedData = baseQueryReturnValue['hydra:member'].map(section => ({
          ...section,
          id: section.sid,
          title: section.titles,
          description: section.descriptions,
          articles: section.papers,
        }));

        return {
          data: formattedData,
          totalItems,
          articlesCount,
        };
      },
    }),
    fetchSection: build.query<ISection, { sid: string }>({
      query: ({ sid }: { sid: string }) => `sections/${sid}`,
      transformResponse(baseQueryReturnValue: RawSection) {
        return {
          ...baseQueryReturnValue,
          title: baseQueryReturnValue.titles,
          description: baseQueryReturnValue.descriptions,
          articles: baseQueryReturnValue.papers,
        };
      },
    }),
  }),
});

export const { useFetchSectionsQuery, useFetchSectionQuery } = sectionApi;
