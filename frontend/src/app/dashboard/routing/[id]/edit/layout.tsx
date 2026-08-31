export function generateStaticParams() {
  return [
    { id: '1' },
    { id: 'demo' },
  ];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
