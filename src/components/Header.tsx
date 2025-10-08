import { Sun, Moon, Menu, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  theme: string;
  onToggleTheme: () => void;
  onToggleSidebar?: () => void;
}

export const Header = ({ theme, onToggleTheme, onToggleSidebar }: HeaderProps) => {
  const navigate = useNavigate();
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
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>
        )}
        <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Time Line - ISP Manager
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          aria-label="Logout"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
