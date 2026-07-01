'use client';

import React, { memo } from 'react';
import ReactPaginate from 'react-paginate';
import { useTranslation } from 'react-i18next';
import {
  CaretLeftBlackIcon,
  CaretLeftGreyLightIcon,
  CaretRightBlackIcon,
  CaretRightGreyLightIcon,
} from '@/components/icons';
import { DEFAULT_ITEMS_PER_PAGE } from '@/utils/pagination';
import './Pagination.scss';

interface IPaginationProps {
  currentPage: number;

  itemsPerPage?: number;

  totalItems?: number;

  onPageChange: (selectedItem: { selected: number }) => void;
}

const Pagination = memo(function Pagination({
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
}: IPaginationProps): React.JSX.Element {
  const { t } = useTranslation();
  const perPage = itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE;

  const pageCount = totalItems ? Math.ceil(totalItems / perPage) : 0;

  // Ne pas afficher la pagination s'il n'y a pas de pages ou une seule page

  if (pageCount <= 1) {
    return <></>;
  }

  // Ensure forcePage is valid

  const forcePage = Math.max(0, Math.min(currentPage - 1, pageCount - 1));

  // Note: ReactPaginate already renders <ul role="navigation" aria-label="Pagination">,
  // so no extra <nav> wrapper is needed (it would create a duplicate landmark).
  return (
    <ReactPaginate
      pageCount={pageCount}
      forcePage={forcePage}
      onPageChange={onPageChange}
      className="pagination"
      pageClassName="pagination-page"
      previousClassName="pagination-previous"
      previousAriaLabel={
        currentPage === 1
          ? t('components.pagination.previousDisabled')
          : t('components.pagination.previous')
      }
      previousLabel={
        currentPage === 1 ? <CaretLeftGreyLightIcon size={16} /> : <CaretLeftBlackIcon size={16} />
      }
      nextClassName="pagination-next"
      nextAriaLabel={
        currentPage === pageCount
          ? t('components.pagination.nextDisabled')
          : t('components.pagination.next')
      }
      nextLabel={
        currentPage === pageCount ? (
          <CaretRightGreyLightIcon size={16} />
        ) : (
          <CaretRightBlackIcon size={16} />
        )
      }
      ariaLabelBuilder={pageNumber => t('components.pagination.page', { number: pageNumber })}
      activeClassName="pagination-page-active"
      pageRangeDisplayed={3}
      marginPagesDisplayed={2}
      breakClassName="pagination-break"
      disabledClassName="pagination-disabled"
      renderOnZeroPageCount={null}
    />
  );
});

export default Pagination;
