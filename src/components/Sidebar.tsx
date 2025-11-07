import { useState } from 'react';
import { Calendar, Settings, Users, X, ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_NAME, getFullVersion, BUILD_VERSION } from '@/config/version';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: Users, label: 'Clientes', path: '/clients', active: location.pathname === '/clients' },
    { icon: Calendar, label: 'Calendário', path: '/calendar', active: location.pathname === '/calendar' },
    { icon: Settings, label: 'Configurações', path: '/settings', active: location.pathname === '/settings' },
  ];

  const handleNavigation = (path: string) => {
    if (path !== '#') {
      navigate(path);
      // Só fecha no mobile
      if (window.innerWidth < 1024) {
        onClose();
      }
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          x: typeof window !== 'undefined' && window.innerWidth >= 1024 
            ? 0 
            : isOpen ? 0 : (isCollapsed ? -70 : -280)
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`fixed lg:sticky top-0 left-0 h-screen ${isCollapsed ? 'w-[70px]' : 'w-[280px]'} bg-card border-r border-border z-50 lg:z-30 flex flex-col transition-all duration-300`}
      >
        {/* Toggle Collapse Button - Desktop only */}
        <div className="hidden lg:flex justify-end p-2 border-b border-border">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Close button - Mobile only */}
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.03, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon size={20} />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </motion.button>
            ))}
          </div>
        </nav>

        {/* Footer Info */}
        <motion.div 
          className="p-4 border-t border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {!isCollapsed ? (
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-1">{APP_NAME}</p>
              <p>{getFullVersion()}</p>
              <p className="text-[10px] opacity-70">Build: {BUILD_VERSION}</p>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center">
              <p className="font-semibold">v{BUILD_VERSION}</p>
            </div>
          )}
        </motion.div>
      </motion.aside>
    </>
  );
};
