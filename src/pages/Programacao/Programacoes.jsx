import React, { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import { 
  CalendarRange, Search, X, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Calendar, ArrowUp, ArrowDown,
  Leaf, UtilityPole, Zap, Activity, Truck, DollarSign, Plus, Edit2, AlertTriangle, ArrowLeft
} from "lucide-react";

export default function Programacoes() {
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [dataInicial, setDataInicial] = useState(new Date());
  const [dataSelecionada, setDataSelecionada] = useState(null);

  // Estados da Tela de Programação
  const [telaProgramacaoAberta, setTelaProgramacaoAberta] = useState(false);
  const [modoTela, setModoTela] = useState('novo'); // 'novo' ou 'editar'
  const [equipeTela, setEquipeTela] = useState(null);
  const [dataTela, setDataTela] = useState(null);

  // Estados para a pesquisa da carteira (tabe_cad_carteira)
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState({
    rastreio: '',
    id_rastreio: '',
    vinculo_pagamento: '',
    status: '',
    descricao_breve: '',
    prazo: '',
    municipio: '',
    seal: '',
    coord_x: '',
    coord_y: '',
    solicitante: '',
    responsavel_tecnico: ''
  });

  // Respostas do Checklist
  const [formProgramacao, setFormProgramacao] = useState({
    viagem: '',
    restricao: '',
    finalizaObra: '',
    apoioLvLm: '',
    siBloqueio: '',
    siDesligamento: ''
  });

  // Tabela de Serviços na Tela de Programação
  const [listaServicosTela, setListaServicosTela] = useState([]);

  const [filtrosAtivos, setFiltrosAtivos] = useState({
    busca: '',
    coordenador: 'TODOS',
    supervisor: 'TODOS',
    processo: 'TODOS',
    tipo_equipe: 'TODOS',
    regime: 'TODOS'
  });
  const [tipoFiltroAtual, setTipoFiltroAtual] = useState('TODOS');
  const [valorFiltroBusca, setValorFiltroBusca] = useState('');
  const [valorFiltroSelect, setValorFiltroSelect] = useState('TODOS');

  const [ordenacaoCampo, setOrdenacaoCampo] = useState('prefixo');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState('asc');

  useEffect(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    setDataInicial(hoje);
  }, []);

  useEffect(() => {
    const fetchEquipes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("tabe_imp_equipes_jupiter")
          .select("prefixo, regime, veiculo, processo, tipo_equipe, encarregado, supervisor, coordenador, meta")
          .not("prefixo", "is", null);

        if (error) throw error;

        const mapaEquipes = new Map();
        data.forEach((item) => {
          if (!mapaEquipes.has(item.prefixo)) mapaEquipes.set(item.prefixo, item);
        });
        
        setEquipes(Array.from(mapaEquipes.values()));
      } catch (error) {
        console.error("Erro ao buscar equipes:", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipes();
  }, []);

  // Função para pesquisar na tabela tabe_cad_carteira
  useEffect(() => {
    const buscarCarteira = async () => {
      if (!termoPesquisa || termoPesquisa.trim().length < 2) {
        setResultadosBusca([]);
        return;
      }

      try {
        const queryTerm = `%${termoPesquisa.trim()}%`;
        const { data, error } = await supabase
          .from("tabe_cad_carteira")
          .select("rastreio, id_rastreio, vinculo_pagamento, status, descricao_breve, prazo, municipio, seal, coord_x, coord_y, solicitante, responsavel_tecnico")
          .or(`id_rastreio.ilike.${queryTerm},vinculo_pagamento.ilike.${queryTerm},descricao_breve.ilike.${queryTerm}`)
          .limit(5);

        if (error) throw error;
        setResultadosBusca(data || []);
      } catch (err) {
        console.error("Erro ao buscar carteira:", err.message);
      }
    };

    const timer = setTimeout(() => {
      buscarCarteira();
    }, 300);

    return () => clearTimeout(timer);
  }, [termoPesquisa]);

  const selecionarItemCarteira = (item) => {
    setCarteiraSelecionada({
      rastreio: item.rastreio || '',
      id_rastreio: item.id_rastreio || '',
      vinculo_pagamento: item.vinculo_pagamento || '',
      status: item.status || '',
      descricao_breve: item.descricao_breve || '',
      prazo: item.prazo || '',
      municipio: item.municipio || '',
      seal: item.seal || '',
      coord_x: item.coord_x || '',
      coord_y: item.coord_y || '',
      solicitante: item.solicitante || '',
      responsavel_tecnico: item.responsavel_tecnico || ''
    });

    const novoServico = {
      id: Date.now(),
      equipe: equipeTela?.prefixo || '',
      origem: item.rastreio || 'Jupiter',
      codigo: item.id_rastreio || '',
      descricao: item.descricao_breve || '',
      prev: (1.00).toFixed(2),
      real: (0.00).toFixed(2),
      pend: (1.00).toFixed(2),
      prog: (0.00).toFixed(2)
    };
    setListaServicosTela(prev => [...prev, novoServico]);

    setTermoPesquisa('');
    setResultadosBusca([]);
  };

  const handleProgTelaChange = (id, valor) => {
    setListaServicosTela(prev => prev.map(serv => {
      if (serv.id === id) {
        return { ...serv, prog: valor };
      }
      return serv;
    }));
  };

  const abrirTelaProgramacao = (modo, equipe, data) => {
    setModoTela(modo);
    setEquipeTela(equipe);
    setDataTela(data);
    setFormProgramacao({
      viagem: '',
      restricao: '',
      finalizaObra: '',
      apoioLvLm: '',
      siBloqueio: '',
      siDesligamento: ''
    });
    setCarteiraSelecionada({ rastreio: '', id_rastreio: '', vinculo_pagamento: '', status: '', descricao_breve: '', prazo: '', municipio: '', seal: '', coord_x: '', coord_y: '', solicitante: '', responsavel_tecnico: '' });
    setListaServicosTela([]);
    setTermoPesquisa('');
    setTelaProgramacaoAberta(true);
  };

  const fecharTelaProgramacao = () => {
    setTelaProgramacaoAberta(false);
    setEquipeTela(null);
    setDataTela(null);
  };

  const salvarProgramacao = (e) => {
    e.preventDefault();
    console.log("Salvando programação:", {
      modo: modoTela,
      equipe: equipeTela?.prefixo,
      data: dataTela ? dataTela.toLocaleDateString("pt-BR") : '',
      carteira: carteiraSelecionada,
      checklist: formProgramacao,
      servicos: listaServicosTela
    });
    fecharTelaProgramacao();
  };

  const moverDias = (quantidade) => {
    setDataInicial((prev) => {
      const novaData = new Date(prev);
      novaData.setDate(novaData.getDate() + quantidade);
      return novaData;
    });
  };

  const irParaHoje = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    setDataInicial(hoje);
    setDataSelecionada(hoje.getTime());
  };

  const handleMudarDataPeloCalendario = (e) => {
    if (!e.target.value) return;
    const [ano, mes, dia] = e.target.value.split('-');
    const novaData = new Date(ano, mes - 1, dia);
    novaData.setHours(0, 0, 0, 0);
    setDataInicial(novaData);
    setDataSelecionada(novaData.getTime());
  };

  const valorInputDate = `${dataInicial.getFullYear()}-${String(dataInicial.getMonth() + 1).padStart(2, '0')}-${String(dataInicial.getDate()).padStart(2, '0')}`;

  const diasExibidos = Array.from({ length: 7 }).map((_, index) => {
    const d = new Date(dataInicial);
    d.setDate(d.getDate() + index);
    return d;
  });

  const isHoje = (d) => {
    const hoje = new Date();
    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  };

  const formatarBRL = (valor) => {
    const num = Number(valor);
    if (isNaN(num)) return "R$ 0,00";
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const adicionarFiltroDinamico = () => {
    if (tipoFiltroAtual === 'TODOS') return;
    setFiltrosAtivos(prev => {
      const novosFiltros = { ...prev };
      if (tipoFiltroAtual === 'busca') {
        novosFiltros.busca = valorFiltroBusca.trim();
      } else {
        novosFiltros[tipoFiltroAtual] = valorFiltroSelect;
      }
      return novosFiltros;
    });
  };

  const removerFiltro = (tipo) => {
    setFiltrosAtivos(prev => ({ ...prev, [tipo]: tipo === 'busca' ? '' : 'TODOS' }));
  };

  const limparTodosFiltros = () => {
    setFiltrosAtivos({ busca: '', coordenador: 'TODOS', supervisor: 'TODOS', processo: 'TODOS', tipo_equipe: 'TODOS', regime: 'TODOS' });
    setValorFiltroBusca('');
    setValorFiltroSelect('TODOS');
    setTipoFiltroAtual('TODOS');
  };

  const temFiltroAtivo = Object.entries(filtrosAtivos).some(([key, value]) => key === 'busca' ? value !== '' : value !== 'TODOS');

  const opcoesDinamicasSelect = (tipoFiltroAtual !== 'busca' && tipoFiltroAtual !== 'TODOS')
    ? [...new Set(equipes.map(e => e[tipoFiltroAtual] || 'Indefinido'))].sort() 
    : [];

  const equipesFiltradas = equipes.filter(eq => {
    const atendeBusca = filtrosAtivos.busca === '' || (eq.prefixo && eq.prefixo.toLowerCase().includes(filtrosAtivos.busca.toLowerCase()));
    const atendeCoord = filtrosAtivos.coordenador === 'TODOS' || (eq.coordenador || 'Indefinido') === filtrosAtivos.coordenador;
    const atendeSup = filtrosAtivos.supervisor === 'TODOS' || (eq.supervisor || 'Indefinido') === filtrosAtivos.supervisor;
    const atendeProc = filtrosAtivos.processo === 'TODOS' || (eq.processo || 'Indefinido') === filtrosAtivos.processo;
    const atendeTipo = filtrosAtivos.tipo_equipe === 'TODOS' || (eq.tipo_equipe || 'Indefinido') === filtrosAtivos.tipo_equipe;
    const atendeReg = filtrosAtivos.regime === 'TODOS' || (eq.regime || 'Indefinido') === filtrosAtivos.regime;
    return atendeBusca && atendeCoord && atendeSup && atendeProc && atendeTipo && atendeReg;
  }).sort((a, b) => {
    let valorA = a[ordenacaoCampo] || '';
    let valorB = b[ordenacaoCampo] || '';
    if (typeof valorA === 'string') valorA = valorA.toLowerCase();
    if (typeof valorB === 'string') valorB = valorB.toLowerCase();
    if (valorA < valorB) return ordenacaoDirecao === 'asc' ? -1 : 1;
    if (valorA > valorB) return ordenacaoDirecao === 'asc' ? 1 : -1;
    return 0;
  });

  const somaMetasVisiveis = equipesFiltradas.reduce((acc, eq) => {
    const val = Number(eq.meta);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const mapNomesFiltros = {
    busca: 'Prefixo', coordenador: 'Coordenador', supervisor: 'Supervisor', 
    processo: 'Processo', tipo_equipe: 'Tipo', regime: 'Regime'
  };

  const alturaUnificadaEstilo = { height: '26px', boxSizing: 'border-box' };

  const renderProcessoIcon = (processoTexto) => {
    const p = (processoTexto || "").toLowerCase();
    if (p.includes("poda") || p.includes("vegeta")) {
      return <Leaf size={9} color="#22c55e" strokeWidth={2.5} />;
    }
    if (p.includes("obra")) {
      return <UtilityPole size={9} color="#0ea5e9" strokeWidth={2.5} />;
    }
    if (p.includes("manuten")) {
      return <Zap size={9} color="#eab308" fill="#eab308" strokeWidth={2} />;
    }
    return <Activity size={9} color="#94a3b8" strokeWidth={2.5} />;
  };

  const tipoEquipeTelaTexto = (equipeTela?.tipo_equipe || "").toUpperCase();
  const contemLinhaViva4h = tipoEquipeTelaTexto.includes("LINHA VIVA 4H");

  // SE A TELA DE PROGRAMAÇÃO ESTIVER ATIVA, EXIBE ELA NO LUGAR DA MATRIZ
  if (telaProgramacaoAberta) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, gap: '8px', overflow: 'hidden', boxSizing: 'border-box', width: '100%', padding: '8px', margin: '0px', background: '#f8fafc' }}>
        
        {/* Header da Tela */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={fecharTelaProgramacao} 
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}
            >
              <ArrowLeft size={14} /> Voltar à Matriz
            </button>
            <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>
              {modoTela === 'novo' ? 'Nova Programação de Equipe' : 'Editar Programação de Equipe'}
            </h2>
          </div>
        </div>

        {/* Formulário da Tela */}
        <form onSubmit={salvarProgramacao} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '10px', fontSize: '0.75rem', color: '#334155', background: '#fff', padding: '14px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
          
          {/* Seção de Pesquisa na Tabela tabe_cad_carteira com Lupa Integrada */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', flexShrink: 0 }}>
            <label style={{ fontWeight: '600' }}>Pesquisar Carteira (ID Rastreio / Vínculo / Descrição):</label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
              <input 
                type="text"
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                placeholder="Digite para buscar..."
                style={{ width: '100%', padding: '6px 30px 6px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
              />
              <Search size={14} color="#64748b" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
            </div>

            {/* Lista de Sugestões da Busca */}
            {resultadosBusca.length > 0 && (
              <div style={{ position: 'absolute', top: '55px', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '140px', overflowY: 'auto' }}>
                {resultadosBusca.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => selecionarItemCarteira(item)}
                    style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.7rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <strong>{item.id_rastreio}</strong> - {item.vinculo_pagamento} - {item.descricao_breve}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CONTAINER LADO A LADO USANDO CSS GRID PARA SINCRONIZAR EXATAMENTE AS 4 LINHAS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
            
            {/* LADO ESQUERDO: Check-list da Programação (Ajustado com altura exata de Linha 1 + Gap + Linha 2) */}
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, auto)', gap: '6px', background: '#f8fafc', padding: '12px 10px 10px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', position: 'relative', marginTop: '4px', boxSizing: 'border-box' }}>
              <span style={{ position: 'absolute', top: '-9px', left: '10px', background: '#f8fafc', padding: '0 4px', fontSize: '0.65rem', fontWeight: '700', color: '#0284c7' }}>
                Check-list da Programação
              </span>

              {/* Linha 1 e 2 Unidas: "Dados da Programação" ocupa exatamente a altura das duas primeiras linhas da direita */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', boxSizing: 'border-box', gridRow: 'span 2' }}>
                <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Dados da Programação:</label>
                <input 
                  type="text" 
                  value={`Equipe: ${equipeTela?.prefixo || ''} | Data: ${dataTela ? dataTela.toLocaleDateString("pt-BR") : ''}`} 
                  readOnly 
                  style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0 6px', fontSize: '0.7rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box', height: 'calc(100% - 15px)' }} 
                />
              </div>

              {/* Linha 3: Selects (Alinhada perfeitamente com a Linha 3 da direita) */}
              <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '33.33%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Viagem:</label>
                  <select 
                    value={formProgramacao.viagem} 
                    onChange={(e) => setFormProgramacao({...formProgramacao, viagem: e.target.value})}
                    style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="">Selecione</option>
                    <option value="SIM">SIM</option>
                    <option value="NAO">NÃO</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '33.33%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Restrição:</label>
                  <select 
                    value={formProgramacao.restricao} 
                    onChange={(e) => setFormProgramacao({...formProgramacao, restricao: e.target.value})}
                    style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="">Selecione</option>
                    <option value="SIM">SIM</option>
                    <option value="NAO">NÃO</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '33.33%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Finaliza Obra:</label>
                  <select 
                    value={formProgramacao.finalizaObra} 
                    onChange={(e) => setFormProgramacao({...formProgramacao, finalizaObra: e.target.value})}
                    style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="">Selecione</option>
                    <option value="SIM">SIM</option>
                    <option value="NAO">NÃO</option>
                  </select>
                </div>
              </div>

              {/* Linha 4: Selects (Alinhada perfeitamente com a Linha 4 da direita) */}
              <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '33.33%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>
                    {contemLinhaViva4h ? 'Apoio de LM:' : 'Apoio de LV:'}
                  </label>
                  <select 
                    value={formProgramacao.apoioLvLm} 
                    onChange={(e) => setFormProgramacao({...formProgramacao, apoioLvLm: e.target.value})}
                    style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="">Selecione</option>
                    <option value="SIM">SIM</option>
                    <option value="NAO">NÃO</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '33.33%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>SI de Bloqueio:</label>
                  <select 
                    value={formProgramacao.siBloqueio} 
                    onChange={(e) => setFormProgramacao({...formProgramacao, siBloqueio: e.target.value})}
                    style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="">Selecione</option>
                    <option value="SIM">SIM</option>
                    <option value="NAO">NÃO</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '33.33%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>SI de Desligamento:</label>
                  <select 
                    value={formProgramacao.siDesligamento} 
                    onChange={(e) => setFormProgramacao({...formProgramacao, siDesligamento: e.target.value})}
                    style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="">Selecione</option>
                    <option value="SIM">SIM</option>
                    <option value="NAO">NÃO</option>
                  </select>
                </div>
              </div>

            </div>

            {/* LADO DIREITO: Dados Técnicos da Atividade */}
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, auto)', gap: '6px', background: '#f8fafc', padding: '12px 10px 10px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', position: 'relative', marginTop: '4px', boxSizing: 'border-box' }}>
              <span style={{ position: 'absolute', top: '-9px', left: '10px', background: '#f8fafc', padding: '0 4px', fontSize: '0.65rem', fontWeight: '700', color: '#0284c7' }}>
                Dados Técnicos da Atividade
              </span>
              
              {/* Linha 1 */}
              <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '26.66%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Tipo:</label>
                  <input type="text" value={carteiraSelecionada.rastreio} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.65rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '26.66%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Ordem Serviço:</label>
                  <input type="text" value={carteiraSelecionada.id_rastreio} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.65rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '26.66%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Ordem Pagamento:</label>
                  <input type="text" value={carteiraSelecionada.vinculo_pagamento} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.65rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '20%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Status:</label>
                  <input type="text" value={carteiraSelecionada.status} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.65rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Linha 2 */}
              <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '80%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Descrição da Atividade:</label>
                  <input type="text" value={carteiraSelecionada.descricao_breve} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', fontSize: '0.7rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '20%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Prazo:</label>
                  <input type="text" value={carteiraSelecionada.prazo} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', fontSize: '0.7rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Linha 3 */}
              <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '45%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Localidade:</label>
                  <input type="text" value={carteiraSelecionada.municipio} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.65rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '15%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Alimentador:</label>
                  <input type="text" value={carteiraSelecionada.seal} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.65rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '20%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Latitude:</label>
                  <input type="text" value={carteiraSelecionada.coord_x} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.65rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '20%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Longitude:</label>
                  <input type="text" value={carteiraSelecionada.coord_y} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '0.65rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Linha 4 */}
              <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '50%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Solicitante:</label>
                  <input type="text" value={carteiraSelecionada.solicitante} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', fontSize: '0.7rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexBasis: '50%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '0.6rem', fontWeight: '600', color: '#475569' }}>Responsável Técnico:</label>
                  <input type="text" value={carteiraSelecionada.responsavel_tecnico} readOnly style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', fontSize: '0.7rem', color: '#334155', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

            </div>

          </div>

          {/* DIV: Tabela de Cadastro de Serviços */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '6px', background: '#f8fafc', padding: '14px 10px 10px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', position: 'relative', marginTop: '6px', boxSizing: 'border-box' }}>
            <span style={{ position: 'absolute', top: '-9px', left: '10px', background: '#f8fafc', padding: '0 4px', fontSize: '0.65rem', fontWeight: '700', color: '#0284c7' }}>
              Cadastro de Serviços da Programação
            </span>

            <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.7rem" }}>
                <thead>
                  <tr style={{ background: "#e2e8f0" }}>
                    <th style={{ ...thModalStyle, position: 'sticky', top: 0, background: '#e2e8f0', textAlign: 'left', zIndex: 1 }}>Equipe</th>
                    <th style={{ ...thModalStyle, position: 'sticky', top: 0, background: '#e2e8f0', textAlign: 'left', zIndex: 1 }}>Origem</th>
                    <th style={{ ...thModalStyle, position: 'sticky', top: 0, background: '#e2e8f0', textAlign: 'left', zIndex: 1 }}>Código</th>
                    <th style={{ ...thModalStyle, position: 'sticky', top: 0, background: '#e2e8f0', textAlign: 'left', zIndex: 1 }}>Descrição</th>
                    <th style={{ ...thModalStyle, position: 'sticky', top: 0, background: '#e2e8f0', textAlign: 'right', zIndex: 1 }}>Prev</th>
                    <th style={{ ...thModalStyle, position: 'sticky', top: 0, background: '#e2e8f0', textAlign: 'right', zIndex: 1 }}>Real</th>
                    <th style={{ ...thModalStyle, position: 'sticky', top: 0, background: '#e2e8f0', textAlign: 'right', zIndex: 1 }}>Pend</th>
                    <th style={{ ...thModalStyle, position: 'sticky', top: 0, background: '#e2e8f0', textAlign: 'right', zIndex: 1 }}>Prog</th>
                  </tr>
                </thead>
                <tbody>
                  {listaServicosTela.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                        Nenhum serviço adicionado. Pesquise e selecione na carteira acima.
                      </td>
                    </tr>
                  ) : (
                    listaServicosTela.map((serv) => (
                      <tr key={serv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={tdModalStyle}>{serv.equipe}</td>
                        <td style={tdModalStyle}>{serv.origem}</td>
                        <td style={tdModalStyle}>{serv.codigo}</td>
                        <td style={tdModalStyle}>{serv.descricao}</td>
                        <td style={{ ...tdModalStyle, textAlign: 'right' }}>{Number(serv.prev).toFixed(2)}</td>
                        <td style={{ ...tdModalStyle, textAlign: 'right' }}>{Number(serv.real).toFixed(2)}</td>
                        <td style={{ ...tdModalStyle, textAlign: 'right' }}>{Number(serv.pend).toFixed(2)}</td>
                        <td style={{ ...tdModalStyle, textAlign: 'right' }}>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={serv.prog} 
                            onChange={(e) => handleProgTelaChange(serv.id, e.target.value)}
                            style={{ width: '65px', padding: '3px 4px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', outline: 'none' }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botões de Ação da Tela */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', flexShrink: 0 }}>
            <button 
              type="button" 
              onClick={fecharTelaProgramacao}
              style={{ padding: '6px 12px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              style={{ padding: '6px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Salvar Programação
            </button>
          </div>

        </form>

      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100vh', gap: '0px', overflow: 'hidden', boxSizing: 'border-box', width: '100%', padding: '0px 1px', margin: '0px', background: '#f8fafc' }}>
      
      {/* HEADER SUPERIOR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: '#ffffff', padding: '4px 6px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flexShrink: 0, width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ backgroundColor: '#0ea5e9', color: '#fff', width: '26px', height: '26px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(14,165,233,0.2)' }}>
              <CalendarRange size={13} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.8rem', color: '#0f172a', fontWeight: '700', lineHeight: '1.1' }}>Matriz de Programação</h2>
              <p style={{ margin: '0', fontSize: '0.6rem', color: '#64748b' }}>Gestão de alocação de equipes (7 Dias).</p>
            </div>
          </div>

          <div style={{ display: "flex", border: "2px solid #cbd5e1", borderRadius: "4px", overflow: "hidden", background: "#fff", height: "26px", alignItems: "center" }}>
            <button onClick={() => moverDias(-7)} style={navBtnStyle} title="-7 Dias">
              <ChevronsLeft size={14} />
            </button>
            <button onClick={() => moverDias(-1)} style={{...navBtnStyle, borderLeft: "2px solid #cbd5e1"}} title="-1 Dia">
              <ChevronLeft size={14} />
            </button>
            <div style={{ display: "flex", borderLeft: "2px solid #cbd5e1", borderRight: "2px solid #cbd5e1", height: "100%", alignItems: "center" }}>
              <input 
                type="date" 
                value={valorInputDate}
                onChange={handleMudarDataPeloCalendario}
                style={{ border: "none", outline: "none", background: "transparent", color: "#334155", fontSize: "0.65rem", fontWeight: "600", padding: "0 6px", cursor: "pointer", fontFamily: "inherit" }}
              />
            </div>
            <button onClick={irParaHoje} style={{ ...navBtnStyle, gap: "4px", padding: "0 8px" }}>
              <Calendar size={10} /> <span style={{ fontSize: "0.65rem", fontWeight: "600" }}>Hoje</span>
            </button>
            <button onClick={() => moverDias(1)} style={{...navBtnStyle, borderLeft: "2px solid #cbd5e1"}} title="+1 Dia">
              <ChevronRight size={14} />
            </button>
            <button onClick={() => moverDias(7)} style={{...navBtnStyle, borderLeft: "2px solid #cbd5e1"}} title="+7 Dias">
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '3px', borderTop: '1px solid #e2e8f0', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', width: '100%' }}>
            <select style={{...alturaUnificadaEstilo, fontSize: '0.7rem', border: '2px solid #cbd5e1', borderRadius: '4px', padding: '0 5px', background: '#fff', color: '#334155', outline: 'none' }} value={tipoFiltroAtual} onChange={(e) => { setTipoFiltroAtual(e.target.value); setValorFiltroSelect('TODOS'); }}>
              <option value="TODOS">TODOS</option>
              <option value="busca">Prefixo</option>
              <option value="coordenador">Coordenador</option>
              <option value="supervisor">Supervisor</option>
              <option value="processo">Processo</option>
              <option value="tipo_equipe">Tipo de Equipe</option>
              <option value="regime">Regime</option>
            </select>

            {tipoFiltroAtual === 'busca' ? (
              <input 
                type="text" style={{ ...alturaUnificadaEstilo, minWidth: '140px', fontSize: '0.7rem', border: '2px solid #cbd5e1', borderRadius: '4px', padding: '0 6px', outline: 'none', background: '#fff', color: '#334155' }} 
                placeholder="Buscar..." value={valorFiltroBusca} onChange={(e) => setValorFiltroBusca(e.target.value)} 
              />
            ) : tipoFiltroAtual === 'TODOS' ? (
              <select disabled style={{ ...alturaUnificadaEstilo, minWidth: '140px', fontSize: '0.7rem', border: '2px solid #cbd5e1', borderRadius: '4px', padding: '0 5px', outline: 'none', background: '#f1f5f9', color: '#94a3b8' }} value="TODOS">
                <option value="TODOS">TODOS</option>
              </select>
            ) : (
              <select style={{ ...alturaUnificadaEstilo, minWidth: '140px', fontSize: '0.7rem', border: '2px solid #cbd5e1', borderRadius: '4px', padding: '0 5px', outline: 'none', background: '#fff', color: '#334155' }} value={valorFiltroSelect} onChange={(e) => setValorFiltroSelect(e.target.value)}>
                <option value="TODOS">TODOS</option>
                {opcoesDinamicasSelect.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            )}

            <button type="button" style={{...alturaUnificadaEstilo, fontSize: '0.7rem', padding: '0 10px', background: '#0369a1', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }} onClick={adicionarFiltroDinamico}>
              Adicionar
            </button>

            {temFiltroAtivo && (
              <button type="button" style={{...alturaUnificadaEstilo, fontSize: '0.7rem', padding: '0 8px', background: '#fff1f2', color: '#e11d48', border: '2px solid #fecdd3', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }} onClick={limparTodosFiltros}>
                <X size={9} /> Limpar
              </button>
            )}

            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Ordenar:</span>
              <select style={{ ...alturaUnificadaEstilo, fontSize: '0.7rem', border: '2px solid #cbd5e1', borderRadius: '4px', padding: '0 5px', background: '#fff', color: '#334155', outline: 'none' }} value={ordenacaoCampo} onChange={(e) => setOrdenacaoCampo(e.target.value)}>
                <option value="prefixo">Prefixo</option>
                <option value="processo">Processo</option>
                <option value="supervisor">Supervisor</option>
                <option value="coordenador">Coordenador</option>
                <option value="encarregado">Encarregado</option>
                <option value="tipo_equipe">Tipo de Equipe</option>
                <option value="regime">Regime</option>
              </select>
              
              <button 
                type="button" 
                onClick={() => setOrdenacaoDirecao(prev => prev === 'asc' ? 'desc' : 'asc')} 
                style={{ ...alturaUnificadaEstilo, width: '26px', background: '#fff', border: '2px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0px', padding: 0 }}
                title="Alternar Ordenação"
              >
                <ArrowUp size={10} strokeWidth={ordenacaoDirecao === 'asc' ? 3.5 : 1.5} style={{ opacity: ordenacaoDirecao === 'asc' ? 1 : 0.4, marginRight: '-2px' }} />
                <ArrowDown size={10} strokeWidth={ordenacaoDirecao === 'desc' ? 3.5 : 1.5} style={{ opacity: ordenacaoDirecao === 'desc' ? 1 : 0.4 }} />
              </button>
            </div>
          </div>

          {/* CHIPS DE FILTRO FIXOS */}
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', minHeight: '17px', alignItems: 'center', marginTop: '0px', marginBottom: '0px' }}>
            {temFiltroAtivo ? (
              Object.entries(filtrosAtivos).map(([key, value]) => {
                if (key === 'busca' ? value === '' : value === 'TODOS') return null;
                return (
                  <div key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '8px', fontSize: '0.58rem', fontWeight: 500, border: '1px solid #bae6fd' }}>
                    <span>{mapNomesFiltros[key]}: <strong>{value}</strong></span>
                    <button onClick={() => removerFiltro(key)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0369a1', display: 'flex', alignItems: 'center', padding: 0 }}><X size={8} /></button>
                  </div>
                );
              })
            ) : (
              <span style={{ fontSize: '0.58rem', color: 'transparent', userSelect: 'none' }}>-</span>
            )}
          </div>
        </div>
      </div>

      {/* MATRIZ DE DADOS */}
      <div style={{ background: "#fff", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflowX: "auto", overflowY: "auto", flex: 1, border: "2px solid #cbd5e1", width: "100%", display: "flex", flexDirection: "column" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: "200px", color: "#64748b", fontSize: "0.8rem" }}>
            Carregando estrutura da matriz...
          </div>
        ) : equipesFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '0.8rem' }}>
            Nenhuma equipe atende aos filtros selecionados.
          </div>
        ) : (
          <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: "1200px", fontSize: "0.75rem", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "220px", minWidth: "220px" }} />
              <col style={{ width: "calc((100% - 220px) / 7)", minWidth: "130px" }} />
              <col style={{ width: "calc((100% - 220px) / 7)", minWidth: "130px" }} />
              <col style={{ width: "calc((100% - 220px) / 7)", minWidth: "130px" }} />
              <col style={{ width: "calc((100% - 220px) / 7)", minWidth: "130px" }} />
              <col style={{ width: "calc((100% - 220px) / 7)", minWidth: "130px" }} />
              <col style={{ width: "calc((100% - 220px) / 7)", minWidth: "130px" }} />
              <col style={{ width: "calc((100% - 220px) / 7)", minWidth: "130px" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thStyle, position: "sticky", left: 0, top: 0, zIndex: 30, background: "#cbd5e1", borderRight: "2px solid #94a3b8" }}>
                  Equipe
                </th>
                {diasExibidos.map((dia, index) => {
                  const destacaHoje = isHoje(dia);
                  const destacaSelect = dataSelecionada === dia.getTime();
                  const isDomingo = dia.getDay() === 0;

                  const bgHeader = "#cbd5e1"; 
                  let borderHeader = isDomingo ? "2px solid #fdba74" : "2px solid #cbd5e1";

                  if (destacaHoje) {
                    borderHeader = "2px solid #0ea5e9";
                  } else if (destacaSelect) {
                    borderHeader = "2px solid #ca8a04";
                  }

                  return (
                    <th key={index} style={{ ...thStyle, position: "sticky", top: 0, zIndex: 20, background: bgHeader, borderBottom: borderHeader }}>
                      <div style={{ fontSize: "8px", textTransform: "uppercase", fontWeight: "700" }}>
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dia.getDay()]}
                      </div>
                      <div style={{ fontSize: "9px", marginTop: "2px", fontWeight: "800" }}>
                        {dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {equipesFiltradas.map((eq, rowIndex) => (
                <tr key={rowIndex} style={{ height: "calc(100% / 5)" }} onMouseEnter={(e) => {
                  const cells = e.currentTarget.querySelectorAll('td');
                  cells.forEach(c => c.style.backgroundColor = '#eff6ff');
                }} onMouseLeave={(e) => {
                  const cells = e.currentTarget.querySelectorAll('td');
                  cells.forEach((c, idx) => {
                    if (idx === 0) {
                      c.style.backgroundColor = '#ffffff';
                    } else {
                      const diaAtual = diasExibidos[idx - 1];
                      c.style.backgroundColor = (diaAtual && diaAtual.getDay() === 0) ? '#fff7ed' : '#ffffff';
                    }
                  });
                }}>
                  
                  {/* COLUNA FIXA DA EQUIPE */}
                  <td style={{ ...tdStyle, position: "sticky", left: 0, zIndex: 10, background: "#ffffff", borderRight: "2px solid #cbd5e1", verticalAlign: "middle", overflow: "hidden", height: "100%", transition: "background-color 0.2s" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%", overflow: "hidden", minWidth: 0 }}>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "4px", minWidth: 0 }}>
                        <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "11px", lineHeight: "1", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={eq.prefixo}>
                          {eq.prefixo}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "8px", color: "#475569", fontWeight: "700", background: "#f1f5f9", padding: "1px 4px", borderRadius: "3px", flexShrink: 0, maxWidth: "65px", border: "1px solid #cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={eq.veiculo}>
                          <Truck size={8} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{eq.veiculo || "S/P"}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "9px", color: "#334155", fontWeight: "600", lineHeight: "1", width: "100%", minWidth: 0 }}>
                        <div style={{ flexShrink: 0, display: "flex" }}>{renderProcessoIcon(eq.processo)}</div>
                        <div style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {eq.processo || "S/P"} <span style={{ color: "#cbd5e1", margin: "0 1px" }}>|</span> <span style={{ color: "#64748b" }}>{eq.regime || "S/R"}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: "8px", color: "#475569", lineHeight: "1", width: "100%", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={eq.tipo_equipe}>
                        {eq.tipo_equipe || "S/ Tipo"}
                      </div>

                      <div style={{ fontSize: "9px", color: "#64748b", lineHeight: "1", width: "100%", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={eq.encarregado}>
                        <strong>Enc:</strong> {eq.encarregado || "-"}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "inherit", border: "1px solid #cbd5e1", padding: "2px 5px", borderRadius: "3px", width: "100%", boxSizing: "border-box", marginTop: "1px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "9px", color: "#334155", lineHeight: "1.2", width: "100%", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <DollarSign size={9} color="#16a34a" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                          <strong style={{ color: "#0f172a" }}>Referência:</strong> 
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{formatarBRL(eq.meta)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "9px", color: "#334155", lineHeight: "1.2", width: "100%", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <Calendar size={8} color="#0ea5e9" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                          <strong style={{ color: "#0f172a" }}>Programado:</strong> R$ 0,00
                        </div>
                      </div>

                    </div>
                  </td>

                  {/* CÉLULAS DE DATAS */}
                  {diasExibidos.map((dia, colIndex) => {
                     const isDomingo = dia.getDay() === 0;
                     const bgCell = isDomingo ? "#fff7ed" : "#ffffff";

                     return (
                       <td key={colIndex} style={{ ...tdStyle, background: bgCell, textAlign: "center", height: "100%", verticalAlign: "middle", transition: "background-color 0.2s" }}>
                          <div 
                            style={{ position: "relative", height: "calc(100% - 4px)", minHeight: "70px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "8px", cursor: "pointer", transition: "all 0.2s", boxSizing: "border-box" }} 
                            title="Sem Programação"
                          >
                            {/* MARCADOR DE ATENÇÃO / RESTRIÇÃO */}
                            <div style={{ position: "absolute", top: "2px", left: "2px", display: "flex", alignItems: "center", justifyContent: "center" }} title="Atenção / Restrição">
                              <AlertTriangle size={13} color="#dc2626" strokeWidth={2.5} />
                            </div>

                            {/* BOTÕES NOVO / EDITAR NO CANTO SUPERIOR DIREITO */}
                            <div style={{ position: "absolute", top: "2px", right: "2px", display: "flex", gap: "3px" }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                title="Novo"
                                onClick={() => abrirTelaProgramacao('novo', eq, dia)} 
                                style={{ background: "transparent", border: "none", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
                              >
                                <Plus size={11} strokeWidth={2.5} />
                              </button>
                              <button 
                                title="Editar"
                                onClick={() => abrirTelaProgramacao('editar', eq, dia)} 
                                style={{ background: "transparent", border: "none", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
                              >
                                <Edit2 size={10} strokeWidth={2} />
                              </button>
                            </div>

                            Sem Programação
                          </div>
                       </td>
                     )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DIV DE LEGENDA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', flexShrink: 0, fontSize: '0.7rem', color: '#475569' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>Equipes visíveis: <strong>{equipesFiltradas.length}</strong></span>
          <span>Meta (Soma): <strong style={{ color: '#16a34a' }}>{formatarBRL(somaMetasVisiveis)}</strong></span>
          <span>Programado: <strong style={{ color: '#0ea5e9' }}>R$ 0,00</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '700', color: '#0f172a' }}>Legenda:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#22c55e' }}></div>
            <span>Poda / Vegetação</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#0ea5e9' }}></div>
            <span>Obras</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#eab308' }}></div>
            <span>Manutenção</span>
          </div>
        </div>
      </div>

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer; opacity: 0.5; transition: 0.2s;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

const thStyle = {
  padding: "5px 8px", borderBottom: "2px solid #cbd5e1",
  borderRight: "2px solid #cbd5e1", color: "#334155",
  fontWeight: "700", textAlign: "center", overflow: "hidden"
};

const tdStyle = {
  padding: "3px 8px", borderRight: "2px solid #cbd5e1",
  borderBottom: "2px solid #cbd5e1"
};

const thModalStyle = {
  padding: "4px 6px", borderBottom: "1px solid #cbd5e1", color: "#334155", fontWeight: "700"
};

const tdModalStyle = {
  padding: "4px 6px", borderBottom: "1px solid #e2e8f0", color: "#334155"
};

const navBtnStyle = {
  background: "transparent", border: "none", color: '#475569',
  padding: "0 10px", cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center", transition: "background 0.2s", height: "100%"
};