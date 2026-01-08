export interface MenuItem {
  key: string;
  render: boolean;
  label: string;
  path: string;
  icon?: string;
}

export const menuItems: MenuItem[] = [
  {
    key: 'ACCEPTED_ARTICLES',
    render: true,
    label: 'components.header.links.articlesAccepted',
    path: '/articles/accepted',
  },
  {
    key: 'VOLUMES',
    render: true,
    label: 'components.header.links.volumes',
    path: '/volumes',
  },
  {
    key: 'LAST_VOLUME',
    render: true,
    label: 'components.header.links.lastVolume',
    path: '/volumes/:id',
  },
  {
    key: 'SECTIONS',
    render: true,
    label: 'components.header.links.sections',
    path: '/sections',
  },
  {
    key: 'SPECIAL_ISSUES',
    render: true,
    label: 'components.header.links.specialIssues',
    path: '/volumes?type=special',
  },
  {
    key: 'NEWS',
    render: true,
    label: 'components.header.links.news',
    path: '/news',
  },
  {
    key: 'STATISTICS',
    render: true,
    label: 'components.header.links.statistics',
    path: '/statistics',
  },
  {
    key: 'BOARDS',
    render: true,
    label: 'components.header.links.boards',
    path: '/boards',
  },
  {
    key: 'FOR_AUTHORS',
    render: true,
    label: 'components.header.links.forAuthors',
    path: '/for-authors',
  },
];

export const shouldRenderMenuItem = (key: string): boolean => {
  const item = menuItems.find(item => item.key === key);
  return item?.render ?? false;
};
