import { motion } from 'framer-motion';

export const ClientsListSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Search bar skeleton */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 h-10 bg-muted animate-pulse rounded-md" />
        <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 w-8 bg-muted animate-pulse rounded" />
          ))}
          <div className="h-4 w-20 bg-muted animate-pulse rounded ml-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
          <div className="h-9 w-32 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>

      {/* Client cards skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: i * 0.03 }}
            className="w-full rounded-lg p-4 flex items-center gap-4 bg-card"
          >
            <div className="flex-1">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-20 bg-muted animate-pulse rounded" />
              <div className="h-9 w-9 bg-muted animate-pulse rounded" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
