import React, { useState, useEffect } from 'react';
import { X, Plus, MessageCircle, Phone, Calendar, XCircle, Clock, ChevronLeft, Eye, EyeOff, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';

// ==================== VALIDATION SCHEMAS ====================
const eventoSchema = z.object({
  tipo: z.enum(['mensagem', 'ligacao', 'reuniao', 'cancelamento', 'outros']),
  descricao: z.string()
    .trim()
    .min(1, { message: "A descrição não pode estar vazia" })
    .max(500, { message: "A descrição deve ter no máximo 500 caracteres" }),
  data: z.string().min(1, { message: "A data é obrigatória" })
});

// ==================== TYPES ====================
interface Cliente {
  id: string;
  codigo: string;
  nome: string;
  status: string;
  statusCor: string;
}

interface Evento {
  id: string;
  clienteId: string;
  tipo: 'mensagem' | 'ligacao' | 'reuniao' | 'cancelamento' | 'outros';
  descricao: string;
  data: string;
  criadoPor: string;
}

// ==================== HELPER FUNCTIONS ====================
const formatarData = (data: string): string => {
  const d = new Date(data);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

const formatarDataHora = (data: string): string => {
  const d = new Date(data);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// ==================== EVENTO TIMELINE COMPONENT ====================
const EventoTimeline: React.FC<{ 
  evento: Evento; 
  index: number;
  onEditar: (evento: Evento) => void;
  onExcluir: (evento: Evento) => void;
  isLast: boolean;
}> = ({ evento, index, onEditar, onExcluir, isLast }) => {
  const iconeConfig = {
    mensagem: { icon: <MessageCircle size={20} />, cor: 'bg-primary', nome: 'Mensagem' },
    ligacao: { icon: <Phone size={20} />, cor: 'bg-[hsl(var(--status-resolved))]', nome: 'Ligação' },
    reuniao: { icon: <Calendar size={20} />, cor: 'bg-secondary', nome: 'Reunião' },
    cancelamento: { icon: <XCircle size={20} />, cor: 'bg-[hsl(var(--status-no-response))]', nome: 'Cancelamento' },
    outros: { icon: <Clock size={20} />, cor: 'bg-muted', nome: 'Outros' }
  };

  const config = iconeConfig[evento.tipo];

  return (
    <motion.div 
      className="flex gap-4 mb-0 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Coluna do Ícone com Linha Vertical */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => onEditar(evento)}
          className={`${config.cor} w-10 h-10 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer shadow-lg z-10`}
          title="Clique para editar"
        >
          {config.icon}
        </button>
        {!isLast && (
          <div className="w-0.5 h-full min-h-[100px] bg-border mt-1"></div>
        )}
      </div>

      {/* Card do Evento */}
      <div className="flex-1 mb-6">
        <div className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-card-foreground font-bold text-lg">
                  {formatarData(evento.data)}
                </span>
                <span className={`${config.cor} text-white text-xs font-medium px-3 py-1 rounded`}>
                  {config.nome}
                </span>
              </div>
              <p className="text-card-foreground text-sm mb-3">
                {evento.descricao}
              </p>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <span>💡</span>
                <span>Clique no ícone para editar</span>
              </div>
            </div>
            
            {/* Botões de Ação */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => onEditar(evento)}
                className="p-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded transition-all duration-300 hover:scale-110"
                title="Editar evento"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onExcluir(evento)}
                className="p-1.5 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded transition-all duration-300 hover:scale-110"
                title="Excluir evento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== MAIN COMPONENT ====================
export default function CRMTimeline() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [mostrarFormEvento, setMostrarFormEvento] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [eventoParaExcluir, setEventoParaExcluir] = useState<Evento | null>(null);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [timelineOculta, setTimelineOculta] = useState(false);
  const [usuario] = useState('Jonatan Modesto');
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});
  
  const [novoEvento, setNovoEvento] = useState({
    tipo: 'mensagem' as Evento['tipo'],
    descricao: '',
    data: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    const clientesDemo: Cliente[] = [
      {
        id: '1',
        codigo: '00059',
        nome: 'ANTONIO FRANCISCO DA SILVA NETO',
        status: 'CANCELAMENTO INADIMPLENCIA / RETIRADA DE EQUIPAMEN',
        statusCor: 'bg-[hsl(var(--status-no-response))]'
      },
      {
        id: '2',
        codigo: '00102',
        nome: 'MARIA SILVA SANTOS',
        status: 'ATIVO',
        statusCor: 'bg-[hsl(var(--status-resolved))]'
      },
      {
        id: '3',
        codigo: '00203',
        nome: 'JOÃO OLIVEIRA COSTA',
        status: 'AGUARDANDO RESPOSTA',
        statusCor: 'bg-muted'
      }
    ];

    const eventosDemo: Evento[] = [
      {
        id: '1',
        clienteId: '1',
        tipo: 'mensagem',
        descricao: 'Mandei mensagem. Aguardando a resposta.',
        data: '2025-10-13T10:30:00',
        criadoPor: 'Jonatan Modesto'
      },
      {
        id: '2',
        clienteId: '1',
        tipo: 'ligacao',
        descricao: 'Tentativa de contato telefônico. Não atendeu.',
        data: '2025-10-12T14:20:00',
        criadoPor: 'Jonatan Modesto'
      },
      {
        id: '3',
        clienteId: '1',
        tipo: 'reuniao',
        descricao: 'Reunião agendada para discutir pendências.',
        data: '2025-10-10T09:00:00',
        criadoPor: 'Jonatan Modesto'
      }
    ];

    setClientes(clientesDemo);
    setEventos(eventosDemo);
    setClienteSelecionado(clientesDemo[0]);
  }, []);

  const validarEvento = (): boolean => {
    try {
      eventoSchema.parse(novoEvento);
      setErrosValidacao({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const erros: Record<string, string> = {};
        error.issues.forEach(err => {
          if (err.path[0]) {
            erros[err.path[0].toString()] = err.message;
          }
        });
        setErrosValidacao(erros);
      }
      return false;
    }
  };

  const adicionarEvento = () => {
    if (!clienteSelecionado || !validarEvento()) return;

    const evento: Evento = {
      id: Date.now().toString(),
      clienteId: clienteSelecionado.id,
      tipo: novoEvento.tipo,
      descricao: novoEvento.descricao.trim(),
      data: new Date(novoEvento.data).toISOString(),
      criadoPor: usuario
    };

    setEventos([evento, ...eventos].sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    ));
    setNovoEvento({ tipo: 'mensagem', descricao: '', data: new Date().toISOString().slice(0, 16) });
    setMostrarFormEvento(false);
    setErrosValidacao({});
  };

  const iniciarEdicao = (evento: Evento) => {
    setEventoEditando(evento);
    setNovoEvento({
      tipo: evento.tipo,
      descricao: evento.descricao,
      data: new Date(evento.data).toISOString().slice(0, 16)
    });
    setMostrarFormEvento(true);
    setErrosValidacao({});
  };

  const salvarEdicao = () => {
    if (!eventoEditando || !validarEvento()) return;

    const eventosAtualizados = eventos.map(e =>
      e.id === eventoEditando.id
        ? { ...e, tipo: novoEvento.tipo, descricao: novoEvento.descricao.trim(), data: new Date(novoEvento.data).toISOString() }
        : e
    ).sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    setEventos(eventosAtualizados);
    setEventoEditando(null);
    setNovoEvento({ tipo: 'mensagem', descricao: '', data: new Date().toISOString().slice(0, 16) });
    setMostrarFormEvento(false);
    setErrosValidacao({});
  };

  const confirmarExclusao = (evento: Evento) => {
    setEventoParaExcluir(evento);
    setMostrarConfirmacao(true);
  };

  const excluirEvento = () => {
    if (!eventoParaExcluir) return;
    
    setEventos(eventos.filter(e => e.id !== eventoParaExcluir.id));
    setEventoParaExcluir(null);
    setMostrarConfirmacao(false);
  };

  const cancelarModal = () => {
    setMostrarFormEvento(false);
    setEventoEditando(null);
    setNovoEvento({ tipo: 'mensagem', descricao: '', data: new Date().toISOString().slice(0, 16) });
    setErrosValidacao({});
  };

  const eventosDoCliente = eventos
    .filter(e => e.clienteId === clienteSelecionado?.id)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  if (!clienteSelecionado) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-primary mb-6">Selecione um Cliente</h1>
          <div className="grid gap-3">
            {clientes.map(cliente => (
              <motion.div
                key={cliente.id}
                onClick={() => setClienteSelecionado(cliente)}
                className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-muted-foreground text-sm">{cliente.codigo}</span>
                  <span className={`text-xs px-3 py-1 rounded ${cliente.statusCor} text-white font-medium`}>
                    {cliente.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-card-foreground">{cliente.nome}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              Timeline - {clienteSelecionado.nome}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              🕒 Última atualização: {usuario} - {formatarDataHora(new Date().toISOString())}
            </p>
          </div>
          <button
            onClick={() => setClienteSelecionado(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-card-foreground">
            <span className="font-mono">👤</span>
            <span className="font-medium">
              {clienteSelecionado.codigo} - {clienteSelecionado.nome}
            </span>
          </div>
          
          <button
            onClick={() => setTimelineOculta(!timelineOculta)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors text-sm font-medium"
          >
            {timelineOculta ? <Eye size={16} /> : <EyeOff size={16} />}
            {timelineOculta ? 'Mostrar' : 'Ocultar'}
          </button>

          <button
            onClick={() => setMostrarFormEvento(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Evento
          </button>

          <div className={`px-4 py-2 ${clienteSelecionado.statusCor} text-white rounded-lg text-sm font-medium`}>
            {clienteSelecionado.status}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <AnimatePresence>
        {!timelineOculta && (
          <motion.div 
            className="max-w-4xl mx-auto p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {eventosDoCliente.length > 0 ? (
              eventosDoCliente.map((evento, index) => (
                <EventoTimeline 
                  key={evento.id} 
                  evento={evento} 
                  index={index}
                  isLast={index === eventosDoCliente.length - 1}
                  onEditar={iniciarEdicao}
                  onExcluir={confirmarExclusao}
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <Clock size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhum evento registrado</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão Flutuante Voltar */}
      <motion.button
        onClick={() => setClienteSelecionado(null)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Voltar para lista"
      >
        <ChevronLeft size={24} />
      </motion.button>

      {/* Modal Adicionar/Editar Evento */}
      <AnimatePresence>
        {mostrarFormEvento && (
          <motion.div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelarModal}
          >
            <motion.div 
              className="bg-card rounded-lg border border-border w-full max-w-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-primary">
                  {eventoEditando ? 'Editar Evento' : 'Adicionar Evento'}
                </h2>
                <button 
                  onClick={cancelarModal}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-card-foreground mb-1.5 text-sm font-medium">Data e Hora *</label>
                  <input
                    type="datetime-local"
                    value={novoEvento.data}
                    onChange={(e) => setNovoEvento({ ...novoEvento, data: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                  {errosValidacao.data && (
                    <p className="text-destructive text-xs mt-1">{errosValidacao.data}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1">📅 Os eventos serão reordenados automaticamente por data</p>
                </div>

                <div>
                  <label className="block text-card-foreground mb-1.5 text-sm font-medium">Tipo de Evento</label>
                  <select
                    value={novoEvento.tipo}
                    onChange={(e) => setNovoEvento({ ...novoEvento, tipo: e.target.value as Evento['tipo'] })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  >
                    <option value="mensagem">💬 Mensagem</option>
                    <option value="ligacao">📞 Ligação</option>
                    <option value="reuniao">📅 Reunião</option>
                    <option value="cancelamento">❌ Cancelamento</option>
                    <option value="outros">📝 Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-card-foreground mb-1.5 text-sm font-medium">
                    Descrição do Evento * ({novoEvento.descricao.length}/500)
                  </label>
                  <textarea
                    value={novoEvento.descricao}
                    onChange={(e) => setNovoEvento({ ...novoEvento, descricao: e.target.value })}
                    rows={3}
                    maxLength={500}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary transition-colors resize-none text-sm"
                    placeholder="Descreva o que aconteceu neste contato..."
                  />
                  {errosValidacao.descricao && (
                    <p className="text-destructive text-xs mt-1">{errosValidacao.descricao}</p>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-3">
                  <button
                    onClick={cancelarModal}
                    className="px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={eventoEditando ? salvarEdicao : adicionarEvento}
                    className="px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors text-sm font-medium"
                  >
                    {eventoEditando ? 'Salvar Alterações' : 'Adicionar Evento'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação de Exclusão */}
      <AnimatePresence>
        {mostrarConfirmacao && eventoParaExcluir && (
          <motion.div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMostrarConfirmacao(false)}
          >
            <motion.div 
              className="bg-card rounded-lg border border-destructive w-full max-w-sm"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-destructive">
                <h2 className="text-lg font-semibold text-destructive">Confirmar Exclusão</h2>
                <button 
                  onClick={() => setMostrarConfirmacao(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4">
                <p className="text-card-foreground mb-2 text-sm">Tem certeza que deseja excluir este evento?</p>
                <div className="bg-muted rounded-lg p-3 border border-border mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{formatarData(eventoParaExcluir.data)}</strong> - {eventoParaExcluir.descricao}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📅 {formatarDataHora(eventoParaExcluir.data)}
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setMostrarConfirmacao(false)}
                    className="px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={excluirEvento}
                    className="px-4 py-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-lg transition-colors text-sm font-medium"
                  >
                    Excluir Evento
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
