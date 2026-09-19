import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabase";
import DataTable from "../../models/DataTable";
import Swal from "sweetalert2";
import {
  Database, Search, Download, Upload, Plus,
  Edit2, Trash2, RefreshCw, X, Copy, FilterX
} from "lucide-react";
import { configuracoesImportacaoEspecificas } from "./tabelas_importacoes";

const svgSalvar = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
const svgHeaderAdd = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
const svgHeaderEdit = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;

export default function TabelasDados({ tabelaBd, titulo, icone = 'database', corTheme = '#005596', permitsCrud = true, onClose }) {
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

  // Mapeia para a view se for tabe_imp_pep, mantendo a tabela original para operações de escrita (CRUD/Importação) se necessário
  const tabelaOuViewQuery = tabelaBd === 'tabe_imp_pep' ? 'view_dados_pep' : tabelaBd;

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

        .swal2-enterprise-modal{border-radius:16px!important;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,.1);padding-bottom:16px!important}
        .swal2-custom-actions{margin-top:0!important;margin-bottom:10px!important;gap:12px!important}
        .swal2-export-modal .swal2-cancel,.swal2-import-modal .swal2-cancel{display:none!important;visibility:hidden!important;width:0!important;min-width:0!important;margin:0!important;padding:0!important}
        .modal-header-pro{background:#f8fafc;padding:20px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:14px;text-align:left}
        .modal-icon-box{background:${corTheme};color:#fff;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,85,150,.2);flex-shrink:0}
        .modal-body-pro{padding:24px 24px 12px;display:flex;flex-direction:column;text-align:left}
        .import-select-box{margin-bottom:18px;text-align:left}
        .import-select-box label{font-size:.85rem;font-weight:600;color:#475569;display:block;margin-bottom:6px}
        .import-select-wrapper{position:relative;width:100%}
        .import-select-wrapper select{width:100%;padding:11px 40px 11px 14px;border-radius:8px;border:1px solid #cbd5e1;font-size:.9rem;font-weight:500;color:#1e293b;outline:0;transition:all .2s ease;background:#fff;cursor:pointer;appearance:none}
        .import-select-wrapper select:focus{border-color:${corTheme};box-shadow:0 0 0 3px rgba(0,85,150,.12);background:#fff}
        .import-select-arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:#64748b;display:flex;align-items:center}
        .dropzone-import{border:1.5px dashed #cbd5e1;border-radius:8px;padding:30px 15px;text-align:center;cursor:pointer;transition:all .2s ease;background:#fff}
        .dropzone-import.dragover:not(.disabled),.dropzone-import:hover:not(.disabled){background:#f0f9ff;border-color:${corTheme}}
        .dropzone-import.has-file{background:#f0fdf4;border-color:#16a34a}
        .dropzone-import.disabled{opacity:.5;pointer-events:none;background:#f8fafc}
        .dropzone-import p{margin:0;color:#334155;font-size:.95rem;font-weight:500}
        .dropzone-import span{font-size:.8rem;color:#94a3b8}
        .apoio-rule-box{margin-top:15px;font-size:.82rem;color:#475569;display:flex;align-items:flex-start;gap:10px;background:#f8fafc;padding:12px 15px;border-radius:8px;border-left:3px solid ${corTheme};text-align:left;line-height:1.4;max-height:120px;overflow-y:auto}
        .progress-container{width:100%;background:#f1f5f9;border-radius:99px;height:10px;overflow:hidden;margin-top:15px}
        .progress-bar{width:0;height:100%;background:${corTheme};transition:width .2s ease}
        .progress-text{font-size:.8rem;color:#64748b;margin-top:6px;font-weight:500;text-align:right}
      `;
      document.head.appendChild(style);
    }
  }, [corTheme]);

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
    const tabelaAlvoEstrutura = tabela === 'tabe_imp_pep' ? 'tabe_imp_pep' : tabela;
    const { data, error } = await supabase.rpc('obter_estrutura_tabela', { p_tabela: tabelaAlvoEstrutura });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  };

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

  const formatarValorExibicao = (val) => {
    if (!val || typeof val !== 'string') return val || '';
    const padraoIdComTracos = /^\d{4}-\d{2}-\d{4}$/;
    if (padraoIdComTracos.test(val)) {
      return val;
    }
    if (val.indexOf('-') > -1 && val.indexOf('T') > -1) {
      const p = val.split('T')[0].split('-');
      if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    }
    return val;
  };

  const carregarDados = useCallback(async (isBackground = false) => {
    setLoading(true);
    if (!isBackground) { setRegistros([]); }

    try {
      let estData = estrutura;
      if (estData.length === 0) {
        estData = await obterEstruturaTabela(tabelaBd);
        setEstrutura(estData);
      }

      const termoBruto = busca.trim();
      
      let colunasTexto = estData.filter(c => String(c.tipo || c.data_type || '').toLowerCase().match(/char|text|string/)).map(c => c.nome_coluna);
      if (tabelaBd === 'tabe_imp_pep') {
        const colunasExtrasView = ['empresa', 'ano', 'regional', 'municipio', 'parceiro', 'area', 'grupo_atividade', 'pi', 'nota', 'pep', 'descricao', 'status', 'usu_cada'];
        colunasTexto = [...new Set([...colunasTexto, ...colunasExtrasView])];
      }

      const from = (paginaAtual - 1) * registrosPorPagina;
      let query = supabase.from(tabelaOuViewQuery).select('*', { count: 'exact' });
      query = aplicarFiltrosAuxiliares(query);

      if (termoBruto.length >= 2 && colunasTexto.length > 0) {
        const termoLimpo = termoBruto.replace(/[,;()]/g, '').trim();
        
        if (termoLimpo.length > 0) {
          const condicoes = colunasTexto.map(col => `${col}.ilike.%${termoLimpo}%`);

          if (condicoes.length > 0) {
            query = query.or(condicoes.join(','));
          }
        }
      }

      const { data, count, error } = await query
        .range(from, from + registrosPorPagina - 1)
        .order('id', { ascending: true });

      if (error) throw error;

      setTotalBanco(count || 0);
      
      // Se for a view/tabela de serviços de obras, formata o campo total_proj para número com 2 casas decimais se vier como número puro
      let dadosTratados = data || [];
      if (tabelaBd === 'view_dados_servicos_proj' || titulo === 'Lista de serviços obras') {
        dadosTratados = dadosTratados.map(row => ({
          ...row,
          total_proj: row.total_proj !== null && row.total_proj !== undefined 
            ? Number(row.total_proj).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : row.total_proj
        }));
      }

      setRegistros(dadosTratados);
    } catch (err) {
      Swal.fire('Erro', 'Erro ao carregar dados: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [tabelaBd, tabelaOuViewQuery, paginaAtual, registrosPorPagina, busca, filtrosColunas, estrutura, titulo]);

  useEffect(() => {
    const isBg = !isInitialMount.current;
    if (isInitialMount.current) isInitialMount.current = false;
    carregarDados(isBg);
  }, [carregarDados]);

  const buscarOpcoesColunaBanco = async (coluna, termo = "") => {
    try {
      const tabelaDistintos = tabelaBd === 'tabe_imp_pep' ? 'view_dados_pep' : tabelaBd;
      const { data, error } = await supabase.rpc('obter_distintos_coluna', { p_tabela: tabelaDistintos, p_coluna: coluna });
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
    setLinhasSelecionadasIds(ids);
    if (ids.length === 1) {
      setRegistroSelecionadoId(ids[0]);
      setRegistroSelecionadoObj(registros.find(u => String(u.id) === String(ids[0])) || null);
    } else {
      setRegistroSelecionadoId(null); setRegistroSelecionadoObj(null);
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

  const copiarPIs = async function() {
    const temFiltroAtual = busca.trim().length > 0 || Object.values(filtrosColunas).some(r => Array.isArray(r) && r.length > 0);
    const executarProcessamentoCopia = async (tipoCopia) => {
      try {
        const closeBtn = Swal.getCloseButton(), confirmBtn = Swal.getConfirmButton(), denyBtn = Swal.getDenyButton();
        if (closeBtn) Object.assign(closeBtn.style, { pointerEvents: 'none', opacity: '0.4' });
        if (confirmBtn) { confirmBtn.style.setProperty('display', 'none', 'important'); confirmBtn.disabled = true; }
        if (denyBtn) { denyBtn.style.setProperty('display', 'none', 'important'); denyBtn.disabled = true; }
        let lista = [];
        if (tipoCopia === 'NIVEL3' && temFiltroAtual) {
            updateProgress('copiar', 30, 'Lendo dados filtrados da tela...');
            lista = registros;
            updateProgress('copiar', 70, 'Formatando dados...');
        } else {
            updateProgress('copiar', 15, 'Consultando registros na view...');
            let inicio = 0, buscar = true;
            while (buscar) {
                const { data, error } = await supabase.from(tabelaOuViewQuery).select('pep, regional').range(inicio, inicio + 999).order('id', { ascending: true });
                if (error) throw error;
                if (data && data.length > 0) {
                    lista.push(...data); inicio += data.length;
                    if (data.length < 1000) buscar = false;
                } else buscar = false;
                updateProgress('copiar', Math.min(75, 15 + Math.round((inicio / (inicio + 1000)) * 60)), `analisando os dados... (${lista.length})`);
            }
        }
        if (!lista.length) return Swal.fire('Vazio', 'Nenhum PEP encontrado.', 'warning');
        updateProgress('copiar', 85, 'Processando formato dos dados...');
        let textoFinal = '', qtd = 0, peps = new Set();
        if (tipoCopia === 'NIVEL3') {
            for (let i = 0; i < lista.length; i++) if (lista[i]?.pep && lista[i].pep !== 'PLACEHOLDER') peps.add(String(lista[i].pep).trim());
        } else if (tipoCopia === 'NIVEL2') {
            for (let i = 0; i < lista.length; i++) {
                if (!lista[i]?.pep || lista[i].pep === 'PLACEHOLDER') continue;
                const pep = String(lista[i].pep).trim();
                const reg = (lista[i].Regional || lista[i].regional || '').trim().toUpperCase();
                peps.add(reg === 'NORTE' && pep.length >= 16 ? pep.substring(0, 16) : pep);
            }
        }
        const arr = Array.from(peps);
        textoFinal = arr.join('\n'); qtd = arr.length;
        if (!qtd) return Swal.fire('Vazio', 'Nenhum PEP válido encontrado.', 'warning');
        updateProgress('copiar', 95, 'Copiando para a área de transferência...');
        await navigator.clipboard.writeText(textoFinal);
        updateProgress('copiar', 100, `<span style="color:#10b981;font-weight:600;">Copiado com sucesso!</span><div style="margin-top:6px;color:#334155;font-size:0.9rem;font-weight:600;">Total de PEPs copiados: ${qtd}</div>`);
        if (confirmBtn) Object.assign(confirmBtn.style, { display: 'inline-block', backgroundColor: '#10b981' });
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerText = 'OK'; confirmBtn.style.setProperty('display', 'inline-block', 'important'); }
        if (closeBtn) Object.assign(closeBtn.style, { pointerEvents: 'auto', opacity: '1' });
      } catch (err) { Swal.fire('Erro', 'Erro ao processar: ' + err.message, 'error'); }
     };

     Swal.fire({
        ...swalDefault,
        html: `<div class="modal-header-pro"><div class="modal-icon-box"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></div><div><h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Central de Cópia</h2><p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Opções de Cópia de PEPs</p></div></div><div class="modal-body-pro"><div id="copiarStateSelect"><p style="margin:0 0 10px;font-size:0.9rem;color:#475569;">Escolha o formato desejado para copiar os PEPs:</p></div><div id="copiarStateProgress" style="display:none;padding:10px 0;text-align:center;"><div id="copiarProgressMsg" style="font-size:0.95rem;color:#334155;font-weight:500;">Processando...</div><div style="width:100%;"><div class="progress-container"><div id="copiarProgressBar" class="progress-bar"></div></div><div id="copiarProgressText" class="progress-text">0%</div></div></div></div>`,
        showCancelButton: false, showDenyButton: true, confirmButtonText: "PEP's Nível 3", confirmButtonColor: '#005596', denyButtonText: "PEP's Nível 2", denyButtonColor: '#10b981', reverseButtons: true, allowOutsideClick: false,
        preConfirm: async () => {
          const btn = Swal.getConfirmButton();
          if (btn && btn.innerText === 'OK') return true;
          await executarProcessamentoCopia('NIVEL3'); return false;
        },
        preDeny: async () => { await executarProcessamentoCopia('NIVEL2'); return false; }
    });
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

      let estData = estrutura.length === 0 ? await obterEstruturaTabela(tabelaBd) : estrutura;
      let baseExport = [];

      if (apenasFiltrados) {
        baseExport = linhasSelecionadasIds?.length > 0 ? registros.filter(r => linhasSelecionadasIds.includes(r.id)) : registros;
        updateProgress('export', 35, `Preparando ${baseExport.length.toLocaleString('pt-BR')} registro(s)...`); await pausa();
      } else {
        updateProgress('export', 10, 'Consultando total de registros...');
        const { count, error: countErr } = await supabase.from(tabelaOuViewQuery).select('id', { count: 'exact', head: true });
        if (countErr) throw countErr;
        if (!count) return updateProgress('export', 100, '<span style="color:#d97706;font-weight:600;">Nenhum registro para exportar.</span>');
        let inicio = 0;
        while (inicio < count) {
          const { data, error } = await supabase.from(tabelaOuViewQuery).select('*').order('id', { ascending: true }).range(inicio, inicio + 999);
          if (error) throw error;
          if (!data?.length) break;
          baseExport.push(...data); inicio += data.length;
          updateProgress('export', Math.min(90, Math.round((baseExport.length / count) * 85) + 10), `Carregando... ${baseExport.length}/${count}`);
          await pausa();
        }
      }

      if (!baseExport.length) return updateProgress('export', 100, '<span style="color:#d97706;font-weight:600;">Nenhum registro para exportar.</span>');
      updateProgress('export', 92, 'Preparando dados...'); await pausa();

      const ocultasSalvas = JSON.parse(localStorage.getItem(`tabelas_dados_${tabelaBd}_${userIdKey}_ocultas`)) || [];
      const cols = estData.length > 0 ? estData.filter(c => !c.oculta && !ocultasSalvas.includes(c.nome_coluna)).map(c => c.nome_coluna) : Object.keys(baseExport[0]).filter(c => c !== 'id');
      const dadosExcel = baseExport.map(linha => cols.reduce((l, c) => { l[c] = formatarValorExibicao(linha[c] ?? ''); return l; }, {}));

      updateProgress('export', 96, 'Gerando Excel...'); await pausa();
      const ws = window.XLSX.utils.json_to_sheet(dadosExcel), wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Dados");
      window.XLSX.writeFile(wb, `${titulo ? titulo.replace(/\s+/g, '_') : tabelaBd}_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  const atualizarProgressoGlobal = (pct, msg) => {
    if (getEl('apoioProgressBarWrapper')) getEl('apoioProgressBarWrapper').style.display = 'block';
    if (pct !== null && getEl('importProgressBar')) { getEl('importProgressBar').style.width = `${pct}%`; getEl('importProgressText').innerText = `${Math.round(pct)}%`; }
    if (msg && getEl('apoioProgressMsg')) getEl('apoioProgressMsg').innerText = msg;
  };

  const importarDadosTabela = async () => {
    let fileSel = null, importStep = 'SELECT', colsImp = [];
    const sysFields = ['id', 'created_at', 'updated_at', 'usu_cada', 'usucad', 'usuario', 'usuario_cadastro', 'cadastrado_por'];
    const cfgEspecial = configuracoesImportacaoEspecificas[tabelaBd];
    try {
      colsImp = (await obterEstruturaTabela(tabelaBd)).filter(c => !c.oculta && !sysFields.includes(String(c.nome_coluna).toLowerCase()));
    } catch (e) { return Swal.fire('Erro', 'Não foi possível descobrir a estrutura: ' + e.message, 'error'); }

    let optHtml = permitsCrud ? `<option value="PADRAO" selected>Importação Padrão (${titulo || tabelaBd})</option>` : '';
    if (cfgEspecial) optHtml += `<option value="ESPECIAL" ${!permitsCrud ? 'selected' : ''}>${cfgEspecial.nomeFantasia}</option>`;

    Swal.fire({
      ...swalDefault,
      html: `<div class="modal-header-pro"><div class="modal-icon-box"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div><div><h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Central de Importação</h2><p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Destino: <b>${tabelaBd}</b></p></div></div><div class="modal-body-pro"><div id="apoioStateSelect"><div class="import-select-box"><label>O que você deseja importar?</label><div class="import-select-wrapper"><select id="tipoImportacaoDinamica">${optHtml}</select><div class="import-select-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg></div></div></div><div id="apoioDropzone" class="dropzone-import disabled"><p id="apoioDropText">Selecione uma opção acima primeiro</p><span id="apoioDropSubtext"></span><input type="file" id="apoioFileInput" accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none;"></div><div id="apoioRuleBox" class="apoio-rule-box" style="display:none;"><div><b>Atenção:</b> <span id="apoioRuleText"></span></div></div></div><div id="apoioStateConfirm" style="display:none;padding:10px 0;text-align:center;"><h3 style="font-size:1.1rem;color:#1e293b;margin:0 0 8px;">Substituir dados atuais?</h3><p id="apoioConfirmMsg" style="font-size:0.9rem;color:#475569;margin:0;line-height:1.4;"></p></div><div id="apoioStateProgress" style="display:none;padding:15px 0;flex-direction:column;align-items:center;justify-content:center;"><div id="apoioProgressMsg" style="font-size:0.95rem;color:#334155;font-weight:500;">Iniciando processo...</div><div id="apoioProgressBarWrapper" style="display:none;width:100%;"><div class="progress-container"><div id="importProgressBar" class="progress-bar"></div></div><div id="importProgressText" class="progress-text">0%</div></div></div></div>`,
      confirmButtonText: 'Importar', confirmButtonColor: corTheme, width: '540px', allowOutsideClick: false,
      didOpen: () => {
        swalDefault.didOpen();
        const btn = Swal.getConfirmButton(), sel = getEl('tipoImportacaoDinamica'), drop = getEl('apoioDropzone'), fileIn = getEl('apoioFileInput'), ruleBox = getEl('apoioRuleBox');
        if (btn) { Object.assign(btn.style, { borderRadius: "8px", padding: "10px 24px", fontSize: "0.9rem", fontWeight: "600" }); btn.disabled = true; }
        const updateRule = () => {
          if (sel.value) {
            drop.classList.remove('disabled'); ruleBox.style.display = 'flex';
            getEl('apoioDropText').innerHTML = "Arraste a planilha <b>.csv, .xls</b> ou <b>.xlsx</b> aqui";
            getEl('apoioDropSubtext').textContent = "ou clique para buscar";
            getEl('apoioRuleText').innerHTML = sel.value === 'ESPECIAL' && cfgEspecial ? cfgEspecial.textoRegra : `O arquivo deve conter <b>${colsImp.length} colunas</b> na seguinte ordem: ${colsImp.map(c => `<code>${c.nome_coluna}</code>`).join(', ')}.`;
          }
        };
        sel.addEventListener('change', updateRule); updateRule();
        const handleFile = (f) => {
          if (!sel.value) return Swal.showValidationMessage('Selecione o tipo.');
          if (!['csv', 'xls', 'xlsx'].includes(f.name.split('.').pop().toLowerCase())) { btn.disabled = true; fileSel = null; return Swal.showValidationMessage('Envie .csv, .xls ou .xlsx'); }
          Swal.resetValidationMessage(); fileSel = f; drop.classList.add('has-file');
          getEl('apoioDropText').innerHTML = `Arquivo: <b style="color:${corTheme};">${f.name}</b>`;
          getEl('apoioDropSubtext').textContent = 'Tudo certo!'; btn.disabled = false;
        };
        drop.addEventListener('click', () => { if (!drop.classList.contains('disabled')) fileIn.click(); });
        drop.addEventListener('dragover', e => { e.preventDefault(); if (!drop.classList.contains('disabled')) drop.classList.add('dragover'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
        drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('dragover'); if (!drop.classList.contains('disabled') && e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
        fileIn.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });
      },
      preConfirm: async () => {
        Swal.resetValidationMessage(); const btn = Swal.getConfirmButton(), tipo = getEl('tipoImportacaoDinamica').value;
        if (importStep === 'SELECT') {
          if (!fileSel) return false;
          Object.assign(btn.style, { opacity: "0.4", cursor: "not-allowed" }); btn.disabled = true;
          getEl('apoioStateSelect').style.display = 'none'; getEl('apoioStateProgress').style.display = 'flex'; getEl('apoioProgressMsg').innerText = "Verificando base...";
          try {
            const { count, error } = await supabase.from(tabelaBd).select('id', { count: 'exact', head: true });
            if (error) throw error;
            if (count > 0 && tipo === 'PADRAO') {
              getEl('apoioStateProgress').style.display = 'none'; getEl('apoioStateConfirm').style.display = 'block';
              getEl('apoioConfirmMsg').innerHTML = `A tabela possui <b>${count}</b> registros.<br>Deseja substituir?`;
              Object.assign(btn.style, { backgroundColor: "#dc2626", opacity: "1", cursor: "pointer" }); btn.innerText = "Continuar"; btn.disabled = false;
              importStep = 'CONFIRM'; return false;
            } else {
              importStep = 'PROCESSING';
              return tipo === 'ESPECIAL' && cfgEspecial ? await procEspecial(cfgEspecial, fileSel, btn) : await procDinamica(false, fileSel, colsImp, btn);
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
    getEl('apoioProgressBarWrapper').style.display = 'none';
    if(success) getEl('apoioProgressMsg').innerHTML = `<span style="color:#10b981;font-weight:600;">${msg}</span>`;
    else Swal.showValidationMessage(msg);
    if(btn) btn.remove();
    const c = Swal.getCloseButton(); if(c) Object.assign(c.style, {pointerEvents:'auto', opacity:'1'});
    if(success) carregarDados(false);
    return false;
  };

  const procEspecial = async (cfg, file, btn) => {
    getEl('apoioStateConfirm').style.display = 'none'; getEl('apoioStateProgress').style.display = 'flex';
    if (btn) { btn.style.display = 'none'; btn.disabled = true; }
    const c = Swal.getCloseButton(); if(c) Object.assign(c.style, {pointerEvents:'none', opacity:'0.4'});
    try { await cfg.funcaoProcessadora(false, file, supabase, atualizarProgressoGlobal); return endProc(btn, 'Importação Concluída com Sucesso!'); }
    catch (err) { return endProc(btn, err.message, false); }
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
      const colChaveUnica = estComp.find(c => ['id_rastreio', 'codigo', 'pep', 'nota', 'id'].includes(String(c.nome_coluna).toLowerCase()))?.nome_coluna || colsImp[0]?.nome_coluna;

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

            getEl('apoioProgressBarWrapper').style.display = 'block';
            if (limpar) { 
              if (tabelaBd === 'tabe_cad_carteira') {
                await supabase.from('tabe_cad_carteira_log').delete().not('id', 'is', null);
                await supabase.from('tabe_imp_pep_lto').delete().not('id', 'is', null);
              }
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
      if (tabelaBd !== 'tabi_apoio_contrato' && campos.some(c => c.nome_coluna.toLowerCase() === 'filial')) {
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
          if (col.nome_coluna.toLowerCase() === 'filial' && usaFilial) return `<div class="swal-form-group" style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:0.8rem;font-weight:600;color:#475569;">${col.nome_coluna}</label><select class="swal-form-input input-dinamico" data-col="${col.nome_coluna}" ${col.obrigatorio && !col.auto ? 'required' : ''} style="width:100\%;height:38px;padding:0 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;"><option value="">Selecione...</option>${filiais.map(f => `<option value="${f}" ${val === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>`;
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
        if (editando) await supabase.from(tabelaBd).update(formValues).eq('id', editId);
        else await supabase.from(tabelaBd).insert([formValues]);
        carregarDados(false);
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
        if (tabelaBd === 'tabe_cad_carteira') {
          if (res.isConfirmed) {
            await supabase.from('tabe_cad_carteira_log').delete().not('id', 'is', null);
            await supabase.from('tabe_imp_pep_lto').delete().not('id', 'is', null);
          } else if (res.isDenied) {
            await supabase.from('tabe_cad_carteira_log').delete().in('id_atividade', linhasSelecionadasIds);
            await supabase.from('tabe_imp_pep_lto').delete().in('id_atividade', linhasSelecionadasIds);
          }
        }

        const { error } = res.isConfirmed ? await supabase.from(tabelaBd).delete().not('id','is',null) : await supabase.from(tabelaBd).delete().in('id', linhasSelecionadasIds);
        if (error) Swal.fire('Erro', error.message, 'error');
        else { Swal.fire('Sucesso', res.isConfirmed ? 'Tabela limpa.' : 'Excluídos com sucesso.', 'success'); setLinhasSelecionadasIds([]); setRegistroSelecionadoId(null); setRegistroSelecionadoObj(null); carregarDados(false); }
      }
    } else {
      const res = await Swal.fire({
        ...swalDefault, confirmButtonColor: "#dc2626", confirmButtonText: "Excluir",
        html: `<div class="modal-header-pro"><div class="modal-icon-box" style="background-color:#dc2626;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div><div><h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Excluir Selecionados</h2><p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Confirmação de exclusão</p></div></div><div class="modal-body-pro"><p style="margin:0;color:#475569;font-size:0.9rem;">Essa ação apagará <b>${linhasSelecionadasIds.length}</b> linha(s) selecionada(s).</p></div>`
      });
      if (res.isConfirmed) {
        if (tabelaBd === 'tabe_cad_carteira') {
          await supabase.from('tabe_cad_carteira_log').delete().in('id_atividade', linhasSelecionadasIds);
          await supabase.from('tabe_imp_pep_lto').delete().in('id_atividade', linhasSelecionadasIds);
        }
        const { error } = await supabase.from(tabelaBd).delete().in('id', linhasSelecionadasIds);
        if (error) Swal.fire('Erro', error.message, 'error');
        else { Swal.fire('Sucesso', 'Excluídos com sucesso.', 'success'); setLinhasSelecionadasIds([]); setRegistroSelecionadoId(null); setRegistroSelecionadoObj(null); carregarDados(false); }
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
        {onClose && <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#64748b', padding:'6px', borderRadius:'50%' }} title="Fechar"><X size={18} /></button>}
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
          <button onClick={() => carregarDados(false)} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:'#334155' }} title="Atualizar"><RefreshCw size={14} className={loading ? "lucide-spin" : ""} /> Atualizar</button>
          <button onClick={exportarDadosTabela} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:'#334155' }}><Download size={14} /> Exportar</button>
          <button onClick={importarDadosTabela} style={{ ...btnBase, background:'#f1f5f9', border:'1px solid #cbd5e1', color:'#475569' }}><Upload size={14} /> Importar</button>
          {tabelaBd === "tabe_imp_pep" && <button onClick={copiarPIs} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:'#334155' }} title="Copiar PEP's"><Copy size={14} /> Copiar PEP's</button>}
          {permitsCrud && <button onClick={() => abrirFormRegistroTabela(null)} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:'#334155' }}><Plus size={14} /> Novo</button>}
          {permitsCrud && <button onClick={() => abrirFormRegistroTabela(registroSelecionadoObj)} disabled={!registroSelecionadoId} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:'#334155', opacity:registroSelecionadoId ? 1 : 0.4, cursor:registroSelecionadoId ? 'pointer' : 'not-allowed' }}><Edit2 size={14} /> Editar</button>}
          <button onClick={excluirRegistrosSelecionados} disabled={!temSel} style={{ ...btnBase, background:'#fff', border:'1px solid #cbd5e1', color:temSel ? '#dc2626' : '#334155', opacity:temSel ? 1 : 0.4, cursor:temSel ? 'pointer' : 'not-allowed' }} title="Excluir selecionados"><Trash2 size={14} /> Excluir</button>
        </div>
      </div>
      <div style={{ flex:1, background:'#ffffff', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100%", color:"#64748b", fontWeight:"500" }}>
            Atualizando dados<span className="loading-dots"></span>
          </div>
        ) : (
          <DataTable key={limparFiltrosTrigger} data={registros} totalBanco={totalBanco} paginaAtual={paginaAtual} registrosPorPagina={registrosPorPagina} onPageChange={setPaginaAtual} onLimitChange={l => { setRegistrosPorPagina(l); setPaginaAtual(1); }} onFilterChange={f => { setFiltrosColunas(f); setPaginaAtual(1); }} onFetchColumnOptions={buscarOpcoesColunaBanco} tableId={`tabelas_dados_${tabelaBd}_${userIdKey}`} onSelectionChange={handleSelectionChange} />
        )}
      </div>
    </div>
  );
}