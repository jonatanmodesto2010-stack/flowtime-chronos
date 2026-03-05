import { motion } from 'framer-motion';

export const CalendarSkeleton = () => {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="h-9 w-64 bg-muted animate-pulse rounded mb-2" />
        <div className="h-5 w-80 bg-muted animate-pulse rounded" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="h-4 w-24 bg-muted animate-pulse rounded mb-3" />
            <div className="h-8 w-12 bg-muted animate-pulse rounded" />
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-muted animate-pulse rounded-md" />
          <div className="w-48 h-10 bg-muted animate-pulse rounded-md" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-card border border-border rounded-xl p-4">
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
        </div>
        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="h-6 bg-muted/50 animate-pulse rounded" />
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.01 }}
              className="h-16 bg-muted/30 animate-pulse rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
