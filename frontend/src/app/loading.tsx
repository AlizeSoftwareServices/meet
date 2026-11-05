import { MeetLoader } from '@/components/ui/meet-loader';

export default function RootLoading() {
  return (
    <div className="w-full h-screen min-h-screen flex items-center justify-center bg-background">
      <MeetLoader size="xl" variant="brand" text="Loading Meet..." />
    </div>
  );
}

