import { Home, Calendar, Map, BarChart3, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const menuItems = [
    { icon: Home, label: 'Dashboard', active: true },
    { icon: Calendar, label: 'Calendário', active: false },
    { icon: Map, label: 'Mapas', active: false },
    { icon: BarChart3, label: 'Analytics', active: false },
    { icon: Filter, label: 'Filtros', active: false },
  ];

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
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed lg:sticky top-0 left-0 h-screen w-[280px] bg-card border-r border-border z-50 lg:z-30 flex flex-col"
      >
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
            {menuItems.map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Filters Section */}
          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 px-4">
              Filtros Rápidos
            </h3>
            <div className="space-y-1">
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted rounded-lg transition-colors">
                ⚫ Criados
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted rounded-lg transition-colors">
                ✅ Resolvidos
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-muted rounded-lg transition-colors">
                ❌ Sem Resposta
              </button>
            </div>
          </div>
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Sistema de Gestão ISP</p>
            <p>v1.0.0 - 2025</p>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
