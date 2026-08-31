export function generateStaticParams() {
  return [
    { username: 'me', slug: 'sales' },
    { username: 'demo', slug: 'intake' },
  ];
}

export default function FormsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
