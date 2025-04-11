import { TFunction } from 'i18next';

export enum BOARD_TYPE {
  EDITORIAL_BOARD = 'editorial-board',
  TECHNICAL_BOARD = 'technical-board',
  SCIENTIFIC_ADVISORY_BOARD = 'scientific-advisory-board',
  FORMER_MEMBERS = 'former-members'
}

export const boardTypes = [
  BOARD_TYPE.EDITORIAL_BOARD,
  BOARD_TYPE.TECHNICAL_BOARD,
  BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD,
  BOARD_TYPE.FORMER_MEMBERS
]

export enum BOARD_ROLE {
  MEMBER = 'member',
  GUEST_EDITOR = 'guest-editor',
  EDITOR = 'editor',
  CHIEF_EDITOR = 'chief-editor',
  SECRETARY = 'secretary',
  FORMER_MEMBER = 'former-member'
}

export const defaultBoardRole = (t: TFunction<"translation", undefined>) => {
  return {
    key: BOARD_ROLE.MEMBER,
    label: t('pages.boards.roles.member')
  }
}

export const getBoardRoles = (t: TFunction<"translation", undefined>, roles: string[]): string => {
  const rolesWithLabels = [
    { key: BOARD_TYPE.TECHNICAL_BOARD, label: t('pages.boards.types.technicalBoard') },
    { key: BOARD_TYPE.EDITORIAL_BOARD, label: t('pages.boards.types.editorialBoard') },
    { key: BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD, label: t('pages.boards.types.scientificAdvisoryBoard') },
    { key: BOARD_TYPE.FORMER_MEMBERS, label: t('pages.boards.types.formerMember') },
    { key: BOARD_ROLE.GUEST_EDITOR, label: t('pages.boards.roles.guestEditor') },
    { key: BOARD_ROLE.EDITOR, label: t('pages.boards.roles.editor') },
    { key: BOARD_ROLE.CHIEF_EDITOR, label: t('pages.boards.roles.chiefEditor') },
    { key: BOARD_ROLE.SECRETARY, label: t('pages.boards.roles.secretary') },
    { key: BOARD_ROLE.FORMER_MEMBER, label: t('pages.boards.roles.formerMember') }
  ]

  return rolesWithLabels.filter(roleWithLabel => roles.includes(roleWithLabel.key)).map(roleWithLabel => roleWithLabel.label).join(', ')
} 