import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Briefcase, Map, CheckCircle, Calendar, Flag, FileText, Package, Wrench, 
  Paperclip, Upload, PlusCircle, Edit3, Trash2, RefreshCw, 
  Download, FilterX, ChevronRight, ChevronLeft, Search
} from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "../../services/supabase";
import { abrirModalAtividade } from "./carteira_novo";
import DataTable from "../../models/DataTable";

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
  const [estruturaTabela, setEstruturaTabela] = useState([]);
  const [loading, setLoading] = useState(true);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(100);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [filtrosColunas, setFiltrosColunas] = useState({});
  const [busca, setBusca] = useState("");
  const [limparFiltrosTrigger, setLimparFiltrosTrigger] = useState(0);
  
  const [totais, setTotais] = useState({
    equipes: 0, referencia: 0, servicos: 0, percentual: 0,
    ticketMedio: 0, qtdObras: 0, poste: 0, kmmt: 0, kmbt: 0, trafo: 0, clientes: 0
  });

  const [idsSelecionados, setIdsSelecionados] = useState([]);
  const [registroSelecionadoObj, setRegistroSelecionadoObj] = useState(null);
  
  const abasScrollRef = useRef(null);
  const [temOverflowAbas, setTemOverflowAbas] = useState(false);
  const [podeRolarAbasEsq, setPodeRolarAbasEsq] = useState(false);
  const [podeRolarAbasDir, setPodeRolarAbasDir] = useState(false);

  const kpisScrollRef = useRef(null);
  const [temOverflowKpis, setTemOverflowKpis] = useState(false);
  const [podeRolarKpisEsq, setPodeRolarKpisEsq] = useState(false);
  const [podeRolarKpisDir, setPodeRolarKpisDir] = useState(false);

  const isInitialMount = useRef(true);
  const getEl = (id) => document.getElementById(id);

  useEffect(() => {
    if (!getEl('carteira-import-styles')) {
      const style = document.createElement('style');
      style.id = 'carteira-import-styles';
      style.innerHTML = `
        @keyframes lucide-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .lucide-spin { animation: lucide-spin 2s linear infinite; }
        
        @keyframes loadingDots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }
        .loading-dots::after {
          display: inline-block;
          animation: loadingDots 1.5s infinite steps(4, end);
          content: '';
          width: 16px;
          text-align: left;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    carregarEstrutura();
    calcularTotalReferencia();
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

  const aplicarFiltrosAuxiliares = (query) => {
    Object.keys(filtrosColunas).forEach(col => {
      const regras = filtrosColunas[col];
      if (regras && regras.length > 0) {
        const exatos = regras.filter(f => !f.startsWith(">=|") && !f.startsWith("<=|"));
        const maiorQue = regras.find(f => f.startsWith(">=|"))?.split(">=|")[1];
        const menorQue = regras.find(f => f.startsWith("<=|"))?.split("<=|")[1];
        if (exatos.length > 0) {
          const temNull = exatos.includes("##NULL##");
          const vals = exatos.filter(v => v !== "##NULL##");
          if (temNull && vals.length > 0) query = query.or(`${col}.in.(${vals.join(',')}),${col}.is.null`);
          else if (temNull) query = query.is(col, null);
          else query = query.in(col, exatos);
        }
        if (maiorQue !== undefined && maiorQue !== "") query = query.gte(col, Number(maiorQue));
        if (menorQue !== undefined && menorQue !== "") query = query.lte(col, Number(menorQue));
      }
    });
    return query;
  };

  const carregarCarteira = useCallback(async (isBackground = false) => {
    setLoading(true);
    if (!isBackground) {
      setListaCarteiraGlobal([]);
    }

    try {
      let estData = estruturaTabela;
      if (estData.length === 0) {
        const { data: estRes } = await supabase.rpc('obter_estrutura_tabela', { p_tabela: 'tabe_cad_carteira' });
        if (Array.isArray(estRes)) {
          estData = estRes;
          setEstruturaTabela(estRes);
        }
      }

      let query = supabase.from("tabe_cad_carteira").select("*", { count: 'exact' });
      query = aplicarFiltrosAuxiliares(query);

      const termoBruto = busca.trim();
      if (termoBruto.length >= 3) {
        let colunasTexto = estData
          .filter(c => String(c.tipo || c.data_type || '').toLowerCase().match(/char|text|string/))
          .map(c => c.nome_coluna);

        if (colunasTexto.length === 0) {
          colunasTexto = ['id_rastreio', 'pep', 'descricao', 'municipio', 'regional'];
        }

        if (colunasTexto.length > 0) {
          // Mantém frases com espaços unidas, dividindo apenas por vírgulas ou ponto e vírgula
          const termos = termoBruto.split(/[,;]+/).map(t => t.trim()).filter(t => t.length > 0);
          
          if (termos.length > 0) {
            const condicoesGerais = [];
            termos.forEach(t => {
              const termoLimpo = t.replace(/[(),.]/g, ' ').trim();
              if (termoLimpo.length > 0) {
                colunasTexto.forEach(col => {
                  const colLower = col.toLowerCase();
                  if (!colLower.includes('data') && !colLower.includes('_at')) {
                    condicoesGerais.push(`${col}.ilike.%${termoLimpo}%`);
                  }
                });
              }
            });

            if (condicoesGerais.length > 0) {
              query = query.or(condicoesGerais.join(','));
            }
          }
        }
      }

      const from = (paginaAtual - 1) * registrosPorPagina;
      const { data, count, error } = await query
        .range(from, from + registrosPorPagina - 1)
        .order('id', { ascending: false });

      if (error) throw error;

      setTotalRegistros(count || 0);
      const registros = data || [];
      setListaCarteiraGlobal(registros);
      calcularTotais(registros);
    } catch (err) {
      Swal.fire("Erro", "Falha ao carregar a carteira de atividades: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [paginaAtual, registrosPorPagina, filtrosColunas, busca, estruturaTabela]);

  useEffect(() => {
    const isBg = !isInitialMount.current;
    if (isInitialMount.current) isInitialMount.current = false;
    carregarCarteira(isBg);
  }, [carregarCarteira]);

  const buscarOpcoesColunaBanco = async (coluna, termo = "") => {
    try {
      const { data, error } = await supabase.rpc('obter_distintos_coluna', { p_tabela: 'tabe_cad_carteira', p_coluna: coluna });
      if (error) throw error;
      return (data || []).reduce((acc, item) => {
        let isNull = item.valor === null || item.valor === undefined || String(item.valor).trim() === "";
        let chave = isNull ? "##NULL##" : String(item.valor);
        let exibicao = isNull ? "-" : String(item.valor);
        if (!termo || exibicao.toLowerCase().includes(termo.toLowerCase())) acc.push({ chave, exibicao });
        return acc;
      }, []).sort((a, b) => a.exibicao.localeCompare(b.exibicao));
    } catch (err) {
      console.error("Erro ao buscar opções:", err); return [];
    }
  };

  const handleSelectionChange = (ids) => {
    setIdsSelecionados(ids);
    if (ids.length === 1) {
      const obj = listaCarteiraGlobal.find(u => String(u.id) === String(ids[0])) || null;
      setRegistroSelecionadoObj(obj);
    } else {
      setRegistroSelecionadoObj(null);
    }
    calcularTotais(listaCarteiraGlobal);
  };

  const mudarAba = (abaId) => {
    const abasComRestricao = ['aba-materiais', 'aba-servicos', 'aba-lto', 'aba-anexos', 'aba-viabilidade', 'aba-encerramento', 'aba-programacao'];
    if (abasComRestricao.includes(abaId) && idsSelecionados.length !== 1) {
        Swal.fire({ icon: "warning", title: "Atenção", text: "Por favor, selecione uma atividade na carteira antes de acessar esta aba.", confirmButtonColor: "#005596" });
        return;
    }
    setAbaAtiva(abaId);
  };

  const handleEditarAtividade = () => {
    if (idsSelecionados.length !== 1) return;
    abrirModalAtividade(idsSelecionados[0], () => carregarCarteira(false));
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
        carregarCarteira(false);
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

  const limparTodosFiltros = () => {
    setBusca("");
    setFiltrosColunas({});
    setPaginaAtual(1);
    setLimparFiltrosTrigger(p => p + 1);
  };

  const temFiltroAtivo = busca.trim().length > 0 || Object.values(filtrosColunas).some(r => Array.isArray(r) && r.length > 0);

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
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
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
                style={{ width: '100%', padding: '0 12px 0 36px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', background: '#fff', boxSizing: 'border-box' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {temFiltroAtivo && (
                <button 
                  style={{ ...btnStyle, color: '#dc2626', minWidth: '32px', width: '32px', padding: '0', justifyContent: 'center' }} 
                  title="Limpar filtros e busca"
                  onClick={limparTodosFiltros}
                >
                  <FilterX size={14} />
                </button>
              )}        
              <button style={btnStyle} onClick={() => abrirModalAtividade(null, () => carregarCarteira(false))}><PlusCircle size={14} /> Novo</button>
              <button style={{ ...btnStyle, opacity: idsSelecionados.length !== 1 ? 0.4 : 1 }} disabled={idsSelecionados.length !== 1} onClick={handleEditarAtividade}><Edit3 size={14} /> Editar</button>
              
              {podeExcluir && (
                <button style={{ ...btnStyle, color: '#dc2626', borderColor: '#fca5a5', opacity: idsSelecionados.length !== 1 ? 0.4 : 1 }} disabled={idsSelecionados.length !== 1} onClick={handleExcluirAtividade}><Trash2 size={14} /> Excluir</button>
              )}

              <button style={btnStyle} onClick={() => carregarCarteira(false)}><RefreshCw size={14} className={loading ? "lucide-spin" : ""} /> Atualizar</button>
              <button style={btnStyle}><Upload size={14} /> Importar</button> 
              <button style={btnStyle}><Download size={14} /> Exportar</button>
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

          {/* DataTable Avançado com Loader integrado */}
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {loading && listaCarteiraGlobal.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#64748b", fontWeight: "500" }}>
                Atualizando dados<span className="loading-dots"></span>
              </div>
            ) : (
              <DataTable 
                key={limparFiltrosTrigger}
                data={listaCarteiraGlobal} 
                totalBanco={totalRegistros} 
                paginaAtual={paginaAtual} 
                registrosPorPagina={registrosPorPagina} 
                onPageChange={setPaginaAtual} 
                onLimitChange={l => { setRegistrosPorPagina(l); setPaginaAtual(1); }} 
                onFilterChange={f => { setFiltrosColunas(f); setPaginaAtual(1); }} 
                onFetchColumnOptions={buscarOpcoesColunaBanco} 
                tableId={`carteira_${userIdKey}`} 
                onSelectionChange={handleSelectionChange} 
              />
            )}
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
  height: '32px',
  padding: '0 12px',
  minWidth: '100px',
  borderRadius: '6px',
  fontSize: '0.8rem',
  fontWeight: '600',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  cursor: 'pointer',
  boxSizing: 'border-box',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
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