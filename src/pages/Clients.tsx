import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import type { User } from '@supabase/supabase-js';

interface Client {
  id: string;
  client_id: string | null;
  client_name: string;
  start_date: string;
  boleto_value: number | null;
  due_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const Clients = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useUserRole();
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    client_name: '',
    start_date: '',
    boleto_value: '',
    due_date: '',
    tag: '',
    is_active: true,
  });
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
      loadTags();
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
        .order('created_at', { ascending: true });

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

  const loadTags = async () => {
    if (!organizationId) return;
    
    try {
      const { data, error } = await supabaseClient
        .from('tags')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tags:', error);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClientId(client.id);
    setEditForm({
      client_name: client.client_name,
      start_date: client.start_date,
      boleto_value: client.boleto_value?.toString() || '',
      due_date: client.due_date || '',
      tag: '',
      is_active: client.is_active,
    });
  };

  const handleSaveEdit = async (clientId: string) => {
    try {
      const boletoValue = editForm.boleto_value === '' ? 0 : parseFloat(editForm.boleto_value);

      const { error } = await supabaseClient
        .from('client_timelines')
        .update({
          client_name: editForm.client_name,
          start_date: editForm.start_date,
          boleto_value: boletoValue,
          due_date: editForm.due_date,
          is_active: editForm.is_active,
        })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Cliente atualizado',
        description: 'As informações foram atualizadas com sucesso.',
      });

      setEditingClientId(null);
      loadClients();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingClientId(null);
    setEditForm({
      client_name: '',
      start_date: '',
      boleto_value: '',
      due_date: '',
      tag: '',
      is_active: true,
    });
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
            <div className="max-w-7xl mx-auto">
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
            className="max-w-7xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Clientes
            </h2>

            {clients.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p>Nenhum cliente encontrado</p>
              </div>
            ) : (
              <ScrollArea className="w-full rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#0d1f2d] hover:bg-[#0d1f2d] border-border">
                      <TableHead className="text-white font-bold text-center w-24">
                        Ativo
                      </TableHead>
                      <TableHead className="text-white font-bold text-center w-24">
                        ID
                      </TableHead>
                      <TableHead className="text-white font-bold">
                        Razão Social
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client, index) => (
                      <TableRow
                        key={client.id}
                        className={`border-border hover:opacity-80 transition-opacity ${
                          index % 2 === 0 ? 'bg-[#1e3a4a]' : 'bg-[#1a4d4d]'
                        }`}
                      >
                        <TableCell className="text-center">
                          <Popover 
                            open={editingClientId === client.id}
                            onOpenChange={(open) => {
                              if (!open) handleCancelEdit();
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                onClick={() => handleEditClient(client)}
                                className="inline-flex items-center justify-center mx-auto transition-transform hover:scale-110"
                              >
                                {client.is_active ? (
                                  <Check className="w-6 h-6 text-green-500" />
                                ) : (
                                  <X className="w-6 h-6 text-red-500" />
                                )}
                              </button>
                            </PopoverTrigger>
                            
                            <PopoverContent 
                              className="w-96 p-0 bg-[#1a1a1a] border-border"
                              align="start"
                              sideOffset={8}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 space-y-4"
                              >
                                <div className="flex items-center justify-between space-y-0">
                                  <Label htmlFor="is_active" className="text-sm text-foreground">
                                    Status Ativo
                                  </Label>
                                  <Switch
                                    id="is_active"
                                    checked={editForm.is_active}
                                    onCheckedChange={(checked) =>
                                      setEditForm({ ...editForm, is_active: checked })
                                    }
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="client_name" className="text-sm text-foreground">
                                    Nome do Cliente
                                  </Label>
                                  <Input
                                    id="client_name"
                                    value={editForm.client_name}
                                    onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                                    className="bg-background border-border text-foreground"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="start_date" className="text-sm text-foreground">
                                    Data de Início
                                  </Label>
                                  <Input
                                    id="start_date"
                                    type="date"
                                    value={editForm.start_date}
                                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                                    className="bg-background border-border text-foreground"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="boleto_value" className="text-sm text-foreground">
                                    Valor do Boleto
                                  </Label>
                                  <Input
                                    id="boleto_value"
                                    type="number"
                                    step="0.01"
                                    value={editForm.boleto_value}
                                    onChange={(e) => setEditForm({ ...editForm, boleto_value: e.target.value })}
                                    className="bg-background border-border text-foreground"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="due_date" className="text-sm text-foreground">
                                    Data de Vencimento
                                  </Label>
                                  <Input
                                    id="due_date"
                                    type="date"
                                    value={editForm.due_date}
                                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                                    className="bg-background border-border text-foreground"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="tag" className="text-sm text-foreground">
                                    Tag
                                  </Label>
                                  <Input
                                    id="tag"
                                    value={editForm.tag}
                                    onChange={(e) => setEditForm({ ...editForm, tag: e.target.value })}
                                    placeholder="Digite uma tag..."
                                    className="bg-background border-border text-foreground"
                                  />
                                </div>

                                <div className="flex gap-2 pt-4">
                                  <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancelar
                                  </Button>
                                  <Button
                                    className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white"
                                    onClick={() => handleSaveEdit(client.id)}
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Salvar
                                  </Button>
                                </div>
                              </motion.div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="text-center text-white font-medium">
                          {client.client_id || (index + 1).toString().padStart(3, '0')}
                        </TableCell>
                        <TableCell className="text-white font-bold uppercase">
                          {client.client_name}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Clients;