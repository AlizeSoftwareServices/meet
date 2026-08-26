export function generateStaticParams() {
  return [
    { username: 'me', slug: '15min' },
    { username: 'me', slug: '30min' },
    { username: 'demo', slug: '15min' },
    { username: 'demo', slug: '30min' },
  ];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
