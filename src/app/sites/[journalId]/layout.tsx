interface JournalLayoutProps {
  children: React.ReactNode;
  params: { journalId: string };
}

export const revalidate = 60; // Revalidate every minute

export default async function JournalLayout({
  children,
  params,
}: JournalLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}
