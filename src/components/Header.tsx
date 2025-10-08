import { Sun, Moon, Menu } from 'lucide-react';

interface HeaderProps {
  theme: string;
  onToggleTheme: () => void;
  onToggleSidebar?: () => void;
}

export const Header = ({ theme, onToggleTheme, onToggleSidebar }: HeaderProps) => {
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
      </div>
    </header>
  );
};
