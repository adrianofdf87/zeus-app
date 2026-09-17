import React, { useState, useEffect, useRef } from "react";
import { 
  Briefcase, Map, CheckCircle, Calendar, Flag, FileText, Package, Wrench, 
  Paperclip, Upload, PlusCircle, Edit3, Trash2, RefreshCw, 
  Download, FilterX, Columns3, ChevronRight, ChevronsLeft, ChevronsRight, 
  ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown, Search
} from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "../../services/supabase";
import { abrirModalAtividade } from "./carteira_novo";

export default function Carteira() {
  const sessaoUsuario = JSON.parse(localStorage.getItem("usuario_logado")) || {};
  const userIdKey = sessaoUsuario.id || sessaoUsuario.email || 'geral';

  const perfilUsuario = String(
    sessaoUsuario.Perfil || 
    sessaoUsuario.perfil || 
    sessaoUsuario.cargo || 
    sessaoUsuario.tipo || 
    sessaoUsuario.role || 
    ''
  ).trim().toLowerCase();
  
  const podeExcluir = perfilUsuario === 'desenvolvedor' || perfilUsuario === 'gerente';

  const [abaAtiva, setAbaAtiva] = useState("aba-carteira");
  const [listaCarteiraGlobal, setListaCarteiraGlobal] = useState([]);
  const [colunasTabela, setColunasTabela] = useState([]);
  const [estruturaTabela, setEstruturaTabela] = useState([]);
  const [colunasOcultas, setColunasOcultas] = useState(() => JSON.parse(localStorage.getItem(`colunasOcultas_carteira_${userIdKey}`)) || []);
  const [colunasOrdem, setColunasOrdem] = useState(() => JSON.parse(localStorage.getItem(`colunasOrdem_carteira_${userIdKey}`)) || []);
  const [colunasApelidos, setColunasApelidos] = useState(() => JSON.parse(localStorage.getItem(`colunasApelidos_carteira_${userIdKey}`)) || {});

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(100);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [colunaOrdenacao, setColunaOrdenacao] = useState('id');
  const [ordemAscendente, setOrdemAscendente] = useState(false);
  const [filtrosAtivosGlobais, setFiltrosAtivosGlobais] = useState({});
  const [busca, setBusca] = useState("");
  
  const [colunaAtualSendoFiltrada, setColunaAtualSendoFiltrada] = useState('');
  const [termoBuscaFiltro, setTermoBuscaFiltro] = useState('');
  const [popupFiltroAberto, setPopupFiltroAberto] = useState(false);
  const [popupColunasAberto, setPopupColunasAberto] = useState(false);
  
  const [totais, setTotais] = useState({
    equipes: 0, referencia: 0, servicos: 0, percentual: 0,
    ticketMedio: 0, qtdObras: 0, poste: 0, kmmt: 0, kmbt: 0, trafo: 0, clientes: 0
  });

  const [idsSelecionados, setIdsSelecionados] = useState([]);
  
  const abasScrollRef = useRef(null);
  const [temOverflowAbas, setTemOverflowAbas] = useState(false);
  const [podeRolarAbasEsq, setPodeRolarAbasEsq] = useState(false);
  const [podeRolarAbasDir, setPodeRolarAbasDir] = useState(false);

  const kpisScrollRef = useRef(null);
  const [temOverflowKpis, setTemOverflowKpis] = useState(false);
  const [podeRolarKpisEsq, setPodeRolarKpisEsq] = useState(false);
  const [podeRolarKpisDir, setPodeRolarKpisDir] = useState(false);

  useEffect(() => {
    carregarEstrutura();
  }, []);

  useEffect(() => {
    carregarCarteira();
    calcularTotalReferencia();
  }, [paginaAtual, registrosPorPagina, colunaOrdenacao, ordemAscendente, filtrosAtivosGlobais, busca]);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (!e.target.closest('.excel-filter-popup') && !e.target.closest('.excel-filter-btn')) {
        setPopupFiltroAberto(false);
        setPopupColunasAberto(false);
      }
    };
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  const carregarEstrutura = async () => {
    try {
      const { data, error } = await supabase.rpc('obter_estrutura_tabela', { p_tabela: 'tabe_cad_carteira' });
      if (!error && Array.isArray(data)) {
        setEstruturaTabela(data);
      }
    } catch (e) {
      console.error("Erro ao carregar estrutura:", e);
    }
  };

  const verificarScrollAbas = () => {
    const el = abasScrollRef.current;
    if (el) {
      const temOver = el.scrollWidth > el.clientWidth + 2;
      setTemOverflowAbas(temOver);
      setPodeRolarAbasEsq(el.scrollLeft > 2);
      setPodeRolarAbasDir(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    }
  };

  const verificarScrollKpis = () => {
    const el = kpisScrollRef.current;
    if (el) {
      const temOver = el.scrollWidth > el.clientWidth + 2;
      setTemOverflowKpis(temOver);
      setPodeRolarKpisEsq(el.scrollLeft > 2);
      setPodeRolarKpisDir(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    }
  };

  useEffect(() => {
    const elAbas = abasScrollRef.current;
    const elKpis = kpisScrollRef.current;

    if (elAbas) {
      verificarScrollAbas();
      elAbas.addEventListener('scroll', verificarScrollAbas);
    }
    if (elKpis) {
      verificarScrollKpis();
      elKpis.addEventListener('scroll', verificarScrollKpis);
    }

    const handleResize = () => {
      verificarScrollAbas();
      verificarScrollKpis();
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);

    return () => {
      clearTimeout(timer);
      if (elAbas) elAbas.removeEventListener('scroll', verificarScrollAbas);
      if (elKpis) elKpis.removeEventListener('scroll', verificarScrollKpis);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const formatarDataBrasil = (valor, coluna = '') => {
    const colLower = coluna.toLowerCase();
    
    if (colLower === 'id' || colLower.includes('id_') || colLower.includes('_id') || colLower.includes('rastreio') || colLower.includes('nota')) {
        return (valor === null || valor === undefined || valor === '##NULL##' || String(valor).trim() === '') ? 'N/A' : String(valor).trim();
    }
    
    if (valor === null || valor === undefined || valor === '##NULL##' || valor === 'PLACEHOLDER' || String(valor).trim() === '') {
        return 'N/A';
    }

    if (colLower.includes('valor') || colLower.includes('total') || colLower.includes('custo') || colLower.includes('preco') || colLower.includes('servico') || colLower.includes('serviço')) {
        const num = parseFloat(valor);
        if (!isNaN(num)) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    }

    const strVal = String(valor).trim();
    
    if (/^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(strVal)) {
        const dataObj = new Date(strVal);
        if (!isNaN(dataObj.getTime())) {
            try {
                return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(dataObj).replace(',', '');
            } catch (e) { return strVal; }
        }
    }
    return strVal;
  };

  const aplicarFiltrosNaQuery = (queryObj, ignorarColuna = null) => {
    Object.keys(filtrosAtivosGlobais).forEach(col => {
        if (ignorarColuna && col === ignorarColuna) return;
        const filtros = filtrosAtivosGlobais[col];
        if (filtros && filtros.length > 0) {
            const hasNull = filtros.includes("##NULL##");
            const realValues = filtros.filter(v => v !== "##NULL##");
            if (hasNull && realValues.length === 0) {
                queryObj = queryObj.is(col, null);
            } else if (hasNull && realValues.length > 0) {
                const strVals = realValues.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
                queryObj = queryObj.or(`${col}.in.(${strVals}),${col}.is.null`);
            } else {
                queryObj = queryObj.in(col, realValues);
            }
        }
    });
    return queryObj;
  };

  const mudarAba = (abaId) => {
    const abasComRestricao = ['aba-materiais', 'aba-servicos', 'aba-lto', 'aba-anexos', 'aba-viabilidade', 'aba-encerramento', 'aba-programacao'];
    if (abasComRestricao.includes(abaId) && idsSelecionados.length !== 1) {
        Swal.fire({ icon: "warning", title: "Atenção", text: "Por favor, selecione uma atividade na carteira antes de acessar esta aba.", confirmButtonColor: "#005596" });
        return;
    }
    setAbaAtiva(abaId);
  };

  const carregarCarteira = async () => {
    try {
      let query = supabase.from("tabe_cad_carteira").select("*", { count: 'exact' });
      query = aplicarFiltrosNaQuery(query);

      const termoBruto = busca.trim();
      if (termoBruto.length >= 3) {
        let colunasTexto = [];
        if (estruturaTabela.length > 0) {
          colunasTexto = estruturaTabela
            .filter(c => String(c.tipo || c.data_type || '').toLowerCase().match(/char|text|string/))
            .map(c => c.nome_coluna);
        }

        if (colunasTexto.length === 0 && listaCarteiraGlobal.length > 0) {
          colunasTexto = Object.keys(listaCarteiraGlobal[0]);
        }

        if (colunasTexto.length > 0) {
          const termos = termoBruto.split(/[,;\n\r\s]+/).map(t => t.trim()).filter(t => t.length > 0);
          if (termos.length > 0) {
            const condicoesGerais = [];
            termos.forEach(t => {
              colunasTexto.forEach(col => {
                const colLower = col.toLowerCase();
                if (!colLower.includes('data') && !colLower.includes('_at')) {
                  condicoesGerais.push(`${col}.ilike.%${t}%`);
                }
              });
            });
            if (condicoesGerais.length > 0) {
              query = query.or(condicoesGerais.join(','));
            }
          }
        }
      }

      const from = (paginaAtual - 1) * registrosPorPagina;
      const { data, count, error } = await query.range(from, from + registrosPorPagina - 1).order(colunaOrdenacao, { ascending: ordemAscendente });
      if (error) throw error;

      setTotalRegistros(count || 0);
      const registros = data || [];
      setListaCarteiraGlobal(registros);
      calcularTotais(registros);

      if (registros.length > 0 && colunasTabela.length === 0) {
          let todasColunas = Object.keys(registros[0]);
          let colInit = colunasOrdem.length > 0 ? colunasOrdem.filter(c => todasColunas.includes(c) && !colunasOcultas.includes(c)) : todasColunas.filter(c => !colunasOcultas.includes(c));
          setColunasTabela(colInit);
      }
    } catch (err) {
      Swal.fire("Erro", "Falha ao carregar a carteira de atividades: " + err.message, "error");
    }
  };

  const handleOrdenar = (coluna) => {
    if (colunaOrdenacao === coluna) {
      setOrdemAscendente(!ordemAscendente);
    } else {
      setColunaOrdenacao(coluna);
      setOrdemAscendente(true);
    }
  };

  const handleEditarAtividade = () => {
    if (idsSelecionados.length !== 1) return;
    abrirModalAtividade(idsSelecionados[0], carregarCarteira);
  };

  const handleExcluirAtividade = async () => {
    if (idsSelecionados.length !== 1) return;
    const idParaExcluir = idsSelecionados[0];

    const confirmacao = await Swal.fire({
      title: 'Deseja Excluir?',
      text: `A atividade de ID: ${idParaExcluir}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (confirmacao.isConfirmed) {
      try {
        const { data: atividadeObj } = await supabase
          .from("tabe_cad_carteira")
          .select("id_rastreio")
          .eq('id', idParaExcluir)
          .maybeSingle();

        const idRastreio = atividadeObj?.id_rastreio;

        await supabase.from("tabe_cad_carteira_log").delete().eq('id_atividade', idParaExcluir);
        const { error: errPrincipal } = await supabase.from("tabe_cad_carteira").delete().eq('id', idParaExcluir);

        if (errPrincipal) throw errPrincipal;

        if (idRastreio) {
          await supabase.from("tabe_imp_pep_lto").update({ id_atividade: null }).eq('nota', idRastreio);
        }

        Swal.fire({ icon: 'success', title: 'Excluído!', text: 'Atividade, logs e vínculos desfeitos com sucesso.', timer: 2000, showConfirmButton: false });
        setIdsSelecionados([]);
        carregarCarteira();
      } catch (err) {
        Swal.fire('Erro', 'Não foi possível excluir a atividade: ' + err.message, 'error');
      }
    }
  };

  const calcularTotais = (registros) => {
    let somas = { servicos: 0, poste: 0, kmmt: 0, kmbt: 0, trafo: 0, clientes: 0 };
    let listaParaCalcular = idsSelecionados.length > 0 ? registros.filter(item => idsSelecionados.includes(String(item.id))) : registros;

    listaParaCalcular.forEach(item => {
        somas.servicos += parseFloat(item.servicos || item.Servicos || item.serviços || 0);
        somas.poste += parseFloat(item.poste || item.Poste || 0);
        somas.kmmt += parseFloat(item.km_mt || item.Km_mt || 0);
        somas.kmbt += parseFloat(item.km_bt || item.Km_bt || 0);
        somas.trafo += parseFloat(item.trafo || item.Trafo || 0);
        somas.clientes += parseFloat(item.cliente || item.Cliente || 0);
    });

    const qtdObras = listaParaCalcular.length;
    const ticketMedio = qtdObras > 0 ? (somas.servicos / qtdObras) : 0;
    setTotais(prev => ({ ...prev, ...somas, qtdObras, ticketMedio }));
  };

  const calcularTotalReferencia = async () => {
    try {
        const { data: maxDateData } = await supabase.from("tabe_imp_equipes_jupiter").select("mes_comp").order("mes_comp", { ascending: false }).limit(1);
        let somaMeta = 0, setEquipes = new Set();
        if (maxDateData && maxDateData.length > 0) {
            const { data } = await supabase.from("tabe_imp_equipes_jupiter").select("meta, prefixo").eq("mes_comp", maxDateData[0].mes_comp).eq("regime", "PRODUTIVIDADE").in("processo", ["OBRAS", "MANUTENÇÃO"]);
            (data || []).forEach(item => {
                somaMeta += parseFloat(item.meta || 0);
                if (item.prefixo) setEquipes.add(String(item.prefixo).trim());
            });
        }
        setTotais(prev => ({ ...prev, referencia: somaMeta, equipes: setEquipes.size, percentual: somaMeta > 0 ? prev.servicos / somaMeta : 0 }));
    } catch (err) { console.error(err); }
  };

  const abrirFiltroColuna = (coluna, e) => {
    e.stopPropagation();
    setColunaAtualSendoFiltrada(coluna);
    setTermoBuscaFiltro('');
    setPopupFiltroAberto(true);
    setPopupColunasAberto(false);
  };

  const rolarAbas = (direcao) => {
    if (abasScrollRef.current) {
      abasScrollRef.current.scrollBy({ left: direcao * 250, behavior: 'smooth' });
      setTimeout(verificarScrollAbas, 250);
    }
  };

  const rolarKpis = (direcao) => {
    if (kpisScrollRef.current) {
      kpisScrollRef.current.scrollBy({ left: direcao * 200, behavior: 'smooth' });
      setTimeout(verificarScrollKpis, 250);
    }
  };

  const abasFixas = [
    { id: 'aba-carteira', label: 'Carteira', icon: Briefcase },
    { id: 'aba-mapa', label: 'Mapa', icon: Map }
  ];

  const abasMoveis = [
    { id: 'aba-viabilidade', label: 'Viabilidade', icon: CheckCircle, locked: idsSelecionados.length !== 1 },
    { id: 'aba-programacao', label: 'Programação', icon: Calendar, locked: idsSelecionados.length !== 1 },
    { id: 'aba-encerramento', label: 'Encerramento', icon: Flag, locked: idsSelecionados.length !== 1 },
    { id: 'aba-lto', label: 'Lista Técnica', icon: FileText, locked: idsSelecionados.length !== 1 },
    { id: 'aba-materiais', label: 'Materiais', icon: Package, locked: idsSelecionados.length !== 1 },
    { id: 'aba-servicos', label: 'Serviços', icon: Wrench, locked: idsSelecionados.length !== 1 },
    { id: 'aba-anexos', label: 'Anexos', icon: Paperclip, locked: idsSelecionados.length !== 1 },
  ];

  const getTabStyle = (isActive, isLocked) => ({
    background: isActive ? '#fff' : 'transparent',
    border: 'none',
    borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
    padding: '8px 14px',
    fontSize: '0.85rem',
    fontWeight: isActive ? '700' : '500',
    color: isActive ? '#0284c7' : isLocked ? '#94a3b8' : '#475569',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '6px 6px 0 0',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    opacity: isLocked ? 0.6 : 1,
    height: '37px'
  });

  return (
    <div translate="no" style={{ padding: '0 15px 10px 15px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden', background: '#f8fafc' }}>
      
      <style>{`
        .custom-scroll::-webkit-scrollbar { height: 0px; display: none; }
        .custom-scroll { scrollbar-width: none; }
        .tabela-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .tabela-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .tabela-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .tabela-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* Abas de Navegação Superior */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#f8fafc', paddingTop: '10px', paddingBottom: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '14px' }}>
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', position: 'relative' }}>
          <button onClick={() => rolarAbas(-1)} disabled={!podeRolarAbasEsq} style={{ ...minimalScrollBtnStyle, display: temOverflowAbas ? 'flex' : 'none', marginRight: '6px' }}>
            <ChevronLeft size={15} />
          </button>

          <div style={{ display: 'flex', gap: '6px', flexShrink: 0, background: '#f8fafc', zIndex: 3, alignItems: 'center' }}>
            {abasFixas.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => mudarAba(tab.id)} style={getTabStyle(abaAtiva === tab.id, false)}>
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          <div ref={abasScrollRef} className="custom-scroll" onScroll={verificarScrollAbas} style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, paddingLeft: '4px', paddingRight: '4px', alignItems: 'center' }}>
            {abasMoveis.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => mudarAba(tab.id)} style={getTabStyle(abaAtiva === tab.id, tab.locked)}>
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          <button onClick={() => rolarAbas(1)} disabled={!podeRolarAbasDir} style={{ ...minimalScrollBtnStyle, display: temOverflowAbas ? 'flex' : 'none', marginLeft: '4px' }}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {abaAtiva === 'aba-carteira' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '12px', overflow: 'hidden' }}>
          
          {/* Barra de Pesquisa Geral e Ações */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Pesquisar geral (separe por vírgula, ponto e vírgula ou cole colunas)..." 
                value={busca} 
                onChange={e => { setBusca(e.target.value); setPaginaAtual(1); }} 
                onPaste={e => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text');
                  const formattedText = pastedText.split(/[\r\n]+/).map(t => t.trim()).filter(Boolean).join(', ');
                  setBusca(formattedText);
                  setPaginaAtual(1);
                }}
                style={{ width: '100%', padding: '0 12px 0 38px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', background: '#fff', boxSizing: 'border-box' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>         
              <button style={btnStyle} onClick={() => abrirModalAtividade(null, carregarCarteira)}><PlusCircle size={14} /> Novo</button>
              <button style={{ ...btnStyle, opacity: idsSelecionados.length !== 1 ? 0.4 : 1 }} disabled={idsSelecionados.length !== 1} onClick={handleEditarAtividade}><Edit3 size={14} /> Editar</button>
              
              {podeExcluir && (
                <button style={{ ...btnStyle, color: '#dc2626', borderColor: '#fca5a5', opacity: idsSelecionados.length !== 1 ? 0.4 : 1 }} disabled={idsSelecionados.length !== 1} onClick={handleExcluirAtividade}><Trash2 size={14} /> Excluir</button>
              )}

              <button style={btnStyle} onClick={carregarCarteira}><RefreshCw size={14} /> Atualizar</button>
              <button style={btnStyle}><Upload size={14} /> Importar</button> 
              <button style={btnStyle}><Download size={14} /> Exportar</button>
              {(Object.keys(filtrosAtivosGlobais).length > 0 || busca.trim().length > 0) && (
                <button style={{ ...btnStyle, color: '#0284c7' }} onClick={() => { setFiltrosAtivosGlobais({}); setBusca(''); }}><FilterX size={14} /> Limpar Filtros</button>
              )}
            </div>
          </div>

          {/* Cards de KPIs */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <button onClick={() => rolarKpis(-1)} disabled={!podeRolarKpisEsq} style={{ ...minimalScrollBtnStyle, display: temOverflowKpis ? 'flex' : 'none', marginRight: '8px' }}>
                <ChevronLeft size={15} />
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(80px, 1fr))', gap: '8px', textAlign: 'center', flexShrink: 0, paddingRight: '12px', borderRight: '2px solid #cbd5e1' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Qtd Equipes</span>
                  <strong style={{ fontSize: '0.85rem', color: '#005596' }}>{totais.equipes}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Valor Referência</span>
                  <strong style={{ fontSize: '0.85rem', color: '#005596' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totais.referencia)}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Valor Carteira</span>
                  <strong style={{ fontSize: '0.85rem', color: '#005596' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totais.servicos)}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>% (Carteira)</span>
                  <strong style={{ fontSize: '0.85rem', color: '#005596' }}>{new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(totais.percentual)}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Ticket Médio</span>
                  <strong style={{ fontSize: '0.85rem', color: '#005596' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totais.ticketMedio)}</strong>
                </div>
              </div>

              <div ref={kpisScrollRef} className="custom-scroll" onScroll={verificarScrollKpis} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(90px, 1fr))', gap: '5px', textAlign: 'center', overflowX: 'auto', flex: 1, paddingLeft: '8px', paddingRight: '8px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Qtd Obras</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{totais.qtdObras}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Postes</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{totais.poste}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Rede MT (m)</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{totais.kmmt}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Rede BT (m)</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{totais.kmbt}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Trafos</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{totais.trafo}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Clientes</span>
                  <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{totais.clientes}</strong>
                </div>
              </div>

              <button onClick={() => rolarKpis(1)} disabled={!podeRolarKpisDir} style={{ ...minimalScrollBtnStyle, display: temOverflowKpis ? 'flex' : 'none', marginLeft: '8px' }}>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Estrutura da Tabela baseada no padrão DataTable */}
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="tabela-scroll" style={{ width: '100%', flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ width: '40px', textAlign: 'center', padding: '10px 8px', borderBottom: '2px solid #cbd5e1' }}>
                      <button onClick={() => setPopupColunasAberto(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><Columns3 size={14} /></button>
                    </th>
                    {colunasTabela.map(coluna => {
                      const nomeFormatado = colunasApelidos[coluna] || (coluna.charAt(0).toUpperCase() + coluna.slice(1).replace(/_/g, ' '));
                      const estaOrdenada = colunaOrdenacao === coluna;
                      return  (
                        <th key={coluna} style={{ padding: '10px 12px', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontWeight: '600' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span 
                              onClick={() => handleOrdenar(coluna)} 
                              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}
                            >
                              {nomeFormatado}
                              {estaOrdenada ? (
                                ordemAscendente ? <ArrowUp size={13} color="#0284c7" /> : <ArrowDown size={13} color="#0284c7" />
                              ) : (
                                <ArrowUpDown size={12} color="#94a3b8" />
                              )}
                            </span>
                            <button onClick={(e) => abrirFiltroColuna(coluna, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {listaCarteiraGlobal.length === 0 ? (
                    <tr><td colSpan={colunasTabela.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nenhum registro encontrado.</td></tr>
                  ) : (
                    listaCarteiraGlobal.map((item, index) => {
                      const estaSelecionado = idsSelecionados.includes(String(item.id));
                      return (
                        <tr 
                          key={item.id} 
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', 
                            backgroundColor: estaSelecionado ? '#eff6ff' : index % 2 === 0 ? '#ffffff' : '#fcfcfc',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ textAlign: 'center', padding: '8px' }}>
                            <input 
                              type="checkbox" 
                              checked={estaSelecionado}
                              onChange={(e) => setIdsSelecionados(e.target.checked ? [String(item.id)] : [])} 
                            />
                          </td>
                          {colunasTabela.map(coluna => {
                            const valor = formatarDataBrasil(item[coluna], coluna);
                            return <td key={coluna} style={{ padding: '8px 12px', color: '#334151' }}>{valor}</td>;
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé e Paginação do DataTable */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#64748b', flexShrink: 0 }}>
              <span>Mostrando <strong>{listaCarteiraGlobal.length}</strong> de <strong>{totalRegistros}</strong> registros</span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select value={registrosPorPagina} onChange={e => setRegistrosPorPagina(Number(e.target.value))} style={{ height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', padding: '0 6px' }}>
                  <option value="100">100 registros</option>
                  <option value="500">500 registros</option>
                  <option value="1000">1000 registros</option>
                </select>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button onClick={() => setPaginaAtual(1)} disabled={paginaAtual <= 1} style={pageBtnStyle}><ChevronsLeft size={13} /></button>
                  <button onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} disabled={paginaAtual <= 1} style={pageBtnStyle}><ChevronLeft size={13} /></button>
                  <span style={{ padding: '0 6px' }}>Pág {paginaAtual} de {Math.ceil(totalRegistros / registrosPorPagina) || 1}</span>
                  <button onClick={() => setPaginaAtual(p => p + 1)} disabled={paginaAtual >= Math.ceil(totalRegistros / registrosPorPagina)} style={pageBtnStyle}><ChevronRight size={13} /></button>
                  <button onClick={() => setPaginaAtual(Math.ceil(totalRegistros / registrosPorPagina) || 1)} disabled={paginaAtual >= Math.ceil(totalRegistros / registrosPorPagina)} style={pageBtnStyle}><ChevronsRight size={13} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '8px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <h3>Módulo: {abaAtiva.replace('aba-', '').toUpperCase()}</h3>
          <p style={{ color: '#64748b', margin: '8px 0 16px 0' }}>Dados detalhados da obra selecionada.</p>
          <button style={btnStyle} onClick={() => setAbaAtiva('aba-carteira')}><Briefcase size={14} /> Voltar para a Carteira</button>
        </div>
      )}

    </div>
  );
}

const btnStyle = {
  background: '#fff',
  color: '#334151',
  border: '1px solid #cbd5e1',
  padding: '6px 12px',
  minWidth: '100px',
  borderRadius: '6px',
  fontSize: '0.8rem',
  fontWeight: '600',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
};

const pageBtnStyle = {
  width: '26px',
  height: '26px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer'
};

const minimalScrollBtnStyle = {
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#475569',
  flexShrink: 0,
  boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
};