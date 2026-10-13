// src/pages/database/dadosInternos/etapas.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../services/supabase";
import DataTable from "../../../models/DataTable";
import Swal from "sweetalert2";
import {
  Database, Search, Download, Upload, Plus,
  Edit2, Trash2, RefreshCw, FilterX
} from "lucide-react";

const corTheme = "#005596";
const tabelaBd = "tabi_apoio_etapa";
const titulo = "Etapas";

const svgSalvar = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
const svgHeaderAdd = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
const svgHeaderEdit = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;

export default function Etapas() {
  const [registros, setRegistros] = useState([]);
  const [totalBanco, setTotalBanco] = useState(0);
  const [estrutura, setEstrutura] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtrosColunas, setFiltrosColunas] = useState({});
  const [registroSelecionadoId, setRegistroSelecionadoId] = useState(null);
  const [registroSelecionadoObj, setRegistroSelecionadoObj] = useState(null);
  const [linhasSelecionadasIds, setLinhasSelecionadasIds] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(100);
  const [limparFiltrosTrigger, setLimparFiltrosTrigger] = useState(0); 
  
  const isInitialMount = useRef(true);
  const estruturaCacheRef = useRef(new Map());
  const estruturaPromiseRef = useRef(null);
  const opcoesCacheRef = useRef(new Map());
  const paginaCacheRef = useRef(new Map());
  const requestIdRef = useRef(0);
  const buscaDebounceRef = useRef(null);
  const [buscaConsulta, setBuscaConsulta] = useState("");
  const filtrosColunasRef = useRef({});
  filtrosColunasRef.current = filtrosColunas;

  const [filtrosConsulta, setFiltrosConsulta] = useState({});
  const filtrosDebounceRef = useRef(null);
  const opcoesInFlightRef = useRef(new Map());

  const sessaoUsuario = JSON.parse(localStorage.getItem("usuario_logado")) || {};
  const userIdKey = sessaoUsuario.id || sessaoUsuario.email || 'geral';
  const getEl = (id) => document.getElementById(id);

  const getNomeUsuarioLogado = () => {
    try {
      const d = localStorage.getItem("usuario_logado");
      if (d) {
        const p = JSON.parse(d);
        return p.nome || window.usuarioLogado || window.nomeUsuario || 'Sistema';
      }
    } catch(e) {}
    return window.usuarioLogado || window.nomeUsuario || 'Sistema';
  };

  useEffect(() => {
    if (!getEl('apoio-import-styles')) {
      const style = document.createElement('style');
      style.id = 'apoio-import-styles';
      style.innerHTML = `
        @keyframes lucide-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .lucide-spin { animation: lucide-spin 2s linear infinite; }
        @keyframes loadingDots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } }
        .loading-dots::after { display: inline-block; animation: loadingDots 1.5s infinite steps(4, end); content: ''; width: 16px; text-align: left; }
        .swal2-enterprise-modal{border-radius:16px!important;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,.1);padding-bottom:16px!important}
        .swal2-custom-actions{margin-top:0!important;margin-bottom:10px!important;gap:12px!important}
        .modal-header-pro{background:#f8fafc;padding:20px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:14px;text-align:left}
        .modal-icon-box{background:${corTheme};color:#fff;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,85,150,.2);flex-shrink:0}
        .modal-body-pro{padding:24px 24px 12px;display:flex;flex-direction:column;text-align:left}
        .dropzone-import{border:1.5px dashed #cbd5e1;border-radius:8px;padding:30px 15px;text-align:center;cursor:pointer;transition:all .2s ease;background:#fff}
        .dropzone-import.dragover:not(.disabled),.dropzone-import:hover:not(.disabled){background:#f0f9ff;border-color:${corTheme}}
        .dropzone-import.has-file{background:#f0fdf4;border-color:#16a34a}
        .dropzone-import p{margin:0;color:#334155;font-size:.95rem;font-weight:500}
        .dropzone-import span{font-size:.8rem;color:#94a3b8}
        .apoio-rule-box{margin-top:15px;font-size:.82rem;color:#475569;display:flex;align-items:flex-start;gap:10px;background:#f8fafc;padding:12px 15px;border-radius:8px;border-left:3px solid ${corTheme};text-align:left;line-height:1.4;max-height:120px;overflow-y:auto}
        .progress-container{width:100%;background:#f1f5f9;border-radius:99px;height:10px;overflow:hidden;margin-top:15px}
        .progress-bar{width:0;height:100%;background:${corTheme};transition:width .2s ease}
        .progress-text{font-size:.8rem;color:#64748b;margin-top:6px;font-weight:500;text-align:right}
      `;
      document.head.appendChild(style);
    }
  }, []);

  const removerBotaoCancelarModal = () => {
    const btnCancel = Swal.getCancelButton();
    if (btnCancel) btnCancel.remove();
    const actions = Swal.getActions();
    if (actions) actions.querySelectorAll('.swal2-cancel').forEach(btn => btn.remove());
  };

  const swalDefault = {
    padding: '0', background: '#ffffff', showCloseButton: true,
    customClass: { popup: 'swal2-enterprise-modal', actions: 'swal2-custom-actions' },
    didRender: removerBotaoCancelarModal,
    didOpen: () => {
      removerBotaoCancelarModal();
      const closeBtn = Swal.getCloseButton();
      if (closeBtn) closeBtn.style.cssText = 'position:absolute;top:6px;right:6px;outline:none;color:#94a3b8;padding:4px;';
    }
  };

  const obterEstruturaTabela = async (tabela) => {
    if (!tabela) throw new Error('Nome da tabela não informado.');
    const cache = estruturaCacheRef.current.get(tabela);
    if (cache) return cache;
    if (estruturaPromiseRef.current) return estruturaPromiseRef.current;
    estruturaPromiseRef.current = supabase.rpc('obter_estrutura_tabela', { p_tabela: tabela }).then(({ data, error }) => {
      if (error) throw error;
      const est = Array.isArray(data) ? data : [];
      estruturaCacheRef.current.set(tabela, est);
      return est;
    }).finally(() => { estruturaPromiseRef.current = null; });
    return estruturaPromiseRef.current;
  };

  const normalizarOpcao = (valor) => {
    const vazio = valor === null || valor === undefined || String(valor).trim() === "";
    return { chave: vazio ? "##NULL##" : String(valor), exibicao: vazio ? "-" : String(valor) };
  };

  const obterColunasTexto = (estData) => {
    const cols = estData.filter(c => String(c.tipo || c.data_type || '').toLowerCase().match(/char|text|string/)).map(c => c.nome_coluna).filter(Boolean);
    return [...new Set(cols)];
  };

  const aplicarFiltrosAuxiliaresCom = (query, filtros = filtrosColunas) => {
    Object.keys(filtros || {}).forEach(col => {
      const regras = filtros[col];
      if (!Array.isArray(regras) || regras.length === 0) return;

      const exatos = regras.filter(f => !String(f).startsWith(">=|") && !String(f).startsWith("<=|"));
      const maiorQue = regras.find(f => String(f).startsWith(">=|"))?.split(">=|")[1];
      const menorQue = regras.find(f => String(f).startsWith("<=|"))?.split("<=|")[1];

      if (exatos.length > 0) {
        const temNull = exatos.includes("##NULL##");
        const vals = exatos.filter(v => v !== "##NULL##");

        if (temNull && vals.length > 0) {
          const valores = vals.map(v => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(',');
          query = query.or(`${col}.in.(${valores}),${col}.is.null`);
        } else if (temNull) {
          query = query.is(col, null);
        } else {
          query = query.in(col, vals);
        }
      }

      if (maiorQue !== undefined && maiorQue !== "") query = query.gte(col, Number(maiorQue));
      if (menorQue !== undefined && menorQue !== "") query = query.lte(col, Number(menorQue));
    });

    return query;
  };

  const aplicarBuscaCom = (query, termo, colunasTexto) => {
    const termoLimpo = String(termo || '').replace(/[,;()]/g, '').trim();
    if (termoLimpo.length >= 2 && colunasTexto.length) {
      query = query.or(colunasTexto.map(col => `${col}.ilike.%${termoLimpo}%`).join(','));
    }
    return query;
  };

  const chaveConsulta = (termo = buscaConsulta, filtros = filtrosConsulta) =>
    JSON.stringify([tabelaBd, String(termo || '').trim(), filtros || {}]);

  const carregarDados = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);

    try {
      let estData = estrutura;
      if (!estData.length) {
        estData = await obterEstruturaTabela(tabelaBd);
        if (reqId !== requestIdRef.current) return;
        setEstrutura(estData);
      }

      const termo = buscaConsulta.trim();
      const filtrosAplicados = filtrosConsulta || {};
      const chave = chaveConsulta(termo, filtrosAplicados);
      const from = (paginaAtual - 1) * registrosPorPagina;
      const colunasBusca = obterColunasTexto(estData);

      const paginaKey = JSON.stringify([chave, paginaAtual, registrosPorPagina]);
      let pagina = paginaCacheRef.current.get(paginaKey);

      if (!pagina) {
        let query = supabase.from(tabelaBd).select('*', { count: 'exact' });
        query = aplicarFiltrosAuxiliaresCom(query, filtrosAplicados);
        query = aplicarBuscaCom(query, termo, colunasBusca);

        const temId = (estData || []).some(c => String(c.nome_coluna || '').toLowerCase() === 'id');
        const consultaPagina = temId
          ? query.range(from, from + registrosPorPagina - 1).order('id', { ascending: true })
          : query.range(from, from + registrosPorPagina - 1);

        const res = await consultaPagina;
        if (res.error) throw res.error;

        pagina = { data: res.data || [], count: res.count || 0 };
        paginaCacheRef.current.set(paginaKey, pagina);
      }

      if (reqId !== requestIdRef.current) return;

      setTotalBanco(pagina.count);
      setRegistros(pagina.data);
      setLoading(false);
    } catch (err) {
      if (reqId === requestIdRef.current) {
        setLoading(false);
        Swal.fire('Erro', 'Erro ao carregar dados: ' + err.message, 'error');
      }
    }
  }, [tabelaBd, paginaAtual, registrosPorPagina, buscaConsulta, filtrosConsulta, estrutura]);

  useEffect(() => {
    clearTimeout(buscaDebounceRef.current);
    buscaDebounceRef.current = setTimeout(() => setBuscaConsulta(busca.trim()), 280);
    return () => clearTimeout(buscaDebounceRef.current);
  }, [busca]);

  useEffect(() => {
    clearTimeout(filtrosDebounceRef.current);
    filtrosDebounceRef.current = setTimeout(() => {
      setFiltrosConsulta(filtrosColunas || {});
    }, 180);
    return () => clearTimeout(filtrosDebounceRef.current);
  }, [filtrosColunas]);

  useEffect(() => {
    if (isInitialMount.current) isInitialMount.current = false;
    carregarDados();
    return () => { requestIdRef.current += 1; };
  }, [carregarDados]);

  const invalidarCaches = useCallback(() => {
    opcoesCacheRef.current.clear();
    paginaCacheRef.current.clear();
    opcoesInFlightRef.current.clear();
  }, []);

  const buscarOpcoesColunaBanco = useCallback(async (coluna, filtrosAtuais = filtrosColunasRef.current, termo = '') => {
    if (!coluna) return [];
    try {
      const filtrosOutrasColunas = { ...(filtrosAtuais || {}) };
      delete filtrosOutrasColunas[coluna];

      const cacheKey = JSON.stringify([tabelaBd, coluna, filtrosOutrasColunas]);
      const cache = opcoesCacheRef.current.get(cacheKey);

      if (cache) {
        const t = String(termo || '').toLowerCase();
        return t ? cache.filter(item => item.exibicao.toLowerCase().includes(t)) : cache;
      }

      let promise = opcoesInFlightRef.current.get(cacheKey);
      if (!promise) {
        promise = (async () => {
          const { data, error } = await supabase.rpc('obter_distintos_dinamicos', {
            p_tabela: tabelaBd,
            p_coluna: coluna,
            p_filtros: filtrosOutrasColunas || {}
          });
          if (error) throw error;

          const base = (Array.isArray(data) ? data : [])
            .map(x => normalizarOpcao(x.valor))
            .sort((a, b) => a.exibicao.localeCompare(b.exibicao, 'pt-BR', { numeric: true, sensitivity: 'base' }));

          opcoesCacheRef.current.set(cacheKey, base);
          return base;
        })();
        opcoesInFlightRef.current.set(cacheKey, promise);
      }

      const base = await promise;
      if (opcoesInFlightRef.current.get(cacheKey) === promise) {
        opcoesInFlightRef.current.delete(cacheKey);
      }

      const t = String(termo || '').toLowerCase();
      return t ? base.filter(item => item.exibicao.toLowerCase().includes(t)) : base;
    } catch (err) {
      console.error('Erro ao buscar opções em cascata:', err);
      return [];
    }
  }, []);

  const handleSelectionChange = (ids) => {
    setLinhasSelecionadasIds(ids);
    if (ids.length === 1) {
      setRegistroSelecionadoId(ids[0]);
      setRegistroSelecionadoObj(registros.find(u => String(u.id) === String(ids[0])) || null);
    } else {
      setRegistroSelecionadoId(null);
      setRegistroSelecionadoObj(null);
    }
  };

  const updateProgress = (prefix, pct, msg, color) => {
    const state = getEl(`${prefix}StateSelect`), progress = getEl(`${prefix}StateProgress`);
    const bar = getEl(`${prefix}ProgressBar`), txt = getEl(`${prefix}ProgressText`), msge = getEl(`${prefix}ProgressMsg`);
    if (state) state.style.display = 'none';
    if (progress) progress.style.display = 'block';
    if (bar && pct !== null) { bar.style.width = `${pct}%`; if (color) bar.style.background = color; }
    if (txt && pct !== null) txt.innerText = `${Math.round(pct)}%`;
    if (msge && msg) msge.innerHTML = msg;
  };

  const formatarValorExibicao = (valor) => {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return valor;
  };

  const executarExportacao = async (apenasFiltrados) => {
    const pausa = () => new Promise(r => setTimeout(r, 0));
    try {
      updateProgress('export', 5, 'Iniciando exportação...');
      const confirm = Swal.getConfirmButton(), deny = Swal.getDenyButton();
      if (confirm) { confirm.style.setProperty('display', 'none', 'important'); confirm.disabled = true; }
      if (deny) { deny.style.setProperty('display', 'none', 'important'); deny.disabled = true; }

      if (typeof window.XLSX === 'undefined') {
        updateProgress('export', 8, 'Carregando recurso do Excel...');
        await new Promise((res, rej) => {
          const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          s.onload = res; s.onerror = rej; document.head.appendChild(s);
        });
      }

      let baseExport = [];
      if (apenasFiltrados) {
        baseExport = linhasSelecionadasIds?.length > 0 ? registros.filter(r => linhasSelecionadasIds.includes(r.id)) : registros;
        updateProgress('export', 35, `Preparando ${baseExport.length.toLocaleString('pt-BR')} registro(s)...`); await pausa();
      } else {
        const r = await supabase.from(tabelaBd).select('*', { count: 'exact', head: true });
        if (r.error) throw r.error;
        const count = r.count || 0;
        if (!count) return updateProgress('export', 100, '<span style="color:#d97706;font-weight:600;">Nenhum registro para exportar.</span>');

        let inicio = 0, buscar = true;
        while (buscar && inicio < count) {
          const { data, error } = await supabase.from(tabelaBd).select('*').range(inicio, inicio + 999);
          if (error) throw error;
          if (!data?.length) break;
          baseExport.push(...data); inicio += data.length; buscar = data.length === 1000;
          const pct = Math.min(90, Math.round((baseExport.length / count) * 85) + 10);
          updateProgress('export', pct, `Carregando... ${baseExport.length}/${count}`);
          await pausa();
        }
      }

      if (!baseExport.length) return updateProgress('export', 100, '<span style="color:#d97706;font-weight:600;">Nenhum registro para exportar.</span>');
      updateProgress('export', 92, 'Preparando dados...'); await pausa();

      const ocultasSalvas = JSON.parse(localStorage.getItem(`tabelas_dados_${tabelaBd}_${userIdKey}_ocultas`)) || [];
      let cols = baseExport[0] ? Object.keys(baseExport[0]).filter(c => !ocultasSalvas.includes(c)) : [];

      const dadosExcel = baseExport.map(linha => cols.reduce((l, c) => { l[c] = formatarValorExibicao(linha[c] ?? ''); return l; }, {}));

      updateProgress('export', 96, 'Gerando Excel...'); await pausa();
      const ws = window.XLSX.utils.json_to_sheet(dadosExcel), wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Dados");
      window.XLSX.writeFile(wb, `${titulo.replace(/\s+/g, '_')}_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      updateProgress('export', 100, `<span style="color:#10b981;font-weight:600;">Sucesso!</span><div style="margin-top:6px;color:#64748b;font-size:0.85rem;">${baseExport.length} registro(s) exportado(s).</div>`, '#10b981');
      if (Swal.getCloseButton()) Object.assign(Swal.getCloseButton().style, { pointerEvents: 'auto', opacity: '1' });
    } catch (err) {
      updateProgress('export', 100, `<span style="color:#dc2626;font-weight:600;">Erro</span><div style="margin-top:6px;color:#64748b;font-size:0.85rem;">${err.message || err}</div>`, '#dc2626');
      if (Swal.getCloseButton()) Object.assign(Swal.getCloseButton().style, { pointerEvents: 'auto', opacity: '1' });
    }
  };

  const exportarDadosTabela = () => {
    const qtde = linhasSelecionadasIds?.length ? registros.filter(r => linhasSelecionadasIds.includes(r.id)).length : registros.length;
    Swal.fire({
      ...swalDefault,
      html: `<div class="modal-header-pro"><div class="modal-icon-box"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></div><div><h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Central de Exportação</h2><p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Exportar Dados para Excel</p></div></div><div class="modal-body-pro"><div id="exportStateSelect"><p style="margin:0 0 10px;color:#475569;font-size:0.9rem;">Deseja exportar a base <b>completa</b> ou apenas as <b>${qtde}</b> linhas da visualização?</p></div><div id="exportStateProgress" style="display:none;padding:10px 0;text-align:center;"><div id="exportProgressMsg" style="font-size:0.95rem;color:#334155;font-weight:500;">Iniciando exportação...</div><div style="width:100%;"><div class="progress-container"><div id="exportProgressBar" class="progress-bar"></div></div><div id="exportProgressText" class="progress-text">0%</div></div></div></div>`,
      showCancelButton: false, showDenyButton: true, confirmButtonText: 'Completa', denyButtonText: 'Filtrada', confirmButtonColor: '#005596', denyButtonColor: '#10b981', allowOutsideClick: false,
      preConfirm: async () => { await executarExportacao(false); return false; },
      preDeny: async () => { await executarExportacao(true); return false; }
    });
  };

  const importarDadosTabela = async () => {
    let colsImp = [];
    const sysFields = ['id', 'created_at', 'updated_at', 'usu_cada', 'usucad', 'usuario', 'usuario_cadastro', 'cadastrado_por'];
    try {
      colsImp = (await obterEstruturaTabela(tabelaBd)).filter(c => !c.oculta && !sysFields.includes(String(c.nome_coluna).toLowerCase()));
    } catch (e) { return Swal.fire('Erro', 'Não foi possível descobrir a estrutura: ' + e.message, 'error'); }

    let fileSel = null, importStep = 'SELECT';

    Swal.fire({
      ...swalDefault,
      html: `<div class="modal-header-pro"><div class="modal-icon-box"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div><div><h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Central de Importação</h2><p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Destino: <b>${tabelaBd}</b></p></div></div><div class="modal-body-pro"><div id="apoioStateSelect"><div id="apoioDropzone" class="dropzone-import"><p id="apoioDropText">Arraste a planilha <b>.csv, .xls</b> ou <b>.xlsx</b> aqui</p><span id="apoioDropSubtext">ou clique para buscar</span><input type="file" id="apoioFileInput" accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none;"></div><div id="apoioRuleBox" class="apoio-rule-box"><div><b>Atenção:</b> O arquivo deve conter <b>${colsImp.length} colunas</b> na seguinte ordem: ${colsImp.map(c => `<code>${c.nome_coluna}</code>`).join(', ')}.</div></div></div><div id="apoioStateConfirm" style="display:none;padding:10px 0;text-align:center;"><h3 style="font-size:1.1rem;color:#1e293b;margin:0 0 8px;">Substituir dados atuais?</h3><p id="apoioConfirmMsg" style="font-size:0.9rem;color:#475569;margin:0;line-height:1.4;"></p></div><div id="apoioStateProgress" style="display:none;padding:15px 0;flex-direction:column;align-items:center;justify-content:center;"><div id="apoioProgressMsg" style="font-size:0.95rem;color:#334155;font-weight:500;">Iniciando processo...</div><div id="apoioProgressBarWrapper" style="display:none;width:100%;"><div class="progress-container"><div id="importProgressBar" class="progress-bar"></div></div><div id="importProgressText" class="progress-text">0%</div></div></div></div>`,
      confirmButtonText: 'Importar', confirmButtonColor: corTheme, width: '540px', allowOutsideClick: false,
      didOpen: () => {
        swalDefault.didOpen();
        const btn = Swal.getConfirmButton(), drop = getEl('apoioDropzone'), fileIn = getEl('apoioFileInput');
        if (btn) { Object.assign(btn.style, { borderRadius: "8px", padding: "10px 24px", fontSize: "0.9rem", fontWeight: "600" }); btn.disabled = true; }
        
        const handleFile = (f) => {
          if (!['csv', 'xls', 'xlsx'].includes(f.name.split('.').pop().toLowerCase())) { btn.disabled = true; fileSel = null; return Swal.showValidationMessage('Envie .csv, .xls ou .xlsx'); }
          Swal.resetValidationMessage(); fileSel = f; drop.classList.add('has-file');
          getEl('apoioDropText').innerHTML = `Arquivo: <b style="color:${corTheme};">${f.name}</b>`;
          getEl('apoioDropSubtext').textContent = 'Tudo certo!'; btn.disabled = false;
        };
        drop.addEventListener('click', () => { fileIn.click(); });
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
        drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('dragover'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
        fileIn.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });
      },
      preConfirm: async () => {
        Swal.resetValidationMessage(); const btn = Swal.getConfirmButton();
        if (importStep === 'SELECT') {
          if (!fileSel) return false;
          Object.assign(btn.style, { opacity: "0.4", cursor: "not-allowed" }); btn.disabled = true;
          getEl('apoioStateSelect').style.display = 'none'; getEl('apoioStateProgress').style.display = 'flex'; getEl('apoioProgressMsg').innerText = "Verificando base...";
          try {
            const { count, error } = await supabase.from(tabelaBd).select('id', { count: 'exact', head: true });
            if (error) throw error;
            if (count > 0) {
              getEl('apoioStateProgress').style.display = 'none'; getEl('apoioStateConfirm').style.display = 'block';
              getEl('apoioConfirmMsg').innerHTML = `A tabela possui <b>${count}</b> registros.<br>Deseja substituir?`;
              Object.assign(btn.style, { backgroundColor: "#dc2626", opacity: "1", cursor: "pointer" }); btn.innerText = "Continuar"; btn.disabled = false;
              importStep = 'CONFIRM'; return false;
            } else {
              importStep = 'PROCESSING';
              return await procDinamica(false, fileSel, colsImp, btn);
            }
          } catch (err) {
            Swal.showValidationMessage(`Erro: ${err.message}`); fileSel = null;
            if (getEl('apoioDropzone')) { getEl('apoioDropzone').classList.remove('has-file'); getEl('apoioDropText').innerHTML = "Arraste a planilha..."; getEl('apoioDropSubtext').textContent = "ou clique para buscar"; }
            getEl('apoioStateSelect').style.display = 'block'; getEl('apoioStateProgress').style.display = 'none'; return false;
          }
        } else if (importStep === 'CONFIRM') {
          Object.assign(btn.style, { opacity: "0.4", cursor: "not-allowed" }); btn.disabled = true; importStep = 'PROCESSING';
          return await procDinamica(true, fileSel, colsImp, btn);
        }
        return false;
      }
    });
  };

  const endProc = (btn, msg, success = true) => {
    const wrapper = getEl('apoioProgressBarWrapper');
    if (wrapper) wrapper.style.display = 'none';
    if(success) getEl('apoioProgressMsg').innerHTML = `<span style="color:#10b981;font-weight:600;">${msg}</span>`;
    else Swal.showValidationMessage(msg);
    if(btn) btn.remove();
    const c = Swal.getCloseButton(); if(c) Object.assign(c.style, {pointerEvents:'auto', opacity:'1'});
    if(success) { invalidarCaches(); carregarDados(); }
    return false;
  };

  const procDinamica = async (limpar, file, colsImp, btn) => {
    getEl('apoioStateConfirm').style.display = 'none'; getEl('apoioStateProgress').style.display = 'flex'; getEl('apoioProgressMsg').innerText = "Lendo arquivo...";
    if (btn) { btn.style.display = 'none'; btn.disabled = true; }
    const c = Swal.getCloseButton(); if(c) Object.assign(c.style, {pointerEvents:'none', opacity:'0.4'});
    try {
      if (typeof window.XLSX === 'undefined') { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; document.head.appendChild(s); await new Promise(r => setTimeout(r, 1000)); }
      const nmUsr = getNomeUsuarioLogado();
      const estComp = await obterEstruturaTabela(tabelaBd).catch(()=>[]);
      const colUsr = estComp.find(c => ['usu_cad','usu_cada','usucad','usuario','usuario_cadastro','cadastrado_por'].includes(String(c.nome_coluna).toLowerCase()))?.nome_coluna;
      
      // Validação de duplicação utilizando 'id_etapa'
      const colChaveUnica = estComp.find(c => ['id_etapa'].includes(String(c.nome_coluna).toLowerCase()))?.nome_coluna || colsImp[0]?.nome_coluna;

      const reader = new FileReader();
      await new Promise((res, rej) => {
        reader.onload = async e => {
          try {
            const data = new Uint8Array(e.target.result), wb = window.XLSX.read(data, { type: 'array', cellDates: false }), ws = wb.Sheets[wb.SheetNames[0]];
            let rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            while (rows.length > 0 && rows[rows.length - 1].join("").trim() === "") rows.pop();
            if (rows.length < 2) throw new Error("Planilha vazia ou só cabeçalho.");
            if (rows[0].length !== colsImp.length) throw new Error(`Incompatibilidade: Arquivo tem ${rows[0].length} colunas, tabela espera ${colsImp.length}.`);
            getEl('apoioProgressMsg').innerText = "Validando tipos e duplicidades...";
            const limpa = v => v != null ? String(v).replace(/^"|"$/g, '').trim() : null;
            const fmtDt = (v, tp) => {
              if(!v) return null; const t = String(tp||'').toLowerCase();
              if(!t.includes('date') && !t.includes('time')) return limpa(v);
              if(v instanceof Date) return `${v.getUTCFullYear()}-${String(v.getUTCMonth()+1).padStart(2,'0')}-${String(v.getUTCDate()).padStart(2,'0')}`;
              let cl = limpa(v); if(cl.indexOf('-') > -1) return cl;
              if(cl.indexOf('/') > -1){ const p = cl.split('/'); if(p.length===3 && p[2].length===4) return `${p[2]}-${p[1]}-${p[0]}`; }
              return cl;
            };
            const valTp = (v, tp) => {
              if (v == null || v === '') return true; const t = String(tp||'').toLowerCase();
              if (t.match(/int|numeric|decimal|float/)) return !isNaN(Number(String(v).replace(',','.')));
              if (t.match(/date|time/)) return (v instanceof Date && !isNaN(v.getTime())) || !isNaN(Date.parse(v)) || String(v).indexOf('/') > -1 || String(v).indexOf('-') > -1;
              if (t.match(/bool/)) return ['true','false','1','0','sim','nao','yes','no'].includes(String(v).toLowerCase());
              return true;
            };
            const rowsIns = [];
            for (let i = 1; i < rows.length; i++) {
              let obj = {};
              for (let j = 0; j < colsImp.length; j++) {
                let val = rows[i][j]; const cNm = colsImp[j].nome_coluna, tp = colsImp[j].tipo || colsImp[j].data_type;
                if (val !== '' && val != null) {
                  if (!valTp(val, tp)) throw new Error(`Erro na linha ${i+1}, coluna ${j+1} ("${cNm}"): Valor "${val}" incompatível.`);
                  val = fmtDt(val, tp);
                } else val = null;
                obj[cNm] = val;
              }
              if (colUsr) obj[colUsr] = nmUsr; rowsIns.push(obj);
            }
            if (!rowsIns.length) throw new Error("Nenhum dado válido.");

            let itensParaInserir = rowsIns;
            if (!limpar && colChaveUnica) {
              const chavesPlanilha = rowsIns.map(r => r[colChaveUnica]).filter(val => val != null && String(val).trim() !== '');
              if (chavesPlanilha.length > 0) {
                const uniqueChaves = Array.from(new Set(chavesPlanilha));
                const chavesExistentes = new Set();
                const chunkBusca = 150;

                for (let i = 0; i < uniqueChaves.length; i += chunkBusca) {
                  const chunk = uniqueChaves.slice(i, i + chunkBusca);
                  const { data: dadosBanco, error: errBusca } = await supabase
                    .from(tabelaBd)
                    .select(colChaveUnica)
                    .in(colChaveUnica, chunk);

                  if (errBusca) throw new Error(`Erro ao validar duplicidades: ${errBusca.message}`);
                  (dadosBanco || []).forEach(d => chavesExistentes.add(String(d[colChaveUnica]).trim()));
                }

                itensParaInserir = rowsIns.filter(item => {
                  const valChave = item[colChaveUnica];
                  if (valChave == null || String(valChave).trim() === '') return true;
                  return !chavesExistentes.has(String(valChave).trim());
                });
              }
            }

            if (itensParaInserir.length === 0) {
              throw new Error("Não há registros novos para importar. Todos os itens da planilha já existem no banco.");
            }

            const wrapper = getEl('apoioProgressBarWrapper');
            if (wrapper) wrapper.style.display = 'block';
            if (limpar) { 
              const { error } = await supabase.from(tabelaBd).delete().not('id','is',null); 
              if (error) throw error; 
            }

            getEl('apoioProgressMsg').innerText = "Gravando novos dados...";
            let ins = 0; const tot = itensParaInserir.length;
            for (let i = 0; i < tot; i += 500) {
              const lote = itensParaInserir.slice(i, i + 500); 
              const { error } = await supabase.from(tabelaBd).insert(lote); 
              if (error) throw error;
              ins += lote.length; 
              const pct = Math.round((ins/tot)*100);
              if (getEl('importProgressBar')) getEl('importProgressBar').style.width = `${pct}%`;
              if (getEl('importProgressText')) getEl('importProgressText').innerText = `${pct}% (${ins}/${tot})`;
            }
            res();
          } catch(e) { rej(e); }
        };
        reader.readAsArrayBuffer(file);
      });
      return endProc(btn, 'Importação Concluída!');
    } catch (err) { return endProc(btn, err.message, false); }
  };

  const abrirFormRegistroTabela = async (editandoObj = null) => {
    const editId = editandoObj?.id, editando = Boolean(editId), rowData = editandoObj || {};
    const nmUsr = getNomeUsuarioLogado();
    try {
      const campos = (await obterEstruturaTabela(tabelaBd)).filter(col => !col.oculta);
      if (!campos.length) return Swal.fire('Atenção', 'Sem campos disponíveis.', 'warning');

      let filiais = [], usaFilial = false;
      if (campos.some(c => c.nome_coluna.toLowerCase() === 'filial')) {
        try {
          const { data } = await supabase.from('tabi_apoio_contrato').select('filial');
          if (data) { 
            filiais = [...new Set(data.map(d => d.filial).filter(Boolean))].sort(); 
            usaFilial = true; 
          }
        } catch {}
      }

      const trmUsr = ['usu_cad','usu_cada','usucad','usuario','usuario_cadastro','cadastrado_por'];
      const vis = campos.filter(c => !trmUsr.includes(c.nome_coluna.toLowerCase()));
      const hdd = campos.filter(c => trmUsr.includes(c.nome_coluna.toLowerCase())).map(c => `<input type="hidden" class="input-dinamico" data-col="${c.nome_coluna}" value="${editando && rowData[c.nome_coluna] ? rowData[c.nome_coluna] : nmUsr}">`).join('');
      
      const { value: formValues } = await Swal.fire({
        ...swalDefault, width: vis.length > 8 ? '980px' : '480px',
        html: `${hdd}<div class="modal-header-pro"><div class="modal-icon-box" style="background-color:${editando ? '#0284c7' : '#10b981'};">${editando ? svgHeaderEdit : svgHeaderAdd}</div><div><h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">${editando ? 'Editar Registro' : 'Adicionar Novo'}</h2><p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">${editando ? 'Altere os dados.' : 'Preencha os campos.'}</p></div></div><div class="modal-body-pro"><div class="swal-form-container" style="display:grid;grid-template-columns:repeat(${vis.length > 8 ? 3 : 1},1fr);gap:10px;text-align:left;">${vis.map(col => {
          let val = rowData[col.nome_coluna] ?? '';
          if (col.nome_coluna.toLowerCase() === 'filial' && usaFilial) {
            return `<div class="swal-form-group" style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:0.8rem;font-weight:600;color:#475569;">${col.nome_coluna}</label><select class="swal-form-input input-dinamico" data-col="${col.nome_coluna}" ${col.obrigatorio && !col.auto ? 'required' : ''} style="width:100%;height:38px;padding:0 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;"><option value="">Selecione...</option>${filiais.map(f => `<option value="${f}" ${val === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>`;
          }
          return `<div class="swal-form-group" style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:0.8rem;font-weight:600;color:#475569;">${col.nome_coluna}</label><input class="swal-form-input input-dinamico" data-col="${col.nome_coluna}" type="${['smallint','integer','numeric'].includes(col.tipo) ? 'number' : 'text'}" value="${val}" ${col.obrigatorio && !col.auto ? 'required' : ''} style="width:100%;height:38px;padding:0 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;box-sizing:border-box;"></div>`;
        }).join('')}</div></div>`,
        confirmButtonText: `${svgSalvar} Salvar`, confirmButtonColor: corTheme,
        preConfirm: () => {
          let err = false, vals = {};
          document.querySelectorAll('.input-dinamico').forEach(inp => {
            if (inp.hasAttribute('required') && !inp.value.trim()) err = true;
            vals[inp.getAttribute('data-col')] = inp.type === 'hidden' ? inp.value : (inp.type === 'number' && inp.value !== '' ? Number(inp.value) : inp.value || null);
          });
          if (err) { Swal.showValidationMessage('Preencha os campos obrigatórios.'); return false; }
          return vals;
        }
      });
      if (formValues) {
        const resultado = editando
          ? await supabase.from(tabelaBd).update(formValues).eq('id', editId)
          : await supabase.from(tabelaBd).insert([formValues]);

        if (resultado.error) throw resultado.error;
        invalidarCaches();
        carregarDados();
      }
    } catch (err) { Swal.fire('Erro', err.message, 'error'); }
  };

  const excluirRegistrosSelecionados = async () => {
    if (!linhasSelecionadasIds?.length) return;
    const idsPag = registros.map(r => r.id).filter(Boolean);
    const selTodos = idsPag.length > 0 && idsPag.every(id => linhasSelecionadasIds.includes(id));
    if (selTodos) {
      const res = await Swal.fire({
        ...swalDefault, showDenyButton: true, confirmButtonText: "Banco Completo", denyButtonText: "Página Atual", confirmButtonColor: "#dc2626", denyButtonColor: "#005596",
        html: `<div class="modal-header-pro"><div class="modal-icon-box" style="background-color:#dc2626;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></div><div><h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Excluir Registros</h2><p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Qual o tipo de exclusão deseja realizar?</p></div></div><div class="modal-body-pro"><p style="margin:0;color:#475569;font-size:0.9rem;">Escolha o escopo da exclusão abaixo:</p></div>`
      });
      if (res.isConfirmed || res.isDenied) {
        const { error } = res.isConfirmed ? await supabase.from(tabelaBd).delete().not('id','is',null) : await supabase.from(tabelaBd).delete().in('id', linhasSelecionadasIds);
        if (error) Swal.fire('Erro', error.message, 'error');
        else { Swal.fire('Sucesso', res.isConfirmed ? 'Tabela limpa.' : 'Excluídos com sucesso.', 'success'); setLinhasSelecionadasIds([]); setRegistroSelecionadoId(null); setRegistroSelecionadoObj(null); invalidarCaches(); carregarDados(); }
      }
    } else {
      const res = await Swal.fire({
        ...swalDefault, confirmButtonColor: "#dc2626", confirmButtonText: "Excluir",
        html: `<div class="modal-header-pro"><div class="modal-icon-box" style="background-color:#dc2626;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div><div><h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-type:1.2;">Excluir Selecionados</h2><p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Confirmação de exclusão</p></div></div><div class="modal-body-pro"><p style="margin:0;color:#475569;font-size:0.9rem;">Essa ação apagará <b>${linhasSelecionadasIds.length}</b> linha(s) selecionada(s).</p></div>`
      });
      if (res.isConfirmed) {
        const { error } = await supabase.from(tabelaBd).delete().in('id', linhasSelecionadasIds);
        if (error) Swal.fire('Erro', error.message, 'error');
        else { Swal.fire('Sucesso', 'Excluídos com sucesso.', 'success'); setLinhasSelecionadasIds([]); setRegistroSelecionadoId(null); setRegistroSelecionadoObj(null); invalidarCaches(); carregarDados(); }
      }
    }
  };

  const temFiltroAtivo = busca.trim().length > 0 || Object.values(filtrosColunas).some(r => Array.isArray(r) && r.length > 0);
  const limparTodosFiltros = () => { setBusca(""); setFiltrosColunas({}); setPaginaAtual(1); setLimparFiltrosTrigger(p => p + 1); };

  const btnBase = { display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', height:'32px', padding:'0 12px', minWidth:'100px', borderRadius:'6px', fontSize:'0.8rem', cursor:'pointer', boxSizing:'border-box', fontWeight:'600', boxShadow:'0 1px 2px rgba(0,0,0,0.02)' };
  const btnIco = { display:'flex', alignItems:'center', justifyContent:'center', width:'32px', height:'32px', borderRadius:'6px', fontSize:'0.8rem', cursor:'pointer', boxSizing:'border-box', fontWeight:'600' };
  const temSel = linhasSelecionadasIds?.length > 0;

  return (
    <div style={{ position:'absolute', inset:'0', width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'#f8fafc', padding:'24px', boxSizing:'border-box', overflow:'hidden', zIndex:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', background:'#ffffff', padding:'8px 14px', borderRadius:'8px', boxShadow:'0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ backgroundColor:corTheme, color:'#fff', width:'32px', height:'32px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,85,150,0.2)' }}><Database size={16} /></div>
          <div><h2 style={{ margin:0, fontSize:'0.95rem', color:'#0f172a', fontWeight:'700', lineHeight:'1.2' }}>{titulo}</h2><p style={{ margin:'1px 0 0', fontSize:'0.72rem', color:'#64748b' }}>Gerenciamento da tabela: <b>{tabelaBd}</b></p></div>
        </div>
      </div>
      
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', gap:'12px', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1', minWidth:'280px' }}>
          <Search size={18} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Pesquisar geral..." 
            value={busca} 
            onChange={e => { setBusca(e.target.value); setPaginaAtual(1); }} 
            onPaste={e => {
              e.preventDefault();
              const pastedText = e.clipboardData.getData('text');
              setBusca(pastedText.trim());
              setPaginaAtual(1);
            }}
            style={{ width:'100%', padding:'0 12px 0 38px', height:'32px', borderRadius:'6px', border:'1px solid #cbd5e1', outline:'none', fontSize:'0.9rem', background:'#fff', boxSizing:'border-box' }} 
          />
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          {temFiltroAtivo && <button onClick={limparTodosFiltros} style={{ ...btnIco, background:'#fff', border:'1px solid #cbd5e1', color:'#dc2626' }} title="Limpar filtros"><FilterX size={16} /></button>}
          <button onClick={() => { invalidarCaches(); carregarDados(); }} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:'#334155' }} title="Atualizar"><RefreshCw size={14} className={loading ? "lucide-spin" : ""} /> Atualizar</button>
          <button onClick={exportarDadosTabela} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:'#334155' }}><Download size={14} /> Exportar</button>
          <button onClick={importarDadosTabela} style={{ ...btnBase, background:'#f1f5f9', border:'1px solid #cbd5e1', color:'#475569' }}><Upload size={14} /> Importar</button>

          <button onClick={() => abrirFormRegistroTabela(null)} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:'#334155' }}><Plus size={14} /> Novo</button>
          <button onClick={() => abrirFormRegistroTabela(registroSelecionadoObj)} disabled={!registroSelecionadoId} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:'#334155', opacity:registroSelecionadoId ? 1 : 0.4, cursor:registroSelecionadoId ? 'pointer' : 'not-allowed' }}><Edit2 size={14} /> Editar</button>
          <button onClick={excluirRegistrosSelecionados} disabled={!temSel} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:temSel ? '#dc2626' : '#334155', opacity:temSel ? 1 : 0.4, cursor:temSel ? 'pointer' : 'not-allowed' }} title="Excluir selecionados"><Trash2 size={14} /> Excluir</button>
        </div>
      </div>

      <div style={{ flex:1, background:'#ffffff', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100%", color:"#64748b", fontWeight:"500" }}>
              Atualizando dados<span className="loading-dots"></span>
            </div>
          ) : (
            <DataTable 
              key={limparFiltrosTrigger} 
              data={registros} 
              totalBanco={totalBanco} 
              paginaAtual={paginaAtual} 
              registrosPorPagina={registrosPorPagina} 
              onPageChange={setPaginaAtual} 
              onLimitChange={l => { setRegistrosPorPagina(l); setPaginaAtual(1); }} 
              onFilterChange={f => {
                setFiltrosColunas({ ...(f || {}) });
                setPaginaAtual(1);
              }}
              onFetchColumnOptions={(coluna, filtros) => buscarOpcoesColunaBanco(coluna, filtros)}
              filtrosExternos={filtrosColunas} 
              tableId={`tabelas_dados_${tabelaBd}_${userIdKey}`} 
              onSelectionChange={handleSelectionChange} 
            />
          )}
        </div>
      </div>
    </div>
  );
}