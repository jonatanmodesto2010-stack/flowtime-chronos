import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/settings/UserManagement';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { UserProfile } from '@/components/settings/UserProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState('light');
  const { canManageUsers, canManageSettings, isLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setIsAuthenticated(true);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!isAuthenticated || isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        theme={theme} 
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setIsSidebarOpen(true)}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Configurações</h1>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="users">Usuários</TabsTrigger>
            )}
            {canManageSettings && (
              <TabsTrigger value="general">Geral</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>

          {canManageUsers && (
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          )}

          {canManageSettings && (
            <TabsContent value="general">
              <GeneralSettings />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
