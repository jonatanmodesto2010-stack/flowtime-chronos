import { motion } from 'framer-motion';

export const TimelineSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-card border border-border rounded-xl p-6 shadow-lg"
    >
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
            <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>

        {/* Timeline line skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 py-4">
            <div className="h-12 w-12 bg-muted animate-pulse rounded-full" />
            <div className="flex-1 h-1 bg-muted animate-pulse" />
            <div className="h-12 w-12 bg-muted animate-pulse rounded-full" />
            <div className="flex-1 h-1 bg-muted animate-pulse" />
            <div className="h-12 w-12 bg-muted animate-pulse rounded-full" />
          </div>
          
          <div className="flex justify-between gap-4">
            <div className="h-16 flex-1 bg-muted animate-pulse rounded-lg" />
            <div className="h-16 flex-1 bg-muted animate-pulse rounded-lg" />
            <div className="h-16 flex-1 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
