interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function SkipLink({ href, children }: SkipLinkProps): React.JSX.Element {
  return (
    <a href={href} className="skip-link">
      {children}
    </a>
  );
}
