'use client';

import { CloseBlackIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { TFunction } from 'i18next';

import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';
import Button from '@/components/Button/Button';
import Checkbox from '@/components/Checkbox/Checkbox';
import Tag from '@/components/Tag/Tag';
import './ArticlesAcceptedMobileModal.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

enum FILTERS_SECTION {
  TYPE = 'type',
}

interface IArticlesAcceptedTypeSelection {
  labelPath: string;
  value: string;
  isChecked: boolean;
}

interface IArticlesAcceptedFilter {
  value: string;
  labelPath: string;
}

interface IArticlesAcceptedMobileModalProps {
  t: TFunction<'translation', undefined>;
  initialTypes: IArticlesAcceptedTypeSelection[];
  onUpdateTypesCallback: (types: IArticlesAcceptedTypeSelection[]) => void;
  onCloseCallback: () => void;
}

export default function ArticlesAcceptedMobileModal({
  t,
  initialTypes,
  onUpdateTypesCallback,
  onCloseCallback,
}: IArticlesAcceptedMobileModalProps): React.JSX.Element {
  const dispatch = useAppDispatch();

  const isFooterEnabled = useAppSelector(state => state.footerReducer.enabled);

  const modalRef = useRef<HTMLDivElement>(null);

  const [openedSections, setOpenedSections] = useState<
    { key: FILTERS_SECTION; isOpened: boolean }[]
  >([{ key: FILTERS_SECTION.TYPE, isOpened: false }]);

  const [types, setTypes] = useState<IArticlesAcceptedTypeSelection[]>(initialTypes);
  const [taggedFilters, setTaggedFilters] = useState<IArticlesAcceptedFilter[]>([]);

  const onCheckType = (value: string): void => {
    const updatedTypes = types.map(t => {
      if (t.value === value) {
        return { ...t, isChecked: !t.isChecked };
      }

      return { ...t };
    });

    setTypes(updatedTypes);
  };

  const setAllTaggedFilters = useCallback((): void => {
    const initFilters: IArticlesAcceptedFilter[] = [];

    types
      .filter(t => t.isChecked)
      .forEach(t => {
        initFilters.push({
          value: t.value,
          labelPath: t.labelPath,
        });
      });

    setTaggedFilters(initFilters);
  }, [types]);

  const onCloseTaggedFilter = (value: string) => {
    const updatedTypes = types.map(t => {
      if (t.value === value) {
        return { ...t, isChecked: false };
      }
      return t;
    });

    setTypes(updatedTypes);
  };

  const clearTaggedFilters = useCallback((): void => {
    setTypes(prev =>
      prev.map(t => {
        return { ...t, isChecked: false };
      })
    );

    setTaggedFilters([]);
  }, []);

  const onClose = useCallback((): void => {
    clearTaggedFilters();
    onCloseCallback();
    dispatch(setFooterVisibility(true));
  }, [clearTaggedFilters, onCloseCallback, dispatch]);

  const onApplyFilters = (): void => {
    onUpdateTypesCallback(types);
    onCloseCallback();
    dispatch(setFooterVisibility(true));
  };

  useEffect(() => {
    setAllTaggedFilters();
  }, [setAllTaggedFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (isFooterEnabled) {
      dispatch(setFooterVisibility(false));
    }
  }, [isFooterEnabled, dispatch]);

  const toggleSection = (sectionKey: FILTERS_SECTION) => {
    const updatedSections = openedSections.map(section => {
      if (section.key === sectionKey) {
        return { ...section, isOpened: !section.isOpened };
      }

      return { ...section };
    });

    setOpenedSections(updatedSections);
  };

  const isOpenedSection = (sectionKey: FILTERS_SECTION): boolean | undefined =>
    openedSections.find(section => section.key === sectionKey)?.isOpened;

  return (
    <div className="articlesAcceptedMobileModal" ref={modalRef}>
      <div className="articlesAcceptedMobileModal-title">
        <div className="articlesAcceptedMobileModal-title-text">{t('common.filters.filter')}</div>
        <CloseBlackIcon
          size={24}
          className="articlesAcceptedMobileModal-title-close"
          ariaLabel="Close"
          onClick={onClose}
          onKeyDown={(e) => handleKeyboardClick(e, onClose)}
          role="button"
          tabIndex={0}
        />
      </div>
      {taggedFilters.length > 0 && (
        <div className="articlesAcceptedMobileModal-tags">
          <div className="articlesAcceptedMobileModal-tags-row">
            {taggedFilters.map((filter, index) => (
              <Tag
                key={index}
                text={t(filter.labelPath)}
                onCloseCallback={(): void => onCloseTaggedFilter(filter.value)}
              />
            ))}
          </div>
          <div
            className="articlesAcceptedMobileModal-tags-clear"
            role="button"
            tabIndex={0}
            onClick={clearTaggedFilters}
            onKeyDown={(e) => handleKeyboardClick(e, clearTaggedFilters)}
          >
            {t('common.filters.clearAll')}
          </div>
        </div>
      )}
      <div className="articlesAcceptedMobileModal-filters">
        <div className="articlesAcceptedMobileModal-filters-types">
          <div className="articlesAcceptedMobileModal-filters-types-title">
            <div
              className="articlesAcceptedMobileModal-filters-types-title-text"
              role="button"
              tabIndex={0}
              onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
              onKeyDown={(e) => handleKeyboardClick(e, () => toggleSection(FILTERS_SECTION.TYPE))}
            >
              {t('common.filters.documentTypes')}
            </div>
            {isOpenedSection(FILTERS_SECTION.TYPE) ? (
              <CaretUpGreyIcon
                size={16}
                className="articlesAcceptedMobileModal-filters-types-title-caret"
                ariaLabel="Collapse"
                onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
              />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className="articlesAcceptedMobileModal-filters-types-title-caret"
                ariaLabel="Expand"
                onClick={(): void => toggleSection(FILTERS_SECTION.TYPE)}
              />
            )}
          </div>
          <div
            className={`articlesAcceptedMobileModal-filters-types-list ${isOpenedSection(FILTERS_SECTION.TYPE) && 'articlesAcceptedMobileModal-filters-types-list-opened'}`}
          >
            {types.map((type, index) => (
              <div key={index} className="articlesAcceptedMobileModal-filters-types-list-choice">
                <div className="articlesAcceptedMobileModal-filters-types-list-choice-checkbox">
                  <Checkbox
                    checked={type.isChecked}
                    onChangeCallback={(): void => onCheckType(type.value)}
                  />
                </div>
                <span
                  className={`articlesAcceptedMobileModal-filters-types-list-choice-label ${type.isChecked && 'articlesAcceptedMobileModal-filters-types-list-choice-label-checked'}`}
                  role="button"
                  tabIndex={0}
                  onClick={(): void => onCheckType(type.value)}
                  onKeyDown={(e) => handleKeyboardClick(e, (): void => onCheckType(type.value))}
                >
                  {t(type.labelPath)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="articlesAcceptedMobileModal-submit">
        <Button
          text={t('common.filters.applyFilters')}
          onClickCallback={(): void => onApplyFilters()}
        />
      </div>
    </div>
  );
}
