import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../services/supabase";
import DataTable from "../../../models/DataTable";
import Swal from "sweetalert2";
import { Database, Search, Download, Upload, Trash2, RefreshCw, FilterX, Calendar, HelpCircle, Check, ChevronDown } from "lucide-react";

const corTheme = "#005596";
const tabelaBd = "tabe_imp_pep_fat";
const tabelaImportacao = "tabe_imp_pep_fat";
const titulo = "Obra Investimento Faturada";
const colunasOcultasDesejadas = ["created_at", "usu_cada", "id"];

export default function Pepfaturado() {
  const [registros, setRegistros] = useState([]);
  const [totalBanco, setTotalBanco] = useState(0);
  const [estrutura, setEstrutura] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculandoSoma, setCalculandoSoma] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtrosColunas, setFiltrosColunas] = useState({});
  const [registroSelecionadoId, setRegistroSelecionadoId] = useState(null);
  const [registroSelecionadoObj, setRegistroSelecionadoObj] = useState(null);
  const [linhasSelecionadasIds, setLinhasSelecionadasIds] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(100);
  const [limparFiltrosTrigger, setLimparFiltrosTrigger] = useState(0);
  const [buscaConsulta, setBuscaConsulta] = useState("");
  const [filtrosConsulta, setFiltrosConsulta] = useState({});

  const [anosMesesDisponiveis, setAnosMesesDisponiveis] = useState([]);
  const [anosMesesSelecionados, setAnosMesesSelecionados] = useState([]);
  const [dropdownAnoMesAberto, setDropdownAnoMesAberto] = useState(false);
  const [buscaDropdown, setBuscaDropdown] = useState(""); 
  const [somaTotalGeral, setSomaTotalGeral] = useState(0);

  const [modalInformacaoAberto, setModalInformacaoAberto] = useState(false);
  const [textoInformacao, setTextoInformacao] = useState("");
  const [editandoInformacao, setEditandoInformacao] = useState(false);
  const [salvandoInformacao, setSalvandoInformacao] = useState(false);

  const isInitialMount = useRef(true);
  const estruturaCacheRef = useRef(new Map());
  const estruturaPromiseRef = useRef(null);
  const opcoesCacheRef = useRef(new Map());
  const opcoesInFlightRef = useRef(new Map());
  const paginaCacheRef = useRef(new Map());
  const requestIdRef = useRef(0);
  const buscaDebounceRef = useRef(null);
  const filtrosColunasRef = useRef({});
  filtrosColunasRef.current = filtrosColunas;
  const filtrosDebounceRef = useRef(null);
  const dropdownRef = useRef(null);

  const sessaoUsuario = JSON.parse(localStorage.getItem("usuario_logado")) || {};
  const userIdKey = sessaoUsuario.id || sessaoUsuario.email || "geral";
  
  const perfilUsuario = String(sessaoUsuario.Perfil || sessaoUsuario.perfil || sessaoUsuario.perfil_nome || "").trim().toLowerCase();
  const isDesenvolvedor = perfilUsuario === "desenvolvedor";
  const isGerenteOuDev = perfilUsuario === "desenvolvedor" || perfilUsuario === "gerente";

  const getEl = (id) => document.getElementById(id);

  const getNomeUsuarioLogado = () => {
    try {
      const d = localStorage.getItem("usuario_logado");
      if (d) {
        const p = JSON.parse(d);
        return p.nome || window.usuarioLogado || window.nomeUsuario || "Sistema";
      }
    } catch (e) {}
    return window.usuarioLogado || window.nomeUsuario || "Sistema";
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownAnoMesAberto(false);
        setBuscaDropdown("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!getEl("apoio-import-styles")) {
      const style = document.createElement("style");
      style.id = "apoio-import-styles";
      style.innerHTML = `
        @keyframes lucide-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .lucide-spin { animation: lucide-spin 2s linear infinite; }
        @keyframes loadingDots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } }
        .loading-dots::after { display: inline-block; animation: loadingDots 1.5s infinite steps(4, end); content: ''; width: 16px; text-align: left; }
        .swal2-enterprise-modal { border-radius: 16px !important; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1); padding-bottom: 16px !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important; }
        .swal2-custom-actions { margin-top: 0 !important; margin-bottom: 10px !important; gap: 12px !important; display: flex !important; justify-content: center !important; flex-shrink: 0 !important; }
        .modal-header-pro { background: #f8fafc; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 14px; text-align: left; flex-shrink: 0; }
        .modal-header-left { display: flex; align-items: center; gap: 14px; }
        .modal-icon-box { background: ${corTheme}; color: #fff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,85,150,.2); flex-shrink: 0; }
        .modal-body-pro { padding: 24px 24px 12px; display: flex; flex-direction: column; text-align: left; flex: 1; overflow-y: auto; box-sizing: border-box; }
        .modal-result-pro { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center !important; padding: 20px 10px; box-sizing: border-box; }
        .modal-result-icon { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
        .modal-result-title { margin: 0; font-size: 1rem; font-weight: 700; text-align: center; }
        .modal-result-text { margin: 7px 0 0; color: #64748b; font-size: .86rem; line-height: 1.45; max-width: 520px; text-align: center; word-break: break-word; }
        .dropzone-import { border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 20px 15px; text-align: center; cursor: pointer; transition: all .2s ease; background: #fff; margin-bottom: 12px; }
        .dropzone-import.dragover:not(.disabled), .dropzone-import:hover:not(.disabled) { background: #f0f9ff; border-color: ${corTheme}; }
        .dropzone-import.has-file { background: #f0fdf4; border-color: #16a34a; }
        .dropzone-import p { margin: 0; color: #334155; font-size: .9rem; font-weight: 500; }
        .dropzone-import span { font-size: .75rem; color: #94a3b8; }
        .apoio-rule-box { margin-top: 10px; font-size: .85rem; color: #475569; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #f8fafc; padding: 12px 15px; border-radius: 8px; border-left: 3px solid ${corTheme}; text-align: left; line-height: 1.4; }
        .progress-container { width: 100%; background: #f1f5f9; border-radius: 99px; height: 10px; overflow: hidden; margin-top: 15px; }
        .progress-bar { width: 0; height: 100%; background: ${corTheme}; transition: width .2s ease; }
        .progress-text { font-size: .8rem; color: #64748b; margin-top: 6px; font-weight: 500; text-align: center; }
        .btn-template-header { background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all .2s; white-space: nowrap; }
        .btn-template-header:hover { background: #f1f5f9; border-color: ${corTheme}; color: ${corTheme}; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const carregarInformacaoPassoAPasso = async () => {
    try {
      const { data } = await supabase
        .from("tabi_sis_informacao")
        .select("conteudo")
        .eq("secao", "peplocal")
        .maybeSingle();

      if (data && data.conteudo) {
        setTextoInformacao(data.conteudo);
      } else {
        setTextoInformacao("Nenhuma instrução cadastrada no momento.");
      }
    } catch (err) {
      console.log("Erro ao carregar instrução:", err);
      setTextoInformacao("Nenhuma instrução cadastrada no momento.");
    }
  };

  const salvarInformacaoPassoAPasso = async () => {
    setSalvandoInformacao(true);
    try {
      const nomeUsuario = getNomeUsuarioLogado();

      const { data: existente } = await supabase
        .from("tabi_sis_informacao")
        .select("id")
        .eq("secao", "peplocal")
        .maybeSingle();

      let error;
      if (existente) {
        const res = await supabase
          .from("tabi_sis_informacao")
          .update({ 
            conteudo: textoInformacao, 
            usu_cada: nomeUsuario
          })
          .eq("secao", "peplocal");
        error = res.error;
      } else {
        const res = await supabase
          .from("tabi_sis_informacao")
          .insert([{ 
            secao: "peplocal", 
            conteudo: textoInformacao,
            usu_cada: nomeUsuario
          }]);
        error = res.error;
      }

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "Salvo com sucesso!",
        text: "As instruções de passo a passo foram atualizadas.",
        timer: 2000,
        showConfirmButton: false
      });
      setEditandoInformacao(false);
    } catch (err) {
      Swal.fire("Erro", "Não foi possível salvar as informações: " + err.message, "error");
    } finally {
      setSalvandoInformacao(false);
    }
  };

  const abrirModalInformacao = () => {
    carregarInformacaoPassoAPasso();
    setEditandoInformacao(false);
    setModalInformacaoAberto(true);
  };

  const removerBotaoCancelarModal = () => {
    const btnCancel = Swal.getCancelButton();
    if (btnCancel) btnCancel.remove();
    const actions = Swal.getActions();
    if (actions) actions.querySelectorAll(".swal2-cancel").forEach(btn => btn.remove());
  };

  const swalDefault = {
    padding: "0",
    background: "#ffffff",
    showCloseButton: true,
    customClass: { popup: "swal2-enterprise-modal", actions: "swal2-custom-actions" },
    didRender: removerBotaoCancelarModal,
    didOpen: () => {
      removerBotaoCancelarModal();
      const closeBtn = Swal.getCloseButton();
      if (closeBtn) closeBtn.style.cssText = "position:absolute;top:6px;right:6px;outline:none;color:#94a3b8;padding:4px;";
    }
  };

  const mostrarResultadoNoModal = (tipo, mensagem, detalhe = "") => {
    Swal.hideLoading();
    Swal.resetValidationMessage();
    const actions = Swal.getActions();
    if (actions) actions.style.display = "none";
    const confirm = Swal.getConfirmButton();
    const deny = Swal.getDenyButton();
    if (confirm) { confirm.style.setProperty("display", "none", "important"); confirm.disabled = true; }
    if (deny) { deny.style.setProperty("display", "none", "important"); deny.disabled = true; }
    const closeBtn = Swal.getCloseButton();
    if (closeBtn) Object.assign(closeBtn.style, { pointerEvents: "auto", opacity: "1" });

    const isSuccess = tipo === "success";
    const isWarning = tipo === "warning";
    const cor = isSuccess ? "#10b981" : isWarning ? "#d97706" : "#dc2626";
    const fundo = isSuccess ? "#ecfdf5" : isWarning ? "#fffbeb" : "#fef2f2";
    const tituloResultado = isSuccess ? "Sucesso!" : isWarning ? "Atenção" : "Erro";
    const icone = isSuccess ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : isWarning ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>` : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

    const popup = Swal.getPopup();
    if (!popup) return;

    ["#apoioStateSelect", "#apoioStateConfirm", "#apoioStateProgress", "#exportStateSelect", "#exportStateProgress"].forEach(sel => {
      const el = popup.querySelector(sel);
      if (el) el.style.display = "none";
    });

    const resultadoAnterior = popup.querySelector("#modalResultadoFinal");
    if (resultadoAnterior) resultadoAnterior.remove();

    const resultado = document.createElement("div");
    resultado.id = "modalResultadoFinal";
    resultado.className = "modal-result-pro";
    resultado.innerHTML = `
      <div class="modal-result-icon" style="background:${fundo};color:${cor};">${icone}</div>
      <p class="modal-result-title" style="color:${cor};">${tituloResultado}</p>
      <p class="modal-result-text">${mensagem}</p>
      ${detalhe ? `<p class="modal-result-text" style="margin-top:5px;font-size:.8rem;">${detalhe}</p>` : ""}
    `;
    const body = popup.querySelector(".modal-body-pro") || popup;
    body.appendChild(resultado);
  };

  const obterEstruturaTabela = async (tabela) => {
    if (!tabela) throw new Error("Nome da tabela não informado.");
    const cache = estruturaCacheRef.current.get(tabela);
    if (cache) return cache;
    if (estruturaPromiseRef.current) return estruturaPromiseRef.current;

    estruturaPromiseRef.current = supabase.rpc("obter_estrutura_tabela", { p_tabela: tabela })
      .then(({ data, error }) => {
        if (error) throw error;
        let est = Array.isArray(data) ? data : [];
        est = est.map(col => {
          const nomeLower = String(col.nome_coluna || "").toLowerCase();
          if (colunasOcultasDesejadas.includes(nomeLower)) return { ...col, oculta: true };
          return col;
        });
        estruturaCacheRef.current.set(tabela, est);
        return est;
      })
      .finally(() => { estruturaPromiseRef.current = null; });
    return estruturaPromiseRef.current;
  };

  const normalizarOpcao = (valor) => {
    const isNu = valor === null || valor === undefined || (typeof valor === "string" && (valor.trim() === "" || valor.trim() === "-"));
    return { chave: isNu ? "##NULL##" : String(valor), exibicao: isNu ? "-" : String(valor) };
  };

  const obterColunasTexto = (estData) => {
    const cols = estData
      .filter(c => !c.oculta && !colunasOcultasDesejadas.includes(String(c.nome_coluna || "").toLowerCase()))
      .filter(c => String(c.tipo || c.data_type || "").toLowerCase().match(/char|text|string/))
      .map(c => c.nome_coluna)
      .filter(Boolean);
    return [...new Set(cols)];
  };

  const aplicarFiltrosAuxiliaresCom = (query, filtros = filtrosColunas) => {
    Object.keys(filtros || {}).forEach(col => {
      const regras = filtros[col];
      if (!Array.isArray(regras) || regras.length === 0) return;

      const definicao = estrutura.find(c => String(c.nome_coluna) === String(col));
      const tipo = String(definicao?.tipo || definicao?.data_type || "").toLowerCase();
      const ehData = /date|timestamp|timestamptz/.test(tipo);
      const exatos = regras.filter(f => !String(f).startsWith(">=|") && !String(f).startsWith("<=|"));
      const maiorQue = regras.find(f => String(f).startsWith(">=|"))?.split(">=|")[1];
      const menorQue = regras.find(f => String(f).startsWith("<=|"))?.split("<=|")[1];

      if (exatos.length > 0) {
        const temNull = exatos.includes("##NULL##");
        const valoresNormais = exatos.filter(v => v !== "##NULL##")
          .map(v => String(v).trim())
          .filter(v => v !== "" && (!ehData || (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v) && !isNaN(Date.parse(v)))));

        if (ehData) {
          if (temNull && valoresNormais.length === 0) {
            query = query.is(col, null);
          } else if (valoresNormais.length > 0) {
            query = temNull
              ? query.or(`${col}.is.null,${valoresNormais.map(v => `${col}.eq.${v}`).join(",")}`)
              : query.in(col, valoresNormais);
          }
        } else if (temNull && valoresNormais.length === 0) {
          query = query.or(`${col}.is.null,${col}.eq.-,${col}.eq.""`);
        } else if (valoresNormais.length > 0) {
          if (temNull) {
            const condicoesOr = [`${col}.is.null`, `${col}.eq.-`, `${col}.eq.""`, ...valoresNormais.map(v => {
              const limpo = v.replace(/"/g, '\\"');
              return !isNaN(limpo) && limpo !== "" ? `${col}.eq.${limpo}` : `${col}.eq."${limpo}"`;
            })];
            query = query.or(condicoesOr.join(","));
          } else {
            query = query.in(col, valoresNormais);
          }
        }
      }

      if (maiorQue !== undefined && maiorQue !== "") {
        const valorStr = String(maiorQue).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(valorStr) && !isNaN(Date.parse(valorStr))) {
          query = query.gte(col, ehData && !/^date$/.test(tipo) ? `${valorStr}T00:00:00` : valorStr);
        } else if (!ehData) {
          const numeroMaior = Number(valorStr.replace(/\./g, "").replace(",", "."));
          if (Number.isFinite(numeroMaior)) query = query.gte(col, numeroMaior);
        }
      }

      if (menorQue !== undefined && menorQue !== "") {
        const valorStr = String(menorQue).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(valorStr) && !isNaN(Date.parse(valorStr))) {
          query = query.lte(col, ehData && !/^date$/.test(tipo) ? `${valorStr}T23:59:59` : valorStr);
        } else if (!ehData) {
          const numeroMenor = Number(valorStr.replace(/\./g, "").replace(",", "."));
          if (Number.isFinite(numeroMenor)) query = query.lte(col, numeroMenor);
        }
      }
    });

    if (anosMesesSelecionados.length > 0) {
      const condicoesFiltroData = anosMesesSelecionados.map(anoMes => {
        const [ano, mes] = anoMes.split("-");
        const ultimoDia = new Date(ano, mes, 0).getDate();
        return `and(data.gte.${ano}-${mes}-01,data.lte.${ano}-${mes}-${ultimoDia}T23:59:59)`;
      });
      query = query.or(condicoesFiltroData.join(","));
    }
    return query;
  };

  const aplicarBuscaCom = (query, termo, colunasTexto) => {
    const termoLimpo = String(termo || "").replace(/[,;()]/g, "").trim();
    if (termoLimpo.length >= 2 && colunasTexto.length) {
      query = query.or(colunasTexto.map(col => `${col}.ilike.%${termoLimpo}%`).join(","));
    }
    return query;
  };

  const carregarAnosMesesDisponiveis = async () => {
    try {
      let todosAnosMeses = new Set();
      let from = 0;
      let step = 1000;
      let continuar = true;

      while (continuar) {
        const { data, error } = await supabase
          .from(tabelaBd)
          .select("data")
          .not("data", "is", null)
          .range(from, from + step - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        data.forEach(row => {
          if (row.data) {
            const anoMesStr = String(row.data).substring(0, 7);
            if (/^\d{4}-\d{2}$/.test(anoMesStr)) {
              todosAnosMeses.add(anoMesStr);
            }
          }
        });

        if (data.length < step) {
          continuar = false;
        } else {
          from += step;
        }
      }

      const listaOrdenada = Array.from(todosAnosMeses).sort().reverse();
      setAnosMesesDisponiveis(listaOrdenada);
      
      if (listaOrdenada.length > 0 && anosMesesSelecionados.length === 0) {
        setAnosMesesSelecionados([listaOrdenada[0]]);
      }
    } catch (err) {
      console.error("Erro ao carregar anos e meses disponíveis:", err);
    }
  };

  const carregarSomaTotal = useCallback(async (estAtual = estrutura) => {
    setCalculandoSoma(true);
    try {
      let query = supabase.from(tabelaBd).select("valor");
      query = aplicarFiltrosAuxiliaresCom(query, filtrosConsulta);
      const termo = buscaConsulta.trim();
      let estData = estAtual;
      if (!estData.length) {
        estData = await obterEstruturaTabela(tabelaBd);
      }
      if (estData.length) {
        const colunasBusca = obterColunasTexto(estData);
        query = aplicarBuscaCom(query, termo, colunasBusca);
      }

      let somaTotal = 0;
      let from = 0;
      let step = 1000;
      let continuar = true;

      while (continuar) {
        const { data, error } = await query.range(from, from + step - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;

        data.forEach(row => {
          somaTotal += Number(row.valor) || 0;
        });

        if (data.length < step) {
          continuar = false;
        } else {
          from += step;
        }
      }

      setSomaTotalGeral(somaTotal);
      setCalculandoSoma(false);
      return somaTotal;
    } catch (err) {
      console.error("Erro ao calcular soma total:", err);
      setSomaTotalGeral(0);
      setCalculandoSoma(false);
      return 0;
    }
  }, [filtrosConsulta, buscaConsulta, anosMesesSelecionados, estrutura]);

  const carregarDados = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setCalculandoSoma(true);
    try {
      let estData = estrutura;
      if (!estData.length) {
        estData = await obterEstruturaTabela(tabelaBd);
        if (reqId !== requestIdRef.current) return;
        setEstrutura(estData);
      }
      const termo = buscaConsulta.trim();
      const filtrosAplicados = filtrosConsulta || {};
      const from = (paginaAtual - 1) * registrosPorPagina;
      const colunasBusca = obterColunasTexto(estData);
      const paginaKey = JSON.stringify([tabelaBd, termo, filtrosAplicados, anosMesesSelecionados, paginaAtual, registrosPorPagina]);

      let pagina = paginaCacheRef.current.get(paginaKey);
      if (!pagina) {
        let query = supabase.from(tabelaBd).select("*", { count: "exact" });
        query = aplicarFiltrosAuxiliaresCom(query, filtrosAplicados);
        query = aplicarBuscaCom(query, termo, colunasBusca);

        const temId = (estData || []).some(c => String(c.nome_coluna || "").toLowerCase() === "id");
        const consultaPagina = temId ? query.range(from, from + registrosPorPagina - 1).order("id", { ascending: false }) : query.range(from, from + registrosPorPagina - 1);
        const res = await consultaPagina;
        if (res.error) throw res.error;

        const dadosLimpos = (res.data || []).map(row => {
          const newRow = { ...row };
          colunasOcultasDesejadas.forEach(col => {
            Object.keys(newRow).forEach(k => { if (k.toLowerCase() === col) delete newRow[k]; });
          });

          if (newRow.valor !== null && newRow.valor !== undefined && !isNaN(newRow.valor)) {
            newRow.valor = Number(newRow.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          } else {
            newRow.valor = "R$ 0,00";
          }

          return newRow;
        });

        pagina = { data: dadosLimpos, count: res.count || 0 };
        paginaCacheRef.current.set(paginaKey, pagina);
      }
      if (reqId !== requestIdRef.current) return;

      await Promise.all([
        carregarSomaTotal(estData),
        Promise.resolve().then(() => {
          setTotalBanco(pagina.count);
          setRegistros(pagina.data);
        })
      ]);

      if (reqId !== requestIdRef.current) return;
      setLoading(false);
    } catch (err) {
      if (reqId === requestIdRef.current) {
        setLoading(false);
        setCalculandoSoma(false);
        Swal.fire("Erro", "Erro ao carregar dados: " + err.message, "error");
      }
    }
  }, [tabelaBd, paginaAtual, registrosPorPagina, buscaConsulta, filtrosConsulta, anosMesesSelecionados, estrutura, carregarSomaTotal]);

  useEffect(() => {
    let isMounted = true;
    const inicializarApp = async () => {
      setLoading(true);
      setCalculandoSoma(true);
      try {
        const [estData] = await Promise.all([
          obterEstruturaTabela(tabelaBd),
          carregarAnosMesesDisponiveis()
        ]);
        if (isMounted && estData) {
          setEstrutura(estData);
        }
      } catch (e) {
        console.error("Erro na inicialização:", e);
      }
    };
    inicializarApp();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    clearTimeout(buscaDebounceRef.current);
    buscaDebounceRef.current = setTimeout(() => { setBuscaConsulta(busca.trim()); }, 280);
    return () => clearTimeout(buscaDebounceRef.current);
  }, [busca]);

  useEffect(() => {
    clearTimeout(filtrosDebounceRef.current);
    filtrosDebounceRef.current = setTimeout(() => { setFiltrosConsulta(filtrosColunas || {}); }, 180);
    return () => clearTimeout(filtrosDebounceRef.current);
  }, [filtrosColunas]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    carregarDados();
    return () => { requestIdRef.current += 1; };
  }, [carregarDados, anosMesesSelecionados, buscaConsulta, filtrosConsulta]);

  const invalidarCaches = useCallback(() => {
    opcoesCacheRef.current.clear();
    paginaCacheRef.current.clear();
    opcoesInFlightRef.current.clear();
  }, []);

  const buscarOpcoesColunaBanco = useCallback(async (coluna, filtrosAtuais = filtrosColunasRef.current, termo = "") => {
    if (!coluna) return [];
    try {
      const filtrosOutrasColunas = { ...(filtrosAtuais || {}) };
      delete filtrosOutrasColunas[coluna];
      const termoLimpo = String(termo || "").trim();
      const definicao = estrutura.find(c => c.nome_coluna === coluna);
      const tipo = String(definicao?.tipo || definicao?.data_type || "").toLowerCase();
      const ehTexto = /char|text|string|varchar|citext/.test(tipo);
      const termoSeguro = termoLimpo.replace(/[,;()]/g, " ").replace(/[\\%_]/g, "\\$&").trim();
      const valores = [];
      let inicio = 0, continuar = true;

      while (continuar) {
        let query = supabase.from(tabelaBd).select(coluna);
        query = aplicarFiltrosAuxiliaresCom(query, filtrosOutrasColunas);
        if (ehTexto && termoSeguro) query = query.ilike(coluna, `%${termoSeguro}%`);
        const { data, error } = await query.range(inicio, inicio + 999);
        if (error) throw error;
        (data || []).forEach(row => valores.push(row[coluna]));
        continuar = (data || []).length === 1000;
        inicio += 1000;
      }

      const unicos = new Map();
      valores.forEach(valor => {
        const opcao = normalizarOpcao(valor);
        if (!unicos.has(opcao.chave)) unicos.set(opcao.chave, opcao);
      });
      return Array.from(unicos.values())
        .sort((a, b) => a.exibicao.localeCompare(b.exibicao, "pt-BR", { numeric: true, sensitivity: "base" }));
    } catch (err) {
      console.error("Erro ao buscar opções em cascata:", err);
      return [];
    }
  }, [estrutura, anosMesesSelecionados]);

  const handleSelectionChange = ids => {
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
    const state = getEl(`${prefix}StateSelect`);
    const progress = getEl(`${prefix}StateProgress`);
    const bar = getEl(`${prefix}ProgressBar`);
    const txt = getEl(`${prefix}ProgressText`);
    const msge = getEl(`${prefix}ProgressMsg`);

    if (state) state.style.display = "none";
    if (progress) progress.style.display = "block";
    if (bar && pct !== null) { bar.style.width = `${pct}%`; if (color) bar.style.background = color; }
    if (txt && pct !== null) { txt.innerText = `${Math.round(pct)}%`; txt.style.textAlign = "center"; }
    if (msge && msg) { msge.innerHTML = msg; msge.style.textAlign = "center"; msge.style.width = "100%"; }
  };

  const formatarValorExibicao = valor => {
    if (valor === null || valor === undefined) return "";
    if (typeof valor === "object") return JSON.stringify(valor);
    return valor;
  };

  const baixarTemplateImportacao = async () => {
    try {
      if (typeof window.XLSX === "undefined") {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      
      const colunasTemplate = [
        "pi", "pep", "tpo", "objeto", "data", "classe_invest", "denom_classe", 
        "codigo", "descricao_codigo", "qtd", "um", "valor", "classe_obj", 
        "desc_sa", "linha_lanc", "num_doc", "num_doc_ref", "usuario"
      ];
      const objVazio = colunasTemplate.reduce((acc, col) => { acc[col] = ""; return acc; }, {});
      const ws = window.XLSX.utils.json_to_sheet([objVazio]);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Template");
      window.XLSX.writeFile(wb, `Template_${titulo.replace(/\s+/g, "_")}.xlsx`);
    } catch (err) {
      Swal.fire("Erro", "Erro ao gerar template: " + err.message, "error");
    }
  };

  const executarExportacao = async apenasFiltrados => {
    const pausa = () => new Promise(r => setTimeout(r, 0));
    try {
      const actions = Swal.getActions();
      if (actions) actions.style.display = "none";
      const confirm = Swal.getConfirmButton();
      const deny = Swal.getDenyButton();
      if (confirm) { confirm.style.setProperty("display", "none", "important"); confirm.disabled = true; }
      if (deny) { deny.style.setProperty("display", "none", "important"); deny.disabled = true; }

      updateProgress("export", 5, "Iniciando exportação...");
      if (typeof window.XLSX === "undefined") {
        updateProgress("export", 8, "Carregando recurso do Excel...");
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      let baseExport = [];
      if (apenasFiltrados) {
        baseExport = linhasSelecionadasIds?.length > 0 ? registros.filter(r => linhasSelecionadasIds.includes(r.id)) : registros;
        updateProgress("export", 35, `Preparando ${baseExport.length.toLocaleString("pt-BR")} registro(s)...`);
        await pausa();
      } else {
        const r = await supabase.from(tabelaBd).select("*", { count: "exact", head: true });
        if (r.error) throw r.error;
        const count = r.count || 0;
        if (!count) {
          mostrarResultadoNoModal("warning", "Nenhum registro para exportar.");
          return false;
        }
        let inicio = 0;
        let buscar = true;
        while (buscar && inicio < count) {
          const { data, error } = await supabase.from(tabelaBd).select("*").range(inicio, inicio + 999);
          if (error) throw error;
          if (!data?.length) break;
          baseExport.push(...data);
          inicio += data.length;
          buscar = data.length === 1000;
          const pct = Math.min(90, Math.round((baseExport.length / count) * 85) + 10);
          updateProgress("export", pct, `Carregando... ${baseExport.length}/${count}`);
          await pausa();
        }
      }

      if (!baseExport.length) {
        mostrarResultadoNoModal("warning", "Nenhum registro para exportar.");
        return false;
      }

      updateProgress("export", 92, "Preparando dados...");
      await pausa();

      const ocultasSalvas = JSON.parse(localStorage.getItem(`tabelas_dados_${tabelaBd}_${userIdKey}_ocultas`)) || [];
      let cols = baseExport[0] ? Object.keys(baseExport[0]).filter(c => !ocultasSalvas.includes(c) && !colunasOcultasDesejadas.includes(c.toLowerCase())) : [];
      const dadosExcel = baseExport.map(linha => cols.reduce((l, c) => { l[c] = formatarValorExibicao(linha[c] ?? ""); return l; }, {}));

      updateProgress("export", 96, "Gerando Excel...");
      await pausa();

      const ws = window.XLSX.utils.json_to_sheet(dadosExcel);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Dados");
      window.XLSX.writeFile(wb, `${titulo.replace(/\s+/g, "_")}_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);

      mostrarResultadoNoModal("success", "Exportação concluída!", `${baseExport.length.toLocaleString("pt-BR")} registro(s) exportado(s).`);
      return false;
    } catch (err) {
      mostrarResultadoNoModal("error", "Não foi possível concluir a exportação.", err.message || String(err));
      return false;
    }
  };

  const exportarDadosTabela = () => {
    const qtde = linhasSelecionadasIds?.length ? registros.filter(r => linhasSelecionadasIds.includes(r.id)).length : registros.length;
    Swal.fire({
      ...swalDefault,
      html: `
        <div class="modal-header-pro">
          <div class="modal-header-left">
            <div class="modal-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div>
              <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Central de Exportação</h2>
              <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Exportar Dados para Excel</p>
            </div>
          </div>
        </div>
        <div class="modal-body-pro">
          <div id="exportStateSelect">
            <p style="margin:0 0 10px;color:#475569;font-size:0.9rem;">Deseja exportar a base <b>completa</b> ou apenas as <b>${qtde}</b> linhas da visualização?</p>
          </div>
          <div id="exportStateProgress" style="display:none;padding:10px 0;text-align:center;">
            <div id="exportProgressMsg" style="font-size:0.95rem;color:#334155;font-weight:500;text-align:center;width:100%;">Iniciando exportação...</div>
            <div style="width:100%;">
              <div class="progress-container"><div id="exportProgressBar" class="progress-bar"></div></div>
              <div id="exportProgressText" class="progress-text">0%</div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: false,
      showDenyButton: true,
      confirmButtonText: "Completa",
      denyButtonText: "Filtrada",
      confirmButtonColor: corTheme,
      denyButtonColor: "#10b981",
      allowOutsideClick: false,
      preConfirm: async () => await executarExportacao(false),
      preDeny: async () => await executarExportacao(true)
    });
  };

  const limpaStr = v => v ? String(v).replace(/^"|"$/g, '').trim() : null;

  const parseNum = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    let s = String(val).trim().replace(/^"|"$/g, '');
    if (!s || /^(null|undefined|NaN)$/i.test(s)) return null;
    s = s.replace(/\s+/g, '').replace(/\.(?=\d{3}(?:\.|$))/g, '').replace(',', '.');
    const n = Number(s);
    return isNaN(n) ? null : n;
  };

  const parseIntNum = (val) => {
    const n = parseNum(val);
    return n !== null ? Math.trunc(n) : null;
  };

  const formatarDataSegura = (val) => {
    if (val == null || val === '') return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      const y = val.getUTCFullYear();
      if (y < 1900 || y > 2100) return null;
      return `${y}-${String(val.getUTCMonth() + 1).padStart(2, '0')}-${String(val.getUTCDate()).padStart(2, '0')}`;
    }
    if (typeof val === 'number') {
      if (val > 10000 && val < 60000) {
        const d = new Date(Date.UTC(1899, 11, 30) + Math.round(val * 86400000));
        if (!isNaN(d.getTime())) {
          const y = d.getUTCFullYear();
          if (y >= 1900 && y <= 2100) {
            return `${y}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
          }
        }
      }
      return null;
    }
    let s = String(val).trim().replace(/^"|"$/g, '');
    if (!s || /^(null|undefined|NaN)$/i.test(s)) return null;
    const numSerial = Number(s);
    if (!isNaN(numSerial) && numSerial > 10000 && numSerial < 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(numSerial * 86400000));
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        if (y >= 1900 && y <= 2100) {
          return `${y}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        }
      }
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    const p = s.split('/');
    if (p.length === 3) {
      let [d, m, y] = p;
      if (y.length === 4 && d.length <= 2 && m.length <= 2) {
        d = Number(d); m = Number(m); y = Number(y);
        const dt = new Date(Date.UTC(y, m - 1, d));
        if (!isNaN(dt.getTime()) && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d)
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return null;
  };

  const chunkArr = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  };

  const askAction = (count, id) => new Promise(res => {
    const p = document.getElementById('apoioStateProgress');
    if (!p) { res('SUBSTITUIR'); return; }
    p.insertAdjacentHTML('beforebegin', `
      <div id="${id}" style="padding:10px 0;text-align:center;">
        <h3 style="font-size:1.1rem;color:#1e293b;margin:0 0 8px;">Registros Existentes</h3>
        <p style="font-size:0.9rem;color:#475569;margin:0 0 15px;line-height:1.4;">Encontramos <b>${count}</b> registro(s) já existentes no banco de dados. Deseja substituir os antigos ou apenas salvar os novos?</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="btnSub_${id}" style="background:#005596;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Substituir Antigos</button>
          <button id="btnNov_${id}" style="background:#e2e8f0;color:#475569;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Somente Novos</button>
        </div>
      </div>
    `);
    p.style.display = 'none';
    const clr = act => { const el = document.getElementById(id); if(el) el.remove(); p.style.display = 'flex'; res(act); };
    document.getElementById(`btnSub_${id}`).onclick = () => clr('SUBSTITUIR');
    document.getElementById(`btnNov_${id}`).onclick = () => clr('APENAS_NOVAS');
  });

  const importarDadosTabela = async () => {
    let fileSel = null;

    Swal.fire({
      ...swalDefault,
      html: `
        <div class="modal-header-pro">
          <div class="modal-header-left">
            <div class="modal-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <div>
              <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Central de Importação</h2>
              <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Destino: <b>${tabelaImportacao}</b></p>
            </div>
          </div>
          <button type="button" id="btnBaixarTemplate" class="btn-template-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Baixar Template
          </button>
        </div>
        <div class="modal-body-pro">
          <div id="apoioStateSelect">
            <div id="apoioDropzone" class="dropzone-import">
              <p id="apoioDropText">Arraste a planilha <b>.csv, .xls</b> ou <b>.xlsx</b> aqui</p>
              <span id="apoioDropSubtext">ou clique para buscar</span>
              <input type="file" id="apoioFileInput" accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none;" />
            </div>
            <div id="apoioRuleBox" class="apoio-rule-box"><span>Dúvidas no que importar, baixe o template!</span></div>
          </div>
          <div id="apoioStateProgress" style="display:none;padding:15px 0;flex-direction:column;align-items:center;justify-content:center;">
            <div id="apoioProgressMsg" style="font-size:0.95rem;color:#334155;font-weight:500;text-align:center;width:100%;">Iniciando processo...</div>
            <div id="apoioProgressBarWrapper" style="display:none;width:100%;">
              <div class="progress-container"><div id="importProgressBar" class="progress-bar"></div></div>
              <div id="importProgressText" class="progress-text">0%</div>
            </div>
          </div>
        </div>
      `,
      showDenyButton: false,
      showCancelButton: false,
      confirmButtonText: "Importar",
      confirmButtonColor: corTheme,
      width: "720px",
      allowOutsideClick: false,
      didOpen: () => {
        swalDefault.didOpen();
        const btn = Swal.getConfirmButton();
        const drop = getEl("apoioDropzone");
        const fileIn = getEl("apoioFileInput");
        const btnTemplate = getEl("btnBaixarTemplate");

        if (btn) {
          Object.assign(btn.style, { borderRadius: "8px", padding: "10px 24px", fontSize: "0.9rem", fontWeight: "600" });
          btn.disabled = true;
        }
        if (btnTemplate) btnTemplate.onclick = e => { e.preventDefault(); baixarTemplateImportacao(); };

        const handleFile = f => {
          if (!["csv", "xls", "xlsx"].includes(f.name.split(".").pop().toLowerCase())) {
            if (btn) btn.disabled = true;
            fileSel = null;
            Swal.showValidationMessage("Envie .csv, .xls ou .xlsx");
            return;
          }
          Swal.resetValidationMessage();
          fileSel = f;
          drop.classList.add("has-file");
          getEl("apoioDropText").innerHTML = `Arquivo: <b style="color:${corTheme};">${f.name}</b>`;
          getEl("apoioDropSubtext").textContent = "Tudo certo!";
          if (btn) btn.disabled = false;
        };

        drop.addEventListener("click", () => fileIn.click());
        drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("dragover"); });
        drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
        drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("dragover"); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
        fileIn.addEventListener("change", e => { if (e.target.files.length) handleFile(e.target.files[0]); });
      },
      preConfirm: async () => {
        Swal.resetValidationMessage();
        if (!fileSel) return false;

        const btn = Swal.getConfirmButton();
        const actions = Swal.getActions();
        if (actions) actions.style.display = "none";
        if (btn) { Object.assign(btn.style, { opacity: "0.4", cursor: "not-allowed" }); btn.disabled = true; }

        const stateSelect = getEl("apoioStateSelect");
        const stateProgress = getEl("apoioStateProgress");
        if (stateSelect) stateSelect.style.display = "none";
        if (stateProgress) stateProgress.style.display = "flex";

        try {
          return await processarImportacaoPep(fileSel, btn);
        } catch (err) {
          return endProc(btn, err.message, false);
        }
      }
    });
  };

  const endProc = (btn, msg, success = true) => {
    const wrapper = getEl("apoioProgressBarWrapper");
    const msgEl = getEl("apoioProgressMsg");
    if (wrapper) wrapper.style.display = "none";
    if (msgEl) msgEl.innerText = "";

    if (success) {
      mostrarResultadoNoModal("success", "Importação concluída!", msg);
      carregarAnosMesesDisponiveis();
    } else {
      mostrarResultadoNoModal("warning", msg);
    }
    if (btn) btn.remove();
    const c = Swal.getCloseButton();
    if (c) Object.assign(c.style, { pointerEvents: "auto", opacity: "1" });
    if (success) { invalidarCaches(); carregarDados(); }
    return false;
  };

  const processarImportacaoPep = async (file, btn) => {
    const update = (pct, msg) => {
      const msgEl = getEl("apoioProgressMsg");
      if (msgEl) { msgEl.innerText = msg; msgEl.style.textAlign = "center"; msgEl.style.width = "100%"; }
      const wrapper = getEl("apoioProgressBarWrapper");
      if (wrapper && pct >= 10) wrapper.style.display = "block";
      
      const pctInt = Math.round(pct);
      const progBar = getEl("importProgressBar");
      if (progBar) progBar.style.width = `${pctInt}%`;
      const progTxt = getEl("importProgressText");
      if (progTxt) { progTxt.innerText = `${pctInt}%`; progTxt.style.textAlign = "center"; }
    };

    try {
      update(2, "Iniciando importação de PEP Faturado...");
      if (typeof window.XLSX === "undefined") {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      const usuCad = getNomeUsuarioLogado();

      update(10, "Lendo arquivo...");
      const dataBuffer = await file.arrayBuffer();
      const wb = window.XLSX.read(new Uint8Array(dataBuffer), { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      
      if (rows.length < 2) throw new Error("A planilha está vazia.");

      update(20, "Mapeando e formatando dados da planilha...");
      const itensPlanilha = [];

      for (let i = 1; i < rows.length; i++) {
        const c = rows[i];
        if (!c || c.join("").trim() === "") continue;

        const pepBruto = limpaStr(c[1]);
        const pepTratado = pepBruto ? pepBruto.substring(0, 21) : null; 
        const tpcBruto = limpaStr(c[1]); 
        const tpcTratado = tpcBruto ? tpcBruto.slice(-1) : null;

        const numDocTratado = limpaStr(c[15]) ? String(limpaStr(c[15])).trim() : "";
        const linhaLancTratada = parseIntNum(c[14]);

        const itemObj = {
          pi: limpaStr(c[0]),
          pep: pepTratado,
          tpo: limpaStr(c[2]),
          objeto: limpaStr(c[3]),
          data: formatarDataSegura(c[4]),
          classe_invest: limpaStr(c[5]),
          denom_classe: limpaStr(c[6]),
          codigo: limpaStr(c[7]),
          descricao_codigo: limpaStr(c[8]),
          qtd: parseNum(c[9]),
          um: limpaStr(c[10]),
          valor: parseNum(c[11]),
          classe_obj: limpaStr(c[12]),
          desc_sa: limpaStr(c[13]),
          linha_lanc: linhaLancTratada,
          num_doc: numDocTratado,
          num_doc_ref: limpaStr(c[16]),
          usuario: limpaStr(c[17]),
          tpc: tpcTratado,
          usu_cada: String(usuCad)
        };

        if (itemObj.num_doc !== "" && itemObj.linha_lanc !== null && itemObj.linha_lanc !== undefined) {
          itemObj.chave_composta = `${itemObj.num_doc}|${itemObj.linha_lanc}`;
          itensPlanilha.push(itemObj);
        }
      }

      if (!itensPlanilha.length) {
        throw new Error("Nenhum registro válido encontrado. Verifique se as colunas 'num_doc' e 'linha_lanc' estão preenchidas.");
      }

      update(35, "Verificando existência de registros no banco...");
      const docsPlanilha = [...new Set(itensPlanilha.map(i => i.num_doc).filter(Boolean))];
      const chavesExistentesNoBanco = new Set();
      const chunksBusca = chunkArr(docsPlanilha, 150);

      for (let i = 0; i < chunksBusca.length; i++) {
        const { data: registrosBanco, error: errBusca } = await supabase
          .from(tabelaImportacao)
          .select('num_doc, linha_lanc')
          .in('num_doc', chunksBusca[i])
          .not("num_doc", "is", null)
          .not("linha_lanc", "is", null);

        if (errBusca) throw errBusca;

        if (registrosBanco && registrosBanco.length > 0) {
          registrosBanco.forEach(r => {
            const dbDoc = r.num_doc !== null && r.num_doc !== undefined ? String(r.num_doc).trim() : "";
            const dbLinha = r.linha_lanc !== null && r.linha_lanc !== undefined ? String(r.linha_lanc) : "";
            
            if (dbDoc && dbLinha) {
              chavesExistentesNoBanco.add(`${dbDoc}|${dbLinha}`);
            }
          });
        }
      }

      const conflitos = itensPlanilha.filter(item => chavesExistentesNoBanco.has(item.chave_composta));
      
      let acao = 'SUBSTITUIR';
      if (conflitos.length > 0) {
        acao = await askAction(conflitos.length, 'boxPepFat');
      }

      update(55, "Processando dados para gravação...");
      let dadosParaSalvar = [];

      if (acao === 'APENAS_NOVAS') {
        dadosParaSalvar = itensPlanilha.filter(item => !chavesExistentesNoBanco.has(item.chave_composta));
      } else {
        if (conflitos.length > 0) {
          update(60, `Substituindo registros antigos!`);
          
          const chunksConflito = chunkArr(conflitos, 100);
          for (let i = 0; i < chunksConflito.length; i++) {
            const grupoOr = chunksConflito[i].map(c => 
              `and(num_doc.eq."${c.num_doc}",linha_lanc.eq.${c.linha_lanc})`
            ).join(',');

            const { error: errDel } = await supabase
              .from(tabelaImportacao)
              .delete()
              .or(grupoOr);

            if (errDel) throw errDel;
          }
        }
        dadosParaSalvar = itensPlanilha;
      }

      if (!dadosParaSalvar.length) {
        throw new Error("Nenhum registro novo para salvar. Todos os itens informados já estão cadastrados no banco de dados.");
      }

      update(75, `Gravando dados na tabela ${tabelaImportacao}...`);
      let inseridos = 0;

      const payloadFinal = dadosParaSalvar.map(({ chave_composta, ...resto }) => resto);
      const lotesParaInserir = chunkArr(payloadFinal, 1000);

      for (let i = 0; i < lotesParaInserir.length; i++) {
        const lote = lotesParaInserir[i];
        const { error: errInsert } = await supabase.from(tabelaImportacao).insert(lote);
        if (errInsert) throw errInsert;

        inseridos += lote.length;
        const pctInsercao = 75 + Math.floor(((i + 1) / lotesParaInserir.length) * 25);
        update(pctInsercao, `Salvando registros (${inseridos}/${payloadFinal.length})...`);
      }

      update(100, "Importação de PEP Faturado concluída com sucesso!");
      return endProc(btn, `${inseridos.toLocaleString("pt-BR")} registro(s) importado(s) com sucesso.`);
    } catch (err) {
      console.error("Erro na importação de PEP Faturado:", err);
      throw err;
    }
  };

  const excluirBancoCompleto = async () => {
    const res = await Swal.fire({
      ...swalDefault,
      showCancelButton: true,
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      html: `
        <div class="modal-header-pro">
          <div class="modal-header-left">
            <div class="modal-icon-box" style="background-color:#dc2626;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </div>
            <div>
              <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Atenção - Exclusão Geral</h2>
              <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Confirmação de segurança</p>
            </div>
          </div>
        </div>
        <div class="modal-body-pro">
          <p style="margin:0;color:#475569;font-size:0.9rem;">Tem certeza absoluta que deseja excluir <b>todo o banco de dados</b> desta tabela? Esta ação não poderá ser desfeita.</p>
        </div>
      `
    });

    if (res.isConfirmed) {
      const respDel = await supabase.from(tabelaImportacao).delete().not("id", "is", null);
      if (respDel.error) {
        Swal.fire("Erro", "Erro ao limpar o banco: " + respDel.error.message, "error");
      } else {
        Swal.fire("Sucesso", "Banco completo limpo com sucesso.", "success");
        setLinhasSelecionadasIds([]);
        setRegistroSelecionadoId(null);
        setRegistroSelecionadoObj(null);
        invalidarCaches();
        carregarAnosMesesDisponiveis();
        carregarDados();
      }
    }
  };

  const temFiltroAtivo = busca.trim().length > 0 || Object.values(filtrosColunas).some(r => Array.isArray(r) && r.length > 0) || anosMesesSelecionados.length < anosMesesDisponiveis.length;
  const limparTodosFiltros = () => { setBusca(""); setFiltrosColunas({}); setAnosMesesSelecionados(anosMesesDisponiveis); setBuscaDropdown(""); setPaginaAtual(1); setLimparFiltrosTrigger(p => p + 1); };

  const btnBase = { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "32px", padding: "0 12px", minWidth: "100px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", boxSizing: "border-box", fontWeight: "600", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" };
  const btnIco = { display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", boxSizing: "border-box", fontWeight: "600" };

  const formatarAnoMesLabel = (anoMes) => {
    if (!anoMes) return "";
    const [ano, mes] = anoMes.split("-");
    const mesesNomes = {
      "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
      "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
      "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
    };
    return `${mesesNomes[mes] || mes}/${ano}`;
  };

  const anosMesesFiltrados = anosMesesDisponiveis.filter(anoMes => {
    const label = formatarAnoMesLabel(anoMes).toLowerCase();
    return label.includes(buscaDropdown.toLowerCase()) || anoMes.includes(buscaDropdown);
  });

  return (
    <div style={{ position: "absolute", inset: "0", width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", padding: "24px", boxSizing: "border-box", overflow: "hidden", zIndex: 10 }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", background: "#ffffff", padding: "8px 14px", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ backgroundColor: corTheme, color: "#fff", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,85,150,0.2)" }}><Database size={16} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h2 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a", fontWeight: "700", lineHeight: "1.2" }}>{titulo}</h2>
                <HelpCircle 
                  size={16} 
                  style={{ color: corTheme, cursor: "pointer" }} 
                  onClick={abrirModalInformacao}
                  title="Clique para ver o passo a passo de onde conseguir os dados"
                />
              </div>
              <p style={{ margin: "1px 0 0", fontSize: "0.72rem", color: "#64748b" }}>Gerenciamento da tabela: <b>{tabelaBd}</b></p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 14px", borderRadius: "6px", height: "34px", boxSizing: "border-box" }}>
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Total Faturamento:</span>
          <span style={{ fontSize: "0.9rem", color: corTheme, fontWeight: "700" }}>
            {calculandoSoma ? (
              <span style={{ color: "#94a3b8", fontWeight: "500", fontSize: "0.85rem" }}>
                Calculando<span className="loading-dots"></span>
              </span>
            ) : (
              somaTotalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            )}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px", flex: "1", minWidth: "320px", alignItems: "center" }}>
          
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <div
              onClick={() => setDropdownAnoMesAberto(!dropdownAnoMesAberto)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 12px 0 32px",
                height: "32px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#334155",
                fontWeight: "500",
                fontSize: "0.85rem",
                cursor: "pointer",
                boxSizing: "border-box",
                userSelect: "none",
                minWidth: "160px"
              }}
            >
              <Calendar size={15} style={{ position: "absolute", left: "10px", color: "#94a3b8", pointerEvents: "none" }} />
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {anosMesesSelecionados.length === 0
                  ? "Nenhum selecionado"
                  : anosMesesSelecionados.length === anosMesesDisponiveis.length
                  ? "Todos os períodos"
                  : `${anosMesesSelecionados.length} selecionado(s)`}
              </span>
              <ChevronDown size={14} style={{ color: "#64748b" }} />
            </div>

            {dropdownAnoMesAberto && (
              <div style={{
                position: "absolute",
                top: "36px",
                left: "0",
                width: "230px",
                background: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                zIndex: 1000,
                padding: "8px",
                boxSizing: "border-box"
              }}>
                <div style={{ position: "relative", marginBottom: "8px" }}>
                  <Search size={13} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Filtrar mês/ano..."
                    value={buscaDropdown}
                    onChange={e => setBuscaDropdown(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: "100%",
                      padding: "4px 8px 4px 26px",
                      borderRadius: "4px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8rem",
                      outline: "none",
                      boxSizing: "border-box",
                      background: "#f8fafc"
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", marginBottom: "6px", borderBottom: "1px solid #f1f5f9", fontSize: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setAnosMesesSelecionados(anosMesesDisponiveis)}
                    style={{ background: "none", border: "none", color: corTheme, cursor: "pointer", fontWeight: "600", padding: 0 }}
                  >
                    Selecionar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnosMesesSelecionados([])}
                    style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: "600", padding: 0 }}
                  >
                    Limpar
                  </button>
                </div>

                <div style={{ maxHeight: "160px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {anosMesesFiltrados.length === 0 ? (
                    <div style={{ padding: "8px", textAlign: "center", fontSize: "0.78rem", color: "#94a3b8" }}>Nenhum encontrado</div>
                  ) : (
                    anosMesesFiltrados.map(anoMes => {
                      const selecionado = anosMesesSelecionados.includes(anoMes);
                      return (
                        <div
                          key={anoMes}
                          onClick={() => {
                            setPaginaAtual(1);
                            if (selecionado) {
                              setAnosMesesSelecionados(anosMesesSelecionados.filter(item => item !== anoMes));
                            } else {
                              setAnosMesesSelecionados([...anosMesesSelecionados, anoMes]);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            background: selecionado ? "#f0f9ff" : "transparent",
                            fontSize: "0.8rem",
                            color: "#334155"
                          }}
                        >
                          <div style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "3px",
                            border: `1px solid ${selecionado ? corTheme : "#cbd5e1"}`,
                            background: selecionado ? corTheme : "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            {selecionado && <Check size={10} color="#fff" />}
                          </div>
                          <span>{formatarAnoMesLabel(anoMes)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: "relative", flex: "1" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Pesquisar geral..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPaginaAtual(1); }}
              onPaste={e => { e.preventDefault(); setBusca(e.clipboardData.getData("text").trim()); setPaginaAtual(1); }}
              style={{ width: "100%", padding: "0 12px 0 38px", height: "32px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem", background: "#fff", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {temFiltroAtivo && (
            <button onClick={limparTodosFiltros} style={{ ...btnIco, background: "#fff", border: "1px solid #cbd5e1", color: "#dc2626" }} title="Limpar filtros"><FilterX size={16} /></button>
          )}
          <button onClick={async () => { invalidarCaches(); await Promise.all([carregarAnosMesesDisponiveis(), carregarDados()]); }} style={{ ...btnBase, background: "#fff", border: "1px solid #cbd5e1", color: "#334155" }} title="Atualizar">
            <RefreshCw size={14} className={loading ? "lucide-spin" : ""} /> Atualizar
          </button>
          <button onClick={exportarDadosTabela} style={{ ...btnBase, background: "#fff", border: "1px solid #cbd5e1", color: "#334155" }}><Download size={14} /> Exportar</button>
          <button onClick={importarDadosTabela} style={{ ...btnBase, background: "#fff", border: "1px solid #cbd5e1", color: "#475569" }}><Upload size={14} /> Importar</button>

          {isGerenteOuDev && (
            <button onClick={excluirBancoCompleto} style={{ ...btnBase, background: "#fff", border: "1px solid #cbd5e1", color: "#dc2626", cursor: "pointer" }} title="Excluir banco completo">
              <Trash2 size={14} /> Excluir Banco
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <DataTable
            key={limparFiltrosTrigger}
            data={registros}
            totalBanco={totalBanco}
            paginaAtual={paginaAtual}
            registrosPorPagina={registrosPorPagina}
            onPageChange={setPaginaAtual}
            onLimitChange={l => { setRegistrosPorPagina(l); setPaginaAtual(1); }}
            onFilterChange={f => { setFiltrosColunas({ ...(f || {}) }); setPaginaAtual(1); }}
            onFetchColumnOptions={buscarOpcoesColunaBanco}
            columnOptionsContextKey={JSON.stringify(anosMesesSelecionados)}
            filtrosExternos={filtrosColunas}
            tableId={`tabelas_dados_${tabelaBd}_${userIdKey}`}
            onSelectionChange={handleSelectionChange}
            loading={loading}
            loadingTexto="Carregando dados"
          />
        </div>
      </div>

      {modalInformacaoAberto && (
        <div style={{ position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", width: "600px", maxWidth: "90%", borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ background: "#f8fafc", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a", fontWeight: "700" }}>Como conseguir os dados para importação</h3>
              <button onClick={() => setModalInformacaoAberto(false)} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>
            <div style={{ padding: "20px", maxHeight: "60vh", overflowY: "auto" }}>
              {!editandoInformacao ? (
                <div>
                  <div style={{ whiteSpace: "pre-wrap", color: "#334155", fontSize: "0.9rem", lineHeight: "1.5" }}>
                    {textoInformacao}
                  </div>
                  {isDesenvolvedor && (
                    <div style={{ marginTop: "20px", textAlign: "right" }}>
                      <button 
                        onClick={() => setEditandoInformacao(true)}
                        style={{ background: corTheme, color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                      >
                        Editar Instruções
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>Instruções (Texto ou HTML):</label>
                  <textarea 
                    value={textoInformacao} 
                    onChange={e => setTextoInformacao(e.target.value)}
                    rows={8}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }}
                  />
                  <div style={{ marginTop: "15px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button 
                      onClick={() => setEditandoInformacao(false)}
                      style={{ background: "#e2e8f0", color: "#334155", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={salvandoInformacao ? null : salvarInformacaoPassoAPasso}
                      style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                    >
                      {salvandoInformacao ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}