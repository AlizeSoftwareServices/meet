export default function Loading() {
  return (
    <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      {/* Animated glowing spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary/50 border-b-transparent animate-pulse filter blur-[4px]"></div>
      </div>
      
      <div className="flex flex-col items-center gap-1">
        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 animate-pulse">
          Loading...
        </h3>
        <p className="text-sm text-muted-foreground font-medium">
          Preparing your workspace
        </p>
      </div>
    </div>
  );
}
