import { MeetLoader } from '@/components/ui/meet-loader';

export default function DashboardLoading() {
  return (
    <div className="w-full h-full min-h-[65vh] flex items-center justify-center">
      <MeetLoader size="lg" variant="brand" text="Preparing your workspace..." />
    </div>
  );
}
