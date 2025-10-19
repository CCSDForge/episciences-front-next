import { Fragment } from 'react';
import { Link } from '@/components/Link/Link';
import './Breadcrumb.scss';

interface IBreadcrumbProps {
  parents: {
    path: string;
    label: string;
  }[];
  crumbLabel: string;
}

export default function Breadcrumb({ parents, crumbLabel }: IBreadcrumbProps): JSX.Element {
  return (
    <div className="breadcrumb">
      {parents.map((parent, index) => (
        <Fragment key={index}>
          <span className="breadcrumb-parent">
            <Link href={`${parent.path}`}>{parent.label}</Link>
          </span>
          {' '}
        </Fragment>
      ))}
      {' '}
      <span className="breadcrumb-current">{crumbLabel}</span>
    </div>
  );
} 