'use client';

import ReactPaginate from 'react-paginate';
import './Pagination.scss';

import caretLeft from '../../../public/icons/caret-left-red.svg';
import caretRight from '../../../public/icons/caret-right-red.svg';
import caretLeftDisabled from '../../../public/icons/caret-left-grey-light.svg';
import caretRightDisabled from '../../../public/icons/caret-right-grey-light.svg';
import { DEFAULT_ITEMS_PER_PAGE } from '@/utils/pagination';

interface IPaginationProps {
  currentPage: number;
  itemsPerPage?: number;
  totalItems?: number;
  onPageChange: (selectedItem: { selected: number }) => void;
}

export default function Pagination({ currentPage, itemsPerPage, totalItems, onPageChange }: IPaginationProps): JSX.Element {
  const perPage = itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE;
  const pageCount = totalItems ? Math.ceil(totalItems / perPage) : 0;

  // Ne pas afficher la pagination s'il n'y a pas de pages
  if (pageCount === 0) {
    return <></>;
  }

  return (
    <ReactPaginate
      pageCount={pageCount}
      forcePage={Math.min(currentPage - 1, pageCount - 1)}
      onPageChange={onPageChange}
      className="pagination"
      pageClassName="pagination-page"
      previousClassName="pagination-previous"
      previousLabel={
        <img src={currentPage === 1 ? caretLeftDisabled : caretLeft} alt='Caret left icon' />
      }
      nextClassName="pagination-next"
      nextLabel={
        <img src={currentPage === pageCount ? caretRightDisabled : caretRight} alt='Caret right icon' />
      }
      activeClassName="pagination-page-active"
      pageRangeDisplayed={3}
      marginPagesDisplayed={2}
      breakClassName="pagination-break"
      disabledClassName="pagination-disabled"
      renderOnZeroPageCount={null}
    />
  );
} 