import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/settings/UserManagement';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { UserProfile } from '@/components/settings/UserProfile';
import { TagsManagement } from '@/components/settings/TagsManagement';
import { HistorySettings } from '@/components/settings/HistorySettings';
import { ColorThemeSettings } from '@/components/settings/ColorThemeSettings';
import { IconsManagement } from '@/components/settings/IconsManagement';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { canManageUsers, canManageSettings, isLoading } = useUserRole();
  const navigate = useNavigate();


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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
        
        <main className="container mx-auto px-4 py-8 flex-1">
          <h1 className="text-3xl font-bold mb-8">Configurações</h1>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="users">Usuários</TabsTrigger>
            )}
              {canManageSettings && (
                <>
                  <TabsTrigger value="general">Geral</TabsTrigger>
                  <TabsTrigger value="colors">Paleta de Cores</TabsTrigger>
                  <TabsTrigger value="tags">Tags</TabsTrigger>
                  <TabsTrigger value="icons">Ícones</TabsTrigger>
                </>
              )}
            <TabsTrigger value="history">Histórico</TabsTrigger>
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
              <>
                <TabsContent value="general">
                  <GeneralSettings />
                </TabsContent>
                <TabsContent value="colors">
                  <ColorThemeSettings />
                </TabsContent>
                <TabsContent value="tags">
                  <TagsManagement />
                </TabsContent>
                <TabsContent value="icons">
                  <IconsManagement />
                </TabsContent>
              </>
            )}

          <TabsContent value="history">
            <HistorySettings />
          </TabsContent>
        </Tabs>
        </main>
      </div>
    </div>
  </SidebarProvider>
  );
};

export default Settings;
