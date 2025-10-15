import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ClientDashboardModal } from '@/components/ClientDashboardModal';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import type { User } from '@supabase/supabase-js';

interface Client {
  id: string;
  client_name: string;
  client_id?: string | null;
  start_date: string;
  boleto_value?: string | null;
  due_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  organization_id?: string;
}

const Clients = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useUserRole();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate('/auth');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (organizationId) {
      loadClients();
    }
  }, [organizationId]);

  const loadClients = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('client_timelines')
        .select('*')
        .eq('organization_id', organizationId)
        .order('client_name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client: Client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedClient(null);
  };

  const handleSaveClient = async (updatedData: Partial<Client>) => {
    if (!selectedClient) return;

    try {
      const { error } = await supabaseClient
        .from('client_timelines')
        .update(updatedData)
        .eq('id', selectedClient.id);

      if (error) throw error;

      await loadClients();
      
      toast({
        title: 'Cliente atualizado',
        description: 'As informações foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-background">
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <div className="flex flex-1 w-full">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="h-9 w-48 bg-muted animate-pulse rounded mb-6" />
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <Header 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex flex-1 w-full">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 p-6 overflow-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Clientes
            </h2>

            {clients.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p>Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {clients.map((client, index) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-lg p-4 flex items-center gap-4 bg-card hover:bg-card/80 transition-colors cursor-pointer"
                    onClick={() => handleOpenModal(client)}
                  >
                    <motion.div
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-secondary/90"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Pencil className="w-5 h-5 text-secondary-foreground" />
                    </motion.div>

                    <div className="flex-1">
                      <h3 className="text-card-foreground font-bold text-lg uppercase tracking-wide">
                        {client.client_name}
                      </h3>
                      {client.client_id && (
                        <p className="text-xs text-muted-foreground">ID: {client.client_id}</p>
                      )}
                    </div>

                    {!client.is_active && (
                      <div className="px-2 py-1 bg-red-500/20 text-red-500 text-xs rounded">
                        Inativo
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </main>
      </div>

      {selectedClient && (
        <ClientDashboardModal
          client={selectedClient}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveClient}
        />
      )}
    </div>
  );
};

export default Clients;