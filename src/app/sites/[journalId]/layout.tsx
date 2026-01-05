interface JournalLayoutProps {
  children: React.ReactNode;
  params: Promise<{ journalId: string }>;
}

// Revalidate strategy moved to individual pages for granular control
// Static pages (about, credits): revalidate = 86400 (24h)
// Dynamic pages (articles list): revalidate = 600 (10min)
// Article details: revalidate = 3600 (1h)

export default async function JournalLayout(props: JournalLayoutProps) {
  const params = await props.params;
  const { children } = props;

  return (
    <>
      {children}
    </>
  );
}
