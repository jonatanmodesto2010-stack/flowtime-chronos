import { Sun, Moon, Menu, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { OrganizationSelector } from './OrganizationSelector';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Erro ao sair',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Logout realizado',
        description: 'Até logo!',
      });
      navigate('/auth');
    }
  };

  return (
    <motion.header 
      className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-sm"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <motion.button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </motion.button>
        )}
        <motion.h1 
          className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Time Line - ISP Manager
        </motion.h1>
      </div>

      <div className="flex items-center gap-3">
        <OrganizationSelector />
        
        <motion.button
          onClick={toggleTheme}
          className="p-2 bg-primary text-primary-foreground rounded-lg transition-colors"
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </motion.button>
        
        <motion.button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Logout"
          title="Sair"
        >
          <LogOut size={20} />
        </motion.button>
      </div>
    </motion.header>
  );
};
