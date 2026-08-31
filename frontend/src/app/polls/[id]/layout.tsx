export function generateStaticParams() {
  return [
    { id: '1' },
    { id: 'demo' },
  ];
}

export default function PollLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
