import Loader from '@/components/Loader/Loader';

export default function Loading() {
  return (
    <div className="article-details">
      <div className="article-details-loader">
        <Loader />
      </div>
    </div>
  );
}
