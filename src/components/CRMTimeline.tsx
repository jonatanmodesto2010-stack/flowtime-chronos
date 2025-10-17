import React, { useState, useEffect } from 'react';
import { X, Plus, MessageCircle, Phone, Calendar, XCircle, Clock, ChevronLeft, Eye, EyeOff } from 'lucide-react';

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

const formatarData = (data: string): string => {
  const d = new Date(data);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

const formatarDataHora = (data: string): string => {
  const d = new Date(data);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};


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
        statusCor: 'bg-red-600'
      },
      {
        id: '2',
        codigo: '00102',
        nome: 'MARIA SILVA SANTOS',
        status: 'ATIVO',
        statusCor: 'bg-green-600'
      },
      {
        id: '3',
        codigo: '00203',
        nome: 'JOÃO OLIVEIRA COSTA',
        status: 'AGUARDANDO RESPOSTA',
        statusCor: 'bg-yellow-600'
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

  const adicionarEvento = () => {
    if (!clienteSelecionado || !novoEvento.descricao.trim()) return;

    const evento: Evento = {
      id: Date.now().toString(),
      clienteId: clienteSelecionado.id,
      tipo: novoEvento.tipo,
      descricao: novoEvento.descricao,
      data: new Date(novoEvento.data).toISOString(),
      criadoPor: usuario
    };

    setEventos([evento, ...eventos].sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    ));
    setNovoEvento({ tipo: 'mensagem', descricao: '', data: new Date().toISOString().slice(0, 16) });
    setMostrarFormEvento(false);
  };

  const iniciarEdicao = (evento: Evento) => {
    setEventoEditando(evento);
    setNovoEvento({
      tipo: evento.tipo,
      descricao: evento.descricao,
      data: new Date(evento.data).toISOString().slice(0, 16)
    });
    setMostrarFormEvento(true);
  };

  const salvarEdicao = () => {
    if (!eventoEditando || !novoEvento.descricao.trim()) return;

    const eventosAtualizados = eventos.map(e =>
      e.id === eventoEditando.id
        ? { ...e, tipo: novoEvento.tipo, descricao: novoEvento.descricao, data: new Date(novoEvento.data).toISOString() }
        : e
    ).sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    setEventos(eventosAtualizados);
    setEventoEditando(null);
    setNovoEvento({ tipo: 'mensagem', descricao: '', data: new Date().toISOString().slice(0, 16) });
    setMostrarFormEvento(false);
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
  };

  const eventosDoCliente = eventos
    .filter(e => e.clienteId === clienteSelecionado?.id)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const EventoTimeline: React.FC<{ evento: Evento; index: number }> = ({ evento, index }) => {
    const iconeConfig = {
      mensagem: { icon: <MessageCircle size={20} />, cor: 'bg-blue-500', nome: 'Mensagem' },
      ligacao: { icon: <Phone size={20} />, cor: 'bg-green-500', nome: 'Ligação' },
      reuniao: { icon: <Calendar size={20} />, cor: 'bg-purple-500', nome: 'Reunião' },
      cancelamento: { icon: <XCircle size={20} />, cor: 'bg-red-500', nome: 'Cancelamento' },
      outros: { icon: <Clock size={20} />, cor: 'bg-gray-500', nome: 'Outros' }
    };

    const config = iconeConfig[evento.tipo];

    return (
      <div 
        className="flex gap-4 items-start mb-6 group animate-slideIn"
        style={{ 
          animationDelay: `${index * 0.1}s`,
          opacity: 0,
          animation: `slideIn 0.5s ease-out ${index * 0.1}s forwards`
        }}
      >
        <div className="flex-1"></div>
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => iniciarEdicao(evento)}
            className={`${config.cor} p-2 rounded-full text-white hover:scale-110 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-${config.cor}/50`}
            title="Clique para editar"
          >
            {config.icon}
          </button>
          <div className="w-0.5 h-full bg-gray-700 absolute top-10"></div>
        </div>
        <div className="flex-1">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-lg hover:transform hover:scale-[1.02] relative">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-white font-bold">{formatarData(evento.data)}</span>
                  <span className={`text-xs px-2 py-1 rounded ${config.cor} text-white`}>
                    {config.nome}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{evento.descricao}</p>
                <p className="text-gray-600 text-xs mt-2">💡 Clique no ícone para editar</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={() => iniciarEdicao(evento)}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all duration-300 hover:scale-110"
                  title="Editar evento"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => confirmarExclusao(evento)}
                  className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-all duration-300 hover:scale-110"
                  title="Excluir evento"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!clienteSelecionado) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-green-400 mb-6">Selecione um Cliente</h1>
          <div className="grid gap-3">
            {clientes.map(cliente => (
              <div
                key={cliente.id}
                onClick={() => setClienteSelecionado(cliente)}
                className="bg-gray-900 border border-green-800 rounded-lg p-4 cursor-pointer hover:border-green-600 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-gray-400 text-sm">{cliente.codigo}</span>
                  <span className={`text-xs px-3 py-1 rounded ${cliente.statusCor} text-white font-medium`}>
                    {cliente.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{cliente.nome}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
      {/* Header */}
      <div className="bg-gray-900 border-b border-green-800 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-400">
              Timeline - {clienteSelecionado.nome}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              🕒 Última atualização: {usuario} - {formatarDataHora(new Date().toISOString())}
            </p>
          </div>
          <button
            onClick={() => setClienteSelecionado(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-white">
            <span className="font-mono">👤</span>
            <span className="font-medium">
              {clienteSelecionado.codigo} - {clienteSelecionado.nome}
            </span>
          </div>
          
          <button
            onClick={() => setTimelineOculta(!timelineOculta)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {timelineOculta ? <Eye size={16} /> : <EyeOff size={16} />}
            {timelineOculta ? 'Mostrar' : 'Ocultar'}
          </button>

          <button
            onClick={() => setMostrarFormEvento(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
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
      {!timelineOculta && (
        <div className="max-w-6xl mx-auto p-8">
          <div className="relative">
            {eventosDoCliente.length > 0 ? (
              eventosDoCliente.map((evento, index) => (
                <EventoTimeline key={evento.id} evento={evento} index={index} />
              ))
            ) : (
              <div className="text-center text-gray-500 py-12">
                <Clock size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhum evento registrado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão Flutuante Voltar */}
      <button
        onClick={() => setClienteSelecionado(null)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-green-600/50"
        style={{ animation: 'slideIn 0.5s ease-out 0.5s backwards' }}
        title="Voltar para lista"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Modal Adicionar/Editar Evento */}
      {mostrarFormEvento && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
          onClick={cancelarModal}
        >
          <div 
            className="bg-gray-900 rounded-lg border border-green-800 w-full max-w-2xl transform transition-all"
            style={{ animation: 'slideIn 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-green-800">
              <h2 className="text-lg font-semibold text-green-400">
                {eventoEditando ? 'Editar Evento' : 'Adicionar Evento'}
              </h2>
              <button 
                onClick={cancelarModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-gray-400 mb-1.5 text-sm font-medium">Data e Hora *</label>
                <input
                  type="datetime-local"
                  value={novoEvento.data}
                  onChange={(e) => setNovoEvento({ ...novoEvento, data: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-600 transition-colors text-sm"
                />
                <p className="text-gray-500 text-xs mt-1">📅 Os eventos serão reordenados automaticamente por data</p>
              </div>

              <div>
                <label className="block text-gray-400 mb-1.5 text-sm font-medium">Tipo de Evento</label>
                <select
                  value={novoEvento.tipo}
                  onChange={(e) => setNovoEvento({ ...novoEvento, tipo: e.target.value as Evento['tipo'] })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-600 transition-colors text-sm"
                >
                  <option value="mensagem">💬 Mensagem</option>
                  <option value="ligacao">📞 Ligação</option>
                  <option value="reuniao">📅 Reunião</option>
                  <option value="cancelamento">❌ Cancelamento</option>
                  <option value="outros">📝 Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1.5 text-sm font-medium">Descrição do Evento *</label>
                <textarea
                  value={novoEvento.descricao}
                  onChange={(e) => setNovoEvento({ ...novoEvento, descricao: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-600 transition-colors resize-none text-sm"
                  placeholder="Descreva o que aconteceu neste contato..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  onClick={cancelarModal}
                  className="px-4 py-2 border border-gray-600 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={eventoEditando ? salvarEdicao : adicionarEvento}
                  disabled={!novoEvento.descricao.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {eventoEditando ? 'Salvar Alterações' : 'Adicionar Evento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {mostrarConfirmacao && eventoParaExcluir && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-start pl-8 z-50 p-4"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
          onClick={() => setMostrarConfirmacao(false)}
        >
          <div 
            className="bg-gray-900 rounded-lg border border-red-800 w-full max-w-sm"
            style={{ animation: 'slideIn 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-red-800">
              <h2 className="text-lg font-semibold text-red-400">Confirmar Exclusão</h2>
              <button 
                onClick={() => setMostrarConfirmacao(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <p className="text-gray-300 mb-2 text-sm">Tem certeza que deseja excluir este evento?</p>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 mb-4">
                <p className="text-sm text-gray-400">
                  <strong className="text-white">{formatarData(eventoParaExcluir.data)}</strong> - {eventoParaExcluir.descricao}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  📅 {formatarDataHora(eventoParaExcluir.data)}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setMostrarConfirmacao(false)}
                  className="px-4 py-2 border border-gray-600 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={excluirEvento}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Excluir Evento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
