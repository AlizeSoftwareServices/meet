export function generateStaticParams() {
  return [
    { username: 'me' },
    { username: 'demo' },
  ];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
