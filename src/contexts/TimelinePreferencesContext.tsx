import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type TimelineLayout = 'classic' | 'modern';

interface TimelinePreferences {
  layout: TimelineLayout;
  setLayout: (layout: TimelineLayout) => void;
}

const TimelinePreferencesContext = createContext<TimelinePreferences | undefined>(undefined);

export const TimelinePreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [layout, setLayoutState] = useState<TimelineLayout>(() => {
    const saved = localStorage.getItem('timeline-layout');
    return (saved as TimelineLayout) || 'modern';
  });

  const setLayout = (newLayout: TimelineLayout) => {
    setLayoutState(newLayout);
    localStorage.setItem('timeline-layout', newLayout);
  };

  return (
    <TimelinePreferencesContext.Provider value={{ layout, setLayout }}>
      {children}
    </TimelinePreferencesContext.Provider>
  );
};

export const useTimelinePreferences = () => {
  const context = useContext(TimelinePreferencesContext);
  if (!context) {
    throw new Error('useTimelinePreferences must be used within TimelinePreferencesProvider');
  }
  return context;
};
