import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../services/supabase";
import DataTable from "../../../models/DataTable";
import Swal from "sweetalert2";
import { Database, Search, Download, Upload, Trash2, RefreshCw, FilterX, HelpCircle, Copy, Stamp, X, FileText, ChevronDown, MapPin } from "lucide-react";
import { abrirModalCarimbo } from "../../../models/carimboacoes";
import { abrirModalServicosConsolidados } from "./baseservicos";
import { atualizarMapaCarteira, destruirMapa } from "./basemapa";

const corTheme = "#005596";
const tabelaBd = "view_dados_pep_cache";
const tabelaViewOrigem = "view_dados_pep";
const tabelaImportacao = "tabe_imp_pep";
const tabelaImportacaoEspecial = "tabe_imp_pep_especial";
const titulo = "Obras de Investimento";
const colunasOcultasDesejadas = ["created_at", "usu_cada", "id"];

export default function Pep() {
  const [registros, setRegistros] = useState([]);
  const [totalBanco, setTotalBanco] = useState(0);
  const [estrutura, setEstrutura] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [calculandoSoma, setCalculandoSoma] = useState(true);
  const [busca, setBusca] = useState("");
  const [colunaBuscaSelecionada, setColunaBuscaSelecionada] = useState(""); 
  const [filtrosColunas, setFiltrosColunas] = useState({});
  const [ordenacao, setOrdenacao] = useState({ coluna: null, asc: true });
  const [registroSelecionadoId, setRegistroSelecionadoId] = useState(null);
  const [registroSelecionadoObj, setRegistroSelecionadoObj] = useState(null);
  const [linhasSelecionadasIds, setLinhasSelecionadasIds] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(100);
  const [limparFiltrosTrigger, setLimparFiltrosTrigger] = useState(0);
  const [buscaConsulta, setBuscaConsulta] = useState("");
  const [colunaBuscaConsulta, setColunaBuscaConsulta] = useState("");
  const [filtrosConsulta, setFiltrosConsulta] = useState({});
  
  // Estado para controlar a abertura da janela do mapa
  const [modalMapaAberto, setModalMapaAberto] = useState(false);
  
  const [somaTotalGeral, setSomaTotalGeral] = useState(0);
  const [somaTotalProduzido, setSomaTotalProduzido] = useState(0);
  const [somaTotalMedido, setSomaTotalMedido] = useState(0);
  const [somaTotalFaturado, setSomaTotalFaturado] = useState(0);
  const [somaTotalReceber, setSomaTotalReceber] = useState(0);

  const [modalInformacaoAberto, setModalInformacaoAberto] = useState(false);
  const [textoInformacao, setTextoInformacao] = useState("");
  const [editandoInformacao, setEditandoInformacao] = useState(false);
  const [salvandoInformacao, setSalvandoInformacao] = useState(false);
  const [solicitandoAtualizacao, setSolicitandoAtualizacao] = useState(false);
  const [ultimaAtualizacaoCache, setUltimaAtualizacaoCache] = useState("");

  const isInitialMount = useRef(true);
  const estruturaCacheRef = useRef(new Map());
  const estruturaPromiseRef = useRef(null);
  const opcoesCacheRef = useRef(new Map());
  const opcoesInFlightRef = useRef(new Map());
  const paginaCacheRef = useRef(new Map());
  const somaCacheRef = useRef(new Map());
  const somaRequestIdRef = useRef(0);
  const requestIdRef = useRef(0);
  const filtrosColunasRef = useRef({});
  filtrosColunasRef.current = filtrosColunas;
  const filtrosDebounceRef = useRef(null);

  const sessaoUsuario = JSON.parse(localStorage.getItem("usuario_logado")) || {};
  const userIdKey = sessaoUsuario.id || sessaoUsuario.email || "geral";
  
  const perfilUsuario = String(sessaoUsuario.Perfil || sessaoUsuario.perfil || sessaoUsuario.perfil_nome || "").trim().toLowerCase();
  const isDesenvolvedor = perfilUsuario === "desenvolvedor";
  const isGerenteOuDev = perfilUsuario === "desenvolvedor" || perfilUsuario === "gerente";

  const getEl = (id) => document.getElementById(id);

  const buscarUltimaAtualizacao = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("obter_status_pep_cache");
      if (!error && data) {
        const dataFim = data.fim_em || data.atualizado_em;
        if (dataFim) {
          const dataObj = new Date(dataFim);
          if (!isNaN(dataObj.getTime())) {
            const dataFormatada = dataObj.toLocaleDateString("pt-BR");
            const horaFormatada = dataObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            setUltimaAtualizacaoCache(`Última atualização: ${dataFormatada} às ${horaFormatada}`);
            return;
          }
        }
      }
      setUltimaAtualizacaoCache("Última atualização: N/D");
    } catch (e) {
      setUltimaAtualizacaoCache("Última atualização: N/D");
    }
  }, []);

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

  const solicitarAtualizacaoCache = useCallback(async (origem = "manual", mostrarMensagem = true, aguardarProcessamento = true) => {
    if (solicitandoAtualizacao && aguardarProcessamento) return false;
    setSolicitandoAtualizacao(true);
    try {
      const { error } = await supabase.rpc("solicitar_atualizacao_pep_cache", { p_origem: origem });
      if (error) throw error;

      if (aguardarProcessamento) {
        let concluido = false;
        let tentativas = 0;
        while (!concluido && tentativas < 30) {
          await new Promise(r => setTimeout(r, 2000));
          try {
            const { data } = await supabase.rpc("obter_status_pep_cache");
            if (data && String(data.status || "").toLowerCase() === "concluido") {
              concluido = true;
            }
          } catch (e) {}
          tentativas++;
        }
      }

      invalidarCaches();
      if (mostrarMensagem) {
        Swal.fire({
          icon: "info",
          title: "Atualização solicitada",
          text: "A atualização da base foi colocada em fila e executada.",
          timer: 2800,
          showConfirmButton: false
        });
      }
      setTimeout(buscarUltimaAtualizacao, 3000);
      return true;
    } catch (err) {
      if (mostrarMensagem) Swal.fire("Erro", "Não foi possível solicitar a atualização: " + err.message, "error");
      else console.error("Erro ao solicitar atualização do cache PEP:", err);
      return false;
    } finally {
      setSolicitandoAtualizacao(false);
    }
  }, [solicitandoAtualizacao, buscarUltimaAtualizacao]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      solicitarAtualizacaoCache("automatico", false, true);
    }, 3 * 60 * 1000);

    return () => clearInterval(intervalo);
  }, [solicitarAtualizacaoCache]);

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
    buscarUltimaAtualizacao();
  }, [buscarUltimaAtualizacao]);

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

    ["#apoioStateSelect", "#apoioStateConfirm", "#apoioStateProgress", "#exportStateSelect", "#exportStateProgress", "#carimboStateSelect", "#carimboStateProgress", "#excluirStateSelect", "#excluirStateProgress"].forEach(sel => {
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

  const obterColunasTexto = (estData) => {
    const cols = estData
      .filter(c => !c.oculta && !colunasOcultasDesejadas.includes(String(c.nome_coluna || "").toLowerCase()))
      .filter(c => String(c.tipo || c.data_type || "").toLowerCase().match(/char|text|string/))
      .map(c => c.nome_coluna)
      .filter(Boolean);
    return [...new Set(cols)];
  };

  const colunaEhDataBanco = col => {
    const definicao = estrutura.find(c => String(c.nome_coluna) === String(col));
    const tipo = String(definicao?.tipo || definicao?.data_type || "").toLowerCase();
    return /date|timestamp/.test(tipo);
  };

  const dataFiltroValida = valor => {
    const v = String(valor ?? "").trim();
    if (!v || v === "-" || v === "##NULL##") return false;
    return /^\d{4}-\d{2}-\d{2}(?:t|\s|$)/i.test(v);
  };

  const aplicarFiltrosAuxiliaresCom = (query, filtros = filtrosColunas) => {
    Object.keys(filtros || {}).forEach(col => {
      const regras = filtros[col];

      if (!Array.isArray(regras) || regras.length === 0) return;

      const exatos = regras.filter(
        f => !String(f).startsWith(">=|") && !String(f).startsWith("<=|")
      );

      const maiorQue = regras
        .find(f => String(f).startsWith(">=|"))
        ?.split(">=|")[1];

      const menorQue = regras
        .find(f => String(f).startsWith("<=|"))
        ?.split("<=|")[1];

      const ehDataBanco = colunaEhDataBanco(col);

      const definicaoColuna = estrutura.find(c => String(c.nome_coluna) === String(col));
      const tipoColuna = String(definicaoColuna?.tipo || definicaoColuna?.data_type || "").toLowerCase();
      const ehNumericoBanco = /int|float|double|numeric|decimal|real/.test(tipoColuna);

      const temCondicional = (maiorQue !== undefined && String(maiorQue).trim() !== "" && String(maiorQue).trim() !== "-") ||
                             (menorQue !== undefined && String(menorQue).trim() !== "" && String(menorQue).trim() !== "-");

      if (maiorQue !== undefined && String(maiorQue).trim() !== "" && String(maiorQue).trim() !== "-") {
        const valorStr = String(maiorQue).replace(/%/g, "").trim().replace(/\./g, "").replace(",", ".");
        if (ehDataBanco) {
          if (dataFiltroValida(valorStr) && /^\d{4}-\d{2}-\d{2}$/.test(valorStr)) {
            query = query.gte(col, `${valorStr}T00:00:00`);
          }
        } else if (ehNumericoBanco) {
          const numeroMaior = Number(valorStr);
          if (Number.isFinite(numeroMaior)) query = query.gte(col, numeroMaior);
        } else {
          query = query.gte(col, valorStr);
        }
      }

      if (menorQue !== undefined && String(menorQue).trim() !== "" && String(menorQue).trim() !== "-") {
        const valorStr = String(menorQue).replace(/%/g, "").trim().replace(/\./g, "").replace(",", ".");
        if (ehDataBanco) {
          if (dataFiltroValida(valorStr) && /^\d{4}-\d{2}-\d{2}$/.test(valorStr)) {
            query = query.lte(col, `${valorStr}T23:59:59`);
          }
        } else if (ehNumericoBanco) {
          const numeroMenor = Number(valorStr);
          if (Number.isFinite(numeroMenor)) query = query.lte(col, numeroMenor);
        } else {
          query = query.lte(col, valorStr);
        }
      }

      if (!temCondicional && exatos.length > 0) {
        const temNull = exatos.includes("##NULL##");
        const valoresNormais = exatos
          .filter(v => v !== "##NULL##")
          .map(v => {
            let limpo = String(v).trim().replace(/%/g, "");
            if (ehNumericoBanco) {
              limpo = limpo.replace(/\./g, "").replace(",", ".");
            }
            return limpo;
          })
          .filter(Boolean);

        if (ehDataBanco) {
          const datasValidas = valoresNormais.filter(dataFiltroValida);

          if (temNull && datasValidas.length > 0) {
            const condicoes = [`${col}.is.null`, ...datasValidas.map(v => `${col}.eq.${v}`)];
            query = query.or(condicoes.join(","));
          } else if (temNull) {
            query = query.is(col, null);
          } else if (datasValidas.length > 0) {
            query = query.in(col, datasValidas);
          } else {
            query = query.gt(col, "9999-12-31");
          }
        } else if (ehNumericoBanco || col === "avanco") {
          const listaNumeros = valoresNormais.map(v => Number(v)).filter(n => !isNaN(n));
          if (listaNumeros.length > 0) {
            if (listaNumeros.length > 50) {
              if (temNull) query = query.or(`${col}.is.null`);
            } else if (col === "avanco") {
              const condicoesOr = [];
              if (temNull) condicoesOr.push(`${col}.is.null`);
              listaNumeros.forEach(num => {
                condicoesOr.push(`and(${col}.gte.${num - 0.001},${col}.lte.${num + 0.001})`);
              });
              query = query.or(condicoesOr.join(","));
            } else {
              if (temNull) {
                const condicoesOr = [`${col}.is.null`, ...listaNumeros.map(n => `${col}.eq.${n}`)];
                query = query.or(condicoesOr.join(","));
              } else {
                query = query.in(col, listaNumeros);
              }
            }
          } else if (temNull) {
            query = query.is(col, null);
          }
        } else {
          const listaValores = valoresNormais.map(v => String(v).trim());
          if (temNull) {
            const condicoesOr = [
              `${col}.is.null`,
              `${col}.eq.-`,
              `${col}.eq.""`,
              ...listaValores.map(v => {
                const limpo = String(v).replace(/"/g, '\\"');
                return !isNaN(limpo) && limpo !== "" ? `${col}.eq.${limpo}` : `${col}.eq."${limpo}"`;
              })
            ];
            query = query.or(condicoesOr.join(","));
          } else if (listaValores.length > 0) {
            query = query.in(col, listaValores);
          }
        }
      }
    });

    return query;
  };

  const aplicarBuscaCom = (query, termo, colunasTexto, colunaAlvoFiltro) => {
    const termos = String(termo || "")
      .split(/[\r\n,;]+/)
      .map(t => t.trim())
      .filter(t => t.length >= 2);

    if (termos.length === 0 || !colunaAlvoFiltro) return query;

    let colunasAlvo = colunasTexto;
    if (colunaAlvoFiltro === "pep") {
      colunasAlvo = colunasTexto.includes("pep") ? ["pep"] : [colunasTexto[0]];
    } else if (colunaAlvoFiltro === "nota") {
      colunasAlvo = colunasTexto.includes("nota") ? ["nota"] : [colunasTexto[0]];
    }

    if (termos.length > 5) {
      const colAlvo = colunasAlvo[0];
      return query.in(colAlvo, termos);
    }

    if (termos.length === 1) {
      const termoLimpo = termos[0].replace(/[()]/g, "");
      query = query.or(colunasAlvo.map(col => `${col}.ilike.%${termoLimpo}%`).join(","));
    } else {
      const condicoes = [];
      termos.forEach(termoUnico => {
        const termoLimpo = termoUnico.replace(/[()]/g, "");
        colunasAlvo.forEach(col => {
          condicoes.push(`${col}.ilike.%${termoLimpo}%`);
        });
      });
      if (condicoes.length > 0) {
        query = query.or(condicoes.join(","));
      }
    }
    return query;
  };

  const carregarSomaTotal = useCallback(async (estAtual = estrutura) => {
    const somaKey = JSON.stringify([tabelaBd, filtrosConsulta || {}, buscaConsulta.trim(), colunaBuscaConsulta]);
    const somaCacheada = somaCacheRef.current.get(somaKey);

    if (somaCacheada !== undefined) {
      setSomaTotalGeral(somaCacheada.totalPrev);
      setSomaTotalProduzido(somaCacheada.totalProd);
      setSomaTotalMedido(somaCacheada.totalMedi);
      setSomaTotalFaturado(somaCacheada.totalFatu);
      setSomaTotalReceber(somaCacheada.totalRece);
      setCalculandoSoma(false);
      return somaCacheada;
    }

    const somaReqId = ++somaRequestIdRef.current;
    setCalculandoSoma(true);
    try {
      let baseQuery = supabase.from(tabelaBd).select("total_prev, total_prod, total_medi, total_fatu, total_rece");
      baseQuery = aplicarFiltrosAuxiliaresCom(baseQuery, filtrosConsulta);
      const termo = buscaConsulta.trim();
      let estData = estAtual;
      if (!estData.length) {
        estData = await obterEstruturaTabela(tabelaBd);
      }
      if (estData.length && colunaBuscaConsulta) {
        const colunasBusca = obterColunasTexto(estData);
        baseQuery = aplicarBuscaCom(baseQuery, termo, colunasBusca, colunaBuscaConsulta);
      }

      let somaPrev = 0;
      let somaProd = 0;
      let somaMedi = 0;
      let somaFatu = 0;
      let somaRece = 0;
      let from = 0;
      const step = 1000;
      let continuar = true;

      while (continuar) {
        if (somaReqId !== somaRequestIdRef.current) return null;
        
        let queryPagina = baseQuery.order("id", { ascending: true }).range(from, from + step - 1);
        const { data, error } = await queryPagina;
        
        if (error) throw error;
        if (!data || data.length === 0) break;

        data.forEach(row => {
          somaPrev += Number(row.total_prev) || 0;
          somaProd += Number(row.total_prod) || 0;
          somaMedi += Number(row.total_medi) || 0;
          somaFatu += Number(row.total_fatu) || 0;
          somaRece += Number(row.total_rece) || 0;
        });

        if (data.length < step) {
          continuar = false;
        } else {
          from += step;
        }
      }

      if (somaReqId !== somaRequestIdRef.current) return null;
      const resultadoSomas = { totalPrev: somaPrev, totalProd: somaProd, totalMedi: somaMedi, totalFatu: somaFatu, totalRece: somaRece };
      
      somaCacheRef.current.set(somaKey, resultadoSomas);
      if (somaCacheRef.current.size > 20) {
        const primeiraChave = somaCacheRef.current.keys().next().value;
        if (primeiraChave !== undefined) somaCacheRef.current.delete(primeiraChave);
      }
      
      setSomaTotalGeral(somaPrev);
      setSomaTotalProduzido(somaProd);
      setSomaTotalMedido(somaMedi);
      setSomaTotalFaturado(somaFatu);
      setSomaTotalReceber(somaRece);
      setCalculandoSoma(false);
      return resultadoSomas;
    } catch (err) {
      if (somaReqId !== somaRequestIdRef.current) return null;
      console.error("Erro ao calcular soma total:", err);
      setSomaTotalGeral(0);
      setSomaTotalProduzido(0);
      setSomaTotalMedido(0);
      setSomaTotalFaturado(0);
      setSomaTotalReceber(0);
      setCalculandoSoma(false);
      return { totalPrev: 0, totalProd: 0, totalMedi: 0, totalFatu: 0, totalRece: 0 };
    }
  }, [filtrosConsulta, buscaConsulta, colunaBuscaConsulta, estrutura]);

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
      const paginaKey = JSON.stringify([tabelaBd, termo, colunaBuscaConsulta, filtrosAplicados, ordenacao, paginaAtual, registrosPorPagina]);

      let pagina = paginaCacheRef.current.get(paginaKey);
      if (!pagina) {
        let query = supabase.from(tabelaBd).select("*", { count: "exact" });
        query = aplicarFiltrosAuxiliaresCom(query, filtrosAplicados);
        if (colunaBuscaConsulta) {
          query = aplicarBuscaCom(query, termo, colunasBusca, colunaBuscaConsulta);
        }

        if (ordenacao.coluna) {
          query = query.order(ordenacao.coluna, { ascending: ordenacao.asc, nullsFirst: false });
        } else {
          const temId = (estData || []).some(c => String(c.nome_coluna || "").toLowerCase() === "id");
          if (temId) {
            query = query.order("id", { ascending: false });
          } else {
            query = query.order("pep", { ascending: true });
          }
        }

        const res = await query.range(from, from + registrosPorPagina - 1);
        if (res.error) throw res.error;

        const dadosLimpos = (res.data || []).map(row => {
          const newRow = { ...row };
          colunasOcultasDesejadas.forEach(col => {
            Object.keys(newRow).forEach(k => { if (k.toLowerCase() === col) delete newRow[k]; });
          });

          newRow.total_prev = newRow.total_prev !== null && newRow.total_prev !== undefined ? Number(newRow.total_prev) : 0;
          newRow.total_prod = newRow.total_prod !== null && newRow.total_prod !== undefined ? Number(newRow.total_prod) : 0;
          newRow.total_medi = newRow.total_medi !== null && newRow.total_medi !== undefined ? Number(newRow.total_medi) : 0;
          newRow.total_fatu = newRow.total_fatu !== null && newRow.total_fatu !== undefined ? Number(newRow.total_fatu) : 0;
          newRow.total_rece = newRow.total_rece !== null && newRow.total_rece !== undefined ? Number(newRow.total_rece) : 0;

          if (newRow.avanco !== null && newRow.avanco !== undefined && newRow.avanco !== "") {
           const numAvanco = Number(String(newRow.avanco).replace(",", "."));
           if (!isNaN(numAvanco)) {
             newRow.avanco = numAvanco;
           }
          }

          return newRow;
        });

        pagina = { data: dadosLimpos, count: res.count || 0 };
        paginaCacheRef.current.set(paginaKey, pagina);
      }
      if (reqId !== requestIdRef.current) return;

      setTotalBanco(pagina.count);
      setRegistros(pagina.data);

      if (reqId !== requestIdRef.current) return;
      await carregarSomaTotal(estData);

      if (reqId !== requestIdRef.current) return;
      setLoading(false);
      buscarUltimaAtualizacao();
    } catch (err) {
      if (reqId === requestIdRef.current) {
        setLoading(false);
        setCalculandoSoma(false);
        Swal.fire("Erro", "Erro ao carregar dados: " + err.message, "error");
      }
    }
  }, [tabelaBd, paginaAtual, registrosPorPagina, buscaConsulta, colunaBuscaConsulta, filtrosConsulta, ordenacao, estrutura, carregarSomaTotal, buscarUltimaAtualizacao]);

  // Função para buscar o banco inteiro em blocos ao selecionar "Banco de Dados"
  const carregarBancoCompletoParaMapa = async () => {
    let todosOsDados = [];
    let inicio = 0;
    let tamanhoBloco = 1000;
    let continuar = true;

    Swal.fire({
      title: 'Carregando Banco Completo...',
      text: 'Buscando todos os registros do banco de dados para o mapa.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      while (continuar) {
        const { data, error } = await supabase
          .from(tabelaBd)
          .select("*")
          .order("id", { ascending: true })
          .range(inicio, inicio + tamanhoBloco - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          todosOsDados.push(...data);
          if (data.length < tamanhoBloco) {
            continuar = false;
          } else {
            inicio += tamanhoBloco;
          }
        } else {
          continuar = false;
        }
      }

      Swal.close();
      window.listaCarteiraGlobalMapa = todosOsDados;
      
      setModalMapaAberto(true);
      setTimeout(() => {
        atualizarMapaCarteira(todosOsDados, registroSelecionadoObj, false);
      }, 250);

    } catch (err) {
      Swal.close();
      Swal.fire("Erro", "Não foi possível carregar os dados para o mapa: " + err.message, "error");
    }
  };

  // Botão Localização Obra: Pergunta se deseja os registros da página atual ou do banco de dados
  const lidarComCliqueLocalizacaoObra = () => {
    Swal.fire({
      title: "Localização Obra",
      text: "Deseja exibir somente os registros da página atual ou do banco de dados completo?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Banco de Dados",
      confirmButtonColor: corTheme,
      cancelButtonText: "Página Atual",
      cancelButtonColor: "#10b981",
      reverseButtons: true,
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        carregarBancoCompletoParaMapa();
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        window.listaCarteiraGlobalMapa = registros;
        setModalMapaAberto(true);
        setTimeout(() => {
          atualizarMapaCarteira(registros, registroSelecionadoObj, false);
        }, 250);
      }
    });
  };

  useEffect(() => {
    let isMounted = true;
    const inicializarApp = async () => {
      setCarregandoInicial(true);
      setLoading(true);
      setCalculandoSoma(true);
      try {
        const estData = await obterEstruturaTabela(tabelaBd);
        if (!isMounted) return;

        setEstrutura(estData || []);
        setCarregandoInicial(false);
      } catch (e) {
        console.error("Erro na inicialização:", e);
        if (isMounted) setCarregandoInicial(false);
      }
    };
    inicializarApp();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    clearTimeout(filtrosDebounceRef.current);
    filtrosDebounceRef.current = setTimeout(() => { setFiltrosConsulta(filtrosColunas || {}); }, 180);
    return () => clearTimeout(filtrosDebounceRef.current);
  }, [filtrosColunas]);

  useEffect(() => {
    if (carregandoInicial) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    carregarDados();
    return () => { requestIdRef.current += 1; };
  }, [carregandoInicial, carregarDados, buscaConsulta, colunaBuscaConsulta, filtrosConsulta, ordenacao]);

  const invalidarCaches = useCallback(() => {
    opcoesCacheRef.current.clear();
    paginaCacheRef.current.clear();
    somaCacheRef.current.clear();
    opcoesInFlightRef.current.clear();
    somaRequestIdRef.current += 1;
  }, []);

  const buscarOpcoesColunaBanco = useCallback(async (coluna, filtrosAtuais = filtrosColunasRef.current, termo = "") => {
    if (!coluna) return [];
    const filtrosOutrasColunas = { ...(filtrosAtuais || {}) };
    delete filtrosOutrasColunas[coluna];
    const termoLimpo = String(termo || "").trim();
    const definicao = estrutura.find(c => c.nome_coluna === coluna);
    const tipo = String(definicao?.tipo || definicao?.data_type || "").toLowerCase();
    const ehTexto = /char|text|string|varchar|citext/.test(tipo);
    const ehData = /date|timestamp/.test(tipo) || coluna.includes("ult_") || coluna.includes("data");
    
    const termoSeguro = termoLimpo.replace(/[,;()]/g, " ").replace(/[\\%_]/g, "\\$&").trim();
    const chave = JSON.stringify([tabelaBd, coluna, filtrosOutrasColunas, termoSeguro]);

    const cache = opcoesCacheRef.current.get(chave);
    if (cache) return cache;

    const emAndamento = opcoesInFlightRef.current.get(chave);
    if (emAndamento) return emAndamento;

    const promessa = (async () => {
      try {
        const itensMapeados = new Map();
        let inicio = 0;
        let continuar = true;
        let totalLido = 0;
        const LIMITE_MAXIMO_SEGURANCA = 50000;

        while (continuar && totalLido < LIMITE_MAXIMO_SEGURANCA) {
          let query = supabase.from(tabelaBd).select(coluna);
          query = aplicarFiltrosAuxiliaresCom(query, filtrosOutrasColunas);
          if (ehTexto && termoSeguro) query = query.ilike(coluna, `%${termoSeguro}%`);
          
          const { data, error } = await query.range(inicio, inicio + 999);
          if (error) throw error;
          
          const registrosLidos = data || [];
          totalLido += registrosLidos.length;

          registrosLidos.forEach(row => {
            let valorBruto = row[coluna];

            if (coluna === "avanco" && valorBruto !== null && valorBruto !== undefined && valorBruto !== "") {
              const numAvanco = Number(String(valorBruto).replace(",", "."));
              if (!isNaN(numAvanco)) {
                valorBruto = numAvanco;
              }
            }

            const isNuloOuVazio = valorBruto === null || valorBruto === undefined || (typeof valorBruto === "string" && (valorBruto.trim() === "" || valorBruto.trim() === "-"));
            let chaveUnica = isNuloOuVazio ? "##NULL##" : String(valorBruto);
            let exibicao = chaveUnica === "##NULL##" ? "-" : (coluna === "avanco" ? `${Number(chaveUnica).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%` : chaveUnica);

            if (ehData && chaveUnica !== "##NULL##") {
              const strData = String(valorBruto).substring(0, 10);
              if (/^\d{4}-\d{2}-\d{2}$/.test(strData)) {
                const [ano, mes, dia] = strData.split("-");
                chaveUnica = `${ano}-${mes}-${dia}`;
                exibicao = `${dia}/${mes}/${ano}`;
              }
            }

            if (!itensMapeados.has(chaveUnica)) {
              itensMapeados.set(chaveUnica, { chave: chaveUnica, exibicao: exibicao });
            }
          });

          continuar = registrosLidos.length === 1000;
          inicio += 1000;
        }

        const listaOpcoes = Array.from(itensMapeados.values());
        const resultado = listaOpcoes.sort((a, b) => {
          if (a.chave === "##NULL##") return 1;
          if (b.chave === "##NULL##") return -1;
          return a.chave.localeCompare(b.chave, "pt-BR", { numeric: true, sensitivity: "base" });
        });

        opcoesCacheRef.current.set(chave, resultado);
        if (opcoesCacheRef.current.size > 50) {
          const primeiraChave = opcoesCacheRef.current.keys().next().value;
          if (primeiraChave !== undefined) opcoesCacheRef.current.delete(primeiraChave);
        }
        return resultado;
      } catch (err) {
        console.error("Erro ao buscar opções em cascata:", err);
        return [];
      } finally {
        opcoesInFlightRef.current.delete(chave);
      }
    })();

    opcoesInFlightRef.current.set(chave, promessa);
    return promessa;
  }, [estrutura]);

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

  const endProc = async (btn, mensagem, sucesso = true) => {
    if (sucesso) {
      const msgEl = getEl("apoioProgressMsg");
      if (msgEl) {
        msgEl.innerText = "Atualizando cache da base de dados...";
      }
      
      await solicitarAtualizacaoCache("importacao", false, true);
      
      if (btn) {
        Object.assign(btn.style, { opacity: "1", cursor: "pointer" });
        btn.disabled = false;
      }
      
      mostrarResultadoNoModal("success", mensagem);
      setTimeout(() => {
        invalidarCaches();
        carregarDados();
      }, 1500);
    } else {
      if (btn) {
        Object.assign(btn.style, { opacity: "1", cursor: "pointer" });
        btn.disabled = false;
      }
      mostrarResultadoNoModal("error", mensagem);
    }
    return false;
  };

  const copiarPIs = async function() {
    const executarProcessamentoCopia = async (tipoCopia, escopo) => {
      try {
        const closeBtn = Swal.getCloseButton(), confirmBtn = Swal.getConfirmButton(), denyBtn = Swal.getDenyButton();
        if (closeBtn) Object.assign(closeBtn.style, { pointerEvents: 'none', opacity: '0.4' });
        if (confirmBtn) { confirmBtn.style.setProperty('display', 'none', 'important'); confirmBtn.disabled = true; }
        if (denyBtn) { denyBtn.style.setProperty('display', 'none', 'important'); denyBtn.disabled = true; }
        let lista = [];

        if (escopo === 'ATUAL') {
          updateProgress('copiar', 30, 'Lendo dados da exibição atual...');
          lista = registros;
          updateProgress('copiar', 70, 'Formatando dados...');
        } else {
          updateProgress('copiar', 15, 'Consultando registros completos do banco...');
          let inicio = 0, buscar = true;
          while (buscar) {
            let query = supabase.from(tabelaBd).select('pep, regional').range(inicio, inicio + 999).order('id', { ascending: true });
            const { data, error } = await query;
            if (error) throw error;
            if (data && data.length > 0) {
              lista.push(...data); inicio += data.length;
              if (data.length < 1000) buscar = false;
            } else buscar = false;
            updateProgress('copiar', Math.min(75, 15 + Math.round((inicio / (inicio + 1000)) * 60)), `Analisando os dados... (${lista.length})`);
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

    const perguntarEscopoCopia = (tipoCopia) => {
      Swal.fire({
        ...swalDefault,
        html: `
          <div class="modal-header-pro">
            <div class="modal-header-left">
              <div class="modal-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </div>
              <div>
                <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Escopo da Cópia</h2>
                <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Escolha o escopo dos dados</p>
              </div>
            </div>
          </div>
          <div class="modal-body-pro">
            <div id="copiarStateSelect" style="text-align: center;">
              <p style="margin:0 0 10px;font-size:0.9rem;color:#475569;">Deseja copiar o <b>banco completo</b> (sem filtros) ou somente a <b>exibição atual</b>?</p>
            </div>
            <div id="copiarStateProgress" style="display:none;padding:10px 0;text-align:center;">
              <div id="copiarProgressMsg" style="font-size:0.95rem;color:#334155;font-weight:500;">Processando...</div>
              <div style="width:100%;">
                <div class="progress-container"><div id="copiarProgressBar" class="progress-bar"></div></div>
                <div id="copiarProgressText" class="progress-text">0%</div>
              </div>
            </div>
          </div>
        `,
        showCancelButton: false, showDenyButton: true, confirmButtonText: 'Banco Completo', confirmButtonColor: '#005596', denyButtonText: 'Exibição Atual', denyButtonColor: '#10b981', reverseButtons: true, allowOutsideClick: false,
        preConfirm: async () => {
          const btn = Swal.getConfirmButton();
          if (btn && btn.innerText === 'OK') return true;
          await executarProcessamentoCopia(tipoCopia, 'COMPLETO'); return false;
        },
        preDeny: async () => { await executarProcessamentoCopia(tipoCopia, 'ATUAL'); return false; }
      });
    };

    Swal.fire({
      ...swalDefault,
      html: `
        <div class="modal-header-pro">
          <div class="modal-header-left">
            <div class="modal-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </div>
            <div>
              <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Central de Cópia</h2>
              <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Opções de Cópia de PEPs</p>
            </div>
          </div>
        </div>
        <div class="modal-body-pro">
          <div id="copiarStateSelect" style="text-align: center;">
            <p style="margin:0 0 10px;font-size:0.9rem;color:#475569;">Escolha o formato desejado para copiar os PEPs:</p>
          </div>
        </div>
      `,
      showCancelButton: false, showDenyButton: true, confirmButtonText: "PEP's Nível 3", confirmButtonColor: '#005596', denyButtonText: "PEP's Nível 2", denyButtonColor: '#10b981', reverseButtons: true, allowOutsideClick: false,
      preConfirm: () => { perguntarEscopoCopia('NIVEL3'); return false; },
      preDeny: () => { perguntarEscopoCopia('NIVEL2'); return false; }
    });
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
      
      const colunasTemplate = ["pep", "nota", "descricao", "status", "liberacao", "energizacao"];
      const objVazio = colunasTemplate.reduce((acc, col) => { acc[col] = ""; return acc; }, {});
      const ws = window.XLSX.utils.json_to_sheet([objVazio]);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Template");
      window.XLSX.writeFile(wb, `Template_${titulo.replace(/\s+/g, "_")}.xlsx`);
    } catch (err) {
      Swal.fire("Erro", "Erro ao gerar template: " + err.message, "error");
    }
  };

  const executarExportacao = async (apenasFiltrados, apenasNota) => {
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
      const selectColumns = apenasNota ? "nota" : "*";

      if (apenasFiltrados) {
        baseExport = linhasSelecionadasIds?.length > 0 ? registros.filter(r => linhasSelecionadasIds.includes(r.id)) : registros;
        updateProgress("export", 35, `Preparando ${baseExport.length.toLocaleString("pt-BR")} registro(s)...`);
        await pausa();
      } else {
        const r = await supabase.from(tabelaBd).select("id", { count: "exact", head: true });
        if (r.error) throw r.error;
        const count = r.count || 0;
        if (!count) {
          mostrarResultadoNoModal("warning", "Nenhum registro para exportar.");
          return false;
        }
        let inicio = 0;
        let buscar = true;
        while (buscar && inicio < count) {
          const { data, error } = await supabase.from(tabelaBd).select(selectColumns).order("id", { ascending: true }).range(inicio, inicio + 999);
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

      let ws;
      if (apenasNota) {
        const wsData = [
          ["nota"], 
          ...baseExport.map(linha => {
            const valNota = formatarValorExibicao(linha.nota ?? "").trim();
            const notaFormatada = valNota ? `000${valNota}` : "";
            return [notaFormatada];
          })
        ];
        ws = window.XLSX.utils.aoa_to_sheet(wsData);
        
        const range = window.XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          const cellAddress = window.XLSX.utils.encode_cell({ r: R, c: 0 });
          if (ws[cellAddress]) {
            ws[cellAddress].t = 's';
          }
        }
      } else {
        const ocultasSalvas = JSON.parse(localStorage.getItem(`tabelas_dados_${tabelaBd}_${userIdKey}_ocultas`)) || [];
        let cols = baseExport[0] ? Object.keys(baseExport[0]).filter(c => !ocultasSalvas.includes(c) && !colunasOcultasDesejadas.includes(c.toLowerCase())) : [];
        const dadosExcel = baseExport.map(linha => cols.reduce((l, c) => { l[c] = formatarValorExibicao(linha[c] ?? ""); return l; }, {}));
        ws = window.XLSX.utils.json_to_sheet(dadosExcel);
      }

      updateProgress("export", 96, "Gerando Excel...");
      await pausa();

      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Dados");
      window.XLSX.writeFile(wb, `${titulo.replace(/\s+/g, "_")}_Export_${apenasNota ? "NOTA_" : ""}${new Date().toISOString().slice(0, 10)}.xlsx`);

      mostrarResultadoNoModal("success", "Exportação concluída!", `${baseExport.length.toLocaleString("pt-BR")} registro(s) exportado(s).`);
      return false;
    } catch (err) {
      mostrarResultadoNoModal("error", "Não foi possível concluir a exportação.", err.message || String(err));
      return false;
    }
  };

  const perguntarEscopoExportacao = (apenasNota) => {
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
              <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Escopo da Exportação</p>
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
      preConfirm: async () => await executarExportacao(false, apenasNota),
      preDeny: async () => await executarExportacao(true, apenasNota)
    });
  };

  const exportarDadosTabela = () => {
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
              <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Seleção de Colunas</p>
            </div>
          </div>
        </div>
        <div class="modal-body-pro">
          <div id="exportStateSelect">
            <p style="margin:0 0 10px;color:#475569;font-size:0.9rem;">Deseja exportar todos as colunas ou apenas a coluna <b>NOTA</b> da visualização?</p>
          </div>
        </div>
      `,
      showCancelButton: false,
      showDenyButton: true,
      confirmButtonText: "Todas",
      denyButtonText: "Nota",
      confirmButtonColor: corTheme,
      denyButtonColor: "#10b981",
      allowOutsideClick: false,
      preConfirm: () => { perguntarEscopoExportacao(false); return false; },
      preDeny: () => { perguntarEscopoExportacao(true); return false; }
    });
  };

  const limpaStr = v => v ? String(v).replace(/^"|"$/g, '').trim() : null;

  const formatPep = v => {
    if (!v) return null;
    let l = v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return l.length >= 18 
      ? `${l.substring(0, 2)}-${l.substring(2, 13)}.${l.substring(13, 14)}.${l.substring(14, 18)}` 
      : v.substring(0, 21);
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
        if (!isNaN(dt.getTime()) && dt.getUTCFullYear() === y && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d)
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return null;
  };

  const parseNumeroSeguro = (val) => {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") return val;
    const str = String(val).trim().replace(/\./g, "").replace(",", ".");
    const num = Number(str);
    return isNaN(num) ? null : num;
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
        <p style="font-size:0.9rem;color:#475569;margin:0 0 15px;line-height:1.4;">Encontramos <b>${count}</b> PEP(s) já existentes na base. Deseja substituir e salvar os novos ou apenas salvar os novos?</p>
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
                <polyline points="21 15 16 10 5 21"></polyline>
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

  const processarImportacaoPep = async (file, btn) => {
    const update = (pct, msg) => {
      const msgEl = getEl("apoioProgressMsg");
      if (msgEl) { msgEl.innerText = msg; msgEl.style.textAlign = "center"; msgEl.style.width = "100%"; }
      const wrapper = getEl("apoioProgressBarWrapper");
      if (wrapper && pct >= 40) wrapper.style.display = "block";
      
      const pctInt = Math.round(pct);
      const progBar = getEl("importProgressBar");
      if (progBar) progBar.style.width = `${pctInt}%`;
      const progTxt = getEl("importProgressText");
      if (progTxt) { progTxt.innerText = `${pctInt}%`; progTxt.style.textAlign = "center"; }
    };

    const calcReg = p => {
      if (!p) return 'N/I';
      const eme = p.substring(10, 14);
      switch(eme) {
        case 'EME1': return 'NORTE';
        case 'EME2': return 'NORDESTE';
        case 'EME3': return 'SUL';
        case 'EME4': return 'OESTE';
        case 'EME5': return 'CENTRO';
      }
      const c16 = p.substring(15, 16), c14 = p.substring(13, 14);
      switch(c16) { 
        case '1': return 'NORTE'; 
        case '2': return 'NORDESTE'; 
        case '3': return 'SUL'; 
        case '4': return 'OESTE'; 
        case '5': return 'CENTRO'; 
        default: 
          switch(c14){ 
            case '1': return 'NORTE'; 
            case '2': return 'NORDESTE'; 
            case '3': return 'SUL'; 
            case '4': return 'OESTE'; 
            case '5': return 'CENTRO'; 
            default: return 'N/I'; 
          } 
      }
    };

    try {
      update(5, "Lendo arquivo...");
      if (typeof window.XLSX === "undefined") {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      const usuCad = getNomeUsuarioLogado();
      const dataBuffer = await file.arrayBuffer();
      const wb = window.XLSX.read(new Uint8Array(dataBuffer), { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      
      const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rows.length < 2) throw new Error("A planilha está vazia ou contém apenas o cabeçalho.");

      update(20, "Formatando dados...");
      const orig = [], pepsP = new Set();
      
      for (let i = 1; i < rows.length; i++) {
        const c = rows[i];
        if (!c || c.join("").trim() === "") continue;
        while(c.length < 6) c.push("");

        const p = formatPep(limpaStr(c[0]));
        let s = limpaStr(c[3]);
        if (s) s = `${s.substring(0,4)}//${s.slice(-4)}`.replace(/\s+/g, '');

        if (p) {
          pepsP.add(p);
          orig.push({
            pep: p,
            nota: limpaStr(c[1]),
            descricao: limpaStr(c[2]),
            status: s,
            liberacao: formatarDataSegura(c[4]),
            energizacao: formatarDataSegura(c[5])
          });
        }
      }
      if (!orig.length) throw new Error("Nenhum dado válido encontrado.");

      const pepsB = new Set();
      const chunksP = chunkArr(Array.from(pepsP), 150);
      for (let i = 0; i < chunksP.length; i++) {
        update(25 + (((i + 1) / chunksP.length) * 20), `Buscando no banco (${i + 1}/${chunksP.length})...`);
        const { data, error } = await supabase.from(tabelaImportacao).select('pep').in('pep', chunksP[i]);
        if (error) throw error;
        (data || []).forEach(r => pepsB.add(String(r.pep).trim()));
      }

      let acao = 'SUBSTITUIR';
      let filt = orig;
      const mapAnt = {};

      if (pepsB.size > 0) {
        acao = await askAction(pepsB.size, 'boxLoc');

        update(48, "Aplicando filtros...");
        filt = orig.filter(item => !(acao === 'APENAS_NOVAS' && pepsB.has(item.pep)));
        if (!filt.length) throw new Error("Nenhum registro para salvar.");

        const procPeps = Array.from(new Set(filt.map(i => i.pep)));
        const chProc = chunkArr(procPeps, 150);
        for (let i = 0; i < chProc.length; i++) {
          update(50 + (((i + 1) / chProc.length) * 20), `Validando histórico (${i + 1}/${chProc.length})...`);
          const { data, error } = await supabase.from(tabelaImportacao).select('pep, E_CONC, E_COMS, E_MED, E_PEND, E_LIB').in('pep', chProc[i]);
          if (error) throw error;
          (data || []).forEach(r => mapAnt[r.pep] = r);
        }
      }

      update(75, "Preparando pacote final...");
      const dtAtual = formatarDataSegura(new Date());
      const inserir = [];

      for (let j = 0; j < filt.length; j++) {
        const o = filt[j], db = mapAnt[o.pep] || {};
        const dtLiberacao = formatarDataSegura(o.liberacao);
        const dtEnergizacao = formatarDataSegura(o.energizacao);
         
        const eConcVal = (!db.E_CONC && o.status === 'LIB//CONC') ? dtAtual : (db.E_CONC || null);
        const eComsVal = (!db.E_COMS && o.status === 'LIB//COMS') ? dtAtual : (db.E_COMS || null);
        const eMedVal = (!db.E_MED && o.status === 'LIB//MED') ? dtAtual : (db.E_MED || null);
        const ePendVal = (!db.E_PEND && ['LIB//PEND','LIB//DEV','LIB//DFEC'].includes(o.status)) ? dtAtual : (db.E_PEND || null);
        const eLibVal = (o.status === 'LIB//ATEC' && dtLiberacao) ? dtLiberacao : (db.E_LIB || null);

        inserir.push({
          pep: o.pep,
          regional: calcReg(o.pep),
          nota: parseNumeroSeguro(o.nota),
          descricao: o.descricao,
          status: o.status,
          liberacao: dtLiberacao,
          energizacao: dtEnergizacao,
          E_CONC: formatarDataSegura(eConcVal),
          E_COMS: formatarDataSegura(eComsVal),
          E_MED: formatarDataSegura(eMedVal),
          E_PEND: formatarDataSegura(ePendVal),
          E_LIB: formatarDataSegura(eLibVal),
          usu_cada: String(usuCad)
        });
      }

      if (acao === 'SUBSTITUIR' && pepsB.size > 0) {
        const del = Array.from(new Set(filt.map(i => i.pep))).filter(p => pepsB.has(p));
        const chDel = chunkArr(del, 150);
        for (let i = 0; i < chDel.length; i++) {
          update(78, "Sobrescrevendo antigos...");
          const { error } = await supabase.from(tabelaImportacao).delete().in('pep', chDel[i]);
          if (error) throw error;
        }
      }

      let ins = 0;
      for (const ch of chunkArr(inserir, 1000)) {
        update(80 + ((ins / inserir.length) * 20), `Gravando (${ins}/${inserir.length})...`);
        const { error } = await supabase.from(tabelaImportacao).insert(ch);
        if (error) throw error;
        ins += ch.length;
      }

      return endProc(btn, `${ins.toLocaleString("pt-BR")} registro(s) importado(s) com sucesso.`);
    } catch (err) {
      return endProc(btn, err.message, false);
    }
  };

  const excluirBancoCompleto = async () => {
    await Swal.fire({
      ...swalDefault,
      showCancelButton: true,
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      width: "650px",
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
          <div id="excluirStateSelect">
            <p style="margin:0;color:#475569;font-size:0.9rem;">Tem certeza absoluta que deseja excluir <b>todo o banco de dados</b> e os logs desta tabela? Esta ação não poderá ser desfeita.</p>
          </div>
          <div id="excluirStateProgress" style="display:none;padding:15px 0;flex-direction:column;align-items:center;justify-content:center;">
            <div id="excluirProgressMsg" style="font-size:0.95rem;color:#334155;font-weight:500;text-align:center;width:100%;">Iniciando processo...</div>
            <div id="excluirProgressBarWrapper" style="display:block;width:100%;margin-top:15px;">
              <div class="progress-container"><div id="excluirProgressBar" class="progress-bar"></div></div>
              <div id="excluirProgressText" class="progress-text">0%</div>
            </div>
          </div>
        </div>
      `,
      preConfirm: async () => {
        const btn = Swal.getConfirmButton();
        const actions = Swal.getActions();
        if (actions) actions.style.display = "none";
        if (btn) { Object.assign(btn.style, { opacity: "0.4", cursor: "not-allowed" }); btn.disabled = true; }

        const stateSelect = getEl("excluirStateSelect");
        const stateProgress = getEl("excluirStateProgress");
        if (stateSelect) stateSelect.style.display = "none";
        if (stateProgress) stateProgress.style.display = "flex";

        const updateExcluir = (pct, msg) => {
          const msgEl = getEl("excluirProgressMsg");
          if (msgEl) { msgEl.innerText = msg; msgEl.style.textAlign = "center"; msgEl.style.width = "100%"; }
          const progBar = getEl("excluirProgressBar");
          if (progBar) progBar.style.width = `${pct}%`;
          const progTxt = getEl("excluirProgressText");
          if (progTxt) { progTxt.innerText = `${Math.round(pct)}%`; progTxt.style.textAlign = "center"; }
        };

        try {
          updateExcluir(20, "Limpando tabela principal de importação...");
          const respDel1 = await supabase.from(tabelaImportacao).delete().not("id", "is", null);
          if (respDel1.error) throw respDel1.error;

          updateExcluir(50, "Limpando tabela de logs (tabe_cad_carteira_log)...");
          const respDel2 = await supabase.from("tabe_cad_carteira_log").delete().not("id", "is", null);
          if (respDel2.error) throw respDel2.error;

          updateExcluir(75, "Atualizando cache da base de dados em segundo plano...");
          await solicitarAtualizacaoCache("exclusao", false, true);

          updateExcluir(100, "Exclusão e atualização do cache concluídas com sucesso!");
          setTimeout(() => {
            invalidarCaches();
            carregarDados();
            Swal.close();
          }, 1200);
          return false;
        } catch (err) {
          mostrarResultadoNoModal("error", "Erro ao limpar o banco: " + (err.message || String(err)));
          return false;
        }
      }
    });
  };

  const dispararBuscaGeral = async () => {
    if (!colunaBuscaSelecionada) return;

    const termosAtuais = busca.split(/[\r\n,;]+/).map(t => t.trim()).filter(t => t.length > 0);
    const totalChips = termosAtuais.length;

    setBuscaConsulta(busca.trim());
    setColunaBuscaConsulta(colunaBuscaSelecionada);
    setPaginaAtual(1);

    if (totalChips > 0) {
      try {
        let estData = estrutura;
        if (!estData.length) {
          estData = await obterEstruturaTabela(tabelaBd);
        }
        const colunasBusca = obterColunasTexto(estData);
        let colunasAlvo = colunasBusca;
        if (colunaBuscaSelecionada === "pep") {
          colunasAlvo = colunasBusca.includes("pep") ? ["pep"] : [colunasBusca[0]];
        } else if (colunaBuscaSelecionada === "nota") {
          colunasAlvo = colunasBusca.includes("nota") ? ["nota"] : [colunasBusca[0]];
        }

        let query = supabase.from(tabelaBd).select("*");
        query = aplicarFiltrosAuxiliaresCom(query, filtrosColunas);
        query = aplicarBuscaCom(query, busca.trim(), colunasBusca, colunaBuscaSelecionada);

        const { data, error } = await query;
        if (error) throw error;

        const dadosRetornados = data || [];
        const naoEncontrados = [];

        termosAtuais.forEach(termo => {
          const termoLower = termo.toLowerCase();
          const encontrado = dadosRetornados.some(row => {
            return colunasAlvo.some(col => {
              const val = String(row[col] || "").toLowerCase();
              return val.includes(termoLower);
            });
          });
          if (!encontrado) {
            naoEncontrados.push(termo);
          }
        });

        setTimeout(() => {
          if (naoEncontrados.length > 0) {
            const itensListaHtml = naoEncontrados.map(item => `
              <div style="background: #fff; padding: 6px 10px; margin-bottom: 4px; border-radius: 4px; border-left: 3px solid #dc2626; color: #334155; font-size: 0.85rem; font-weight: 500; display: flex; justify-content: space-between; align-items: center;">
                <span>${item}</span>
              </div>
            `).join("");

            Swal.fire({
              ...swalDefault,
              width: "480px",
              showCloseButton: false,
              didOpen: () => {
                swalDefault.didOpen();
                const closeBtn = Swal.getCloseButton();
                if (closeBtn) closeBtn.style.display = "none";
              },
              html: `
                <div class="modal-header-pro">
                  <div class="modal-header-left">
                    <div class="modal-icon-box" style="background: #fef2f2; color: #dc2626; box-shadow: 0 4px 10px rgba(220,38,38,.1);">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    <div>
                      <h2 style="margin:0;font-size:1.05rem;font-weight:700;color:#0f172a;line-height:1.2;">Relatório de Pesquisa</h2>
                      <p style="margin:3px 0 0;font-size:0.8rem;color:#64748b;">Alguns dados informados não retornaram resultados.</p>
                    </div>
                  </div>
                </div>
                <div class="modal-body-pro" style="padding: 16px 20px;">
                  <div style="display: flex; gap: 10px; margin-bottom: 14px;">
                    <div style="flex: 1; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                      <span style="display: block; font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Pesquisado</span>
                      <span style="font-size: 1.1rem; color: #0f172a; font-weight: 700;">${totalChips}</span>
                    </div>
                    <div style="flex: 1; background: #fef2f2; padding: 10px; border-radius: 8px; border: 1px solid #fecaca; text-align: center;">
                      <span style="display: block; font-size: 0.75rem; color: #dc2626; font-weight: 600; text-transform: uppercase;">Não Encontrados</span>
                      <span style="font-size: 1.1rem; color: #dc2626; font-weight: 700;">${naoEncontrados.length}</span>
                    </div>
                  </div>
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 6px;">Lista de itens ausentes:</label>
                  <div style="max-height: 160px; overflow-y: auto; background: #f1f5f9; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    ${itensListaHtml}
                  </div>
                </div>
              `,
              showConfirmButton: true,
              confirmButtonText: "Entendido",
              confirmButtonColor: corTheme
            });
          }
        }, 300);

      } catch (err) {
        console.error("Erro ao verificar dados não encontrados:", err);
      }
    }
  };

  const temFiltroAtivo = busca.trim().length > 0 || Object.values(filtrosColunas).some(r => Array.isArray(r) && r.length > 0) || Boolean(colunaBuscaSelecionada);
  const limparTodosFiltros = () => { setBusca(""); setBuscaConsulta(""); setColunaBuscaSelecionada(""); setColunaBuscaConsulta(""); setFiltrosColunas({}); setOrdenacao({ coluna: null, asc: true }); setPaginaAtual(1); setLimparFiltrosTrigger(p => p + 1); };

  const btnBase = { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "32px", padding: "0 12px", minWidth: "100px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", boxSizing: "border-box", fontWeight: "600", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" };
  const btnIco = { display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", boxSizing: "border-box", fontWeight: "600" };
  const temSel = linhasSelecionadasIds?.length > 0;

  const termosBusca = busca.split(/[\r\n,;]+/).map(t => t.trim()).filter(t => t.length > 0);

  return (
    <div style={{ position: "absolute", inset: "0", width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", padding: "24px", boxSizing: "border-box", overflow: "hidden", zIndex: 10 }}>
        
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", background: "#ffffff", padding: "8px 14px", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ backgroundColor: corTheme, color: "#fff", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,85,150,0.2)" }}><Database size={16} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h2 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a", fontWeight: "700", lineHeight: "1.2" }}>{titulo}</h2>
                <Search 
                  size={16} 
                  style={{ color: corTheme, cursor: "pointer" }} 
                  onClick={abrirModalInformacao}
                  title="Clique para ver o passo a passo de onde conseguir os dados"
                />
              </div>
              <p style={{ margin: "1px 0 0", fontSize: "0.72rem", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
                {solicitandoAtualizacao ? (
                  <>
                    <RefreshCw size={12} className="lucide-spin" style={{ color: corTheme }} />
                    <span>Atualizando...</span>
                  </>
                ) : (
                  ultimaAtualizacaoCache || "Carregando última atualização..."
                )}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #005596", padding: "2px 8px 2px 10px", borderRadius: "6px", height: "30px", boxSizing: "border-box" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Previsto:</span>
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

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #10b981", padding: "2px 8px 2px 10px", borderRadius: "6px", height: "30px", boxSizing: "border-box" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Produzido:</span>
            <span style={{ fontSize: "0.9rem", color: corTheme, fontWeight: "700" }}>
              {calculandoSoma ? (
                <span style={{ color: "#94a3b8", fontWeight: "500", fontSize: "0.85rem" }}>
                  Calculando<span className="loading-dots"></span>
                </span>
              ) : (
                somaTotalProduzido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              )}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #0284c7", padding: "2px 8px 2px 10px", borderRadius: "6px", height: "30px", boxSizing: "border-box" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Medido:</span>
            <span style={{ fontSize: "0.9rem", color: corTheme, fontWeight: "700" }}>
              {calculandoSoma ? (
                <span style={{ color: "#94a3b8", fontWeight: "500", fontSize: "0.85rem" }}>
                  Calculando<span className="loading-dots"></span>
                </span>
              ) : (
                somaTotalMedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              )}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #6366f1", padding: "2px 8px 2px 10px", borderRadius: "6px", height: "30px", boxSizing: "border-box" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Faturado:</span>
            <span style={{ fontSize: "0.9rem", color: corTheme, fontWeight: "700" }}>
              {calculandoSoma ? (
                <span style={{ color: "#94a3b8", fontWeight: "500", fontSize: "0.85rem" }}>
                  Calculando<span className="loading-dots"></span>
                </span>
              ) : (
                somaTotalFaturado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              )}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #e11d48", padding: "2px 8px 2px 10px", borderRadius: "6px", height: "30px", boxSizing: "border-box" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Saldo:</span>
            <span style={{ fontSize: "0.9rem", color: corTheme, fontWeight: "700" }}>
              {calculandoSoma ? (
                <span style={{ color: "#94a3b8", fontWeight: "500", fontSize: "0.85rem" }}>
                  Calculando<span className="loading-dots"></span>
                </span>
              ) : (
                somaTotalReceber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              )}
            </span>
          </div>

        </div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px", flex: "1", minWidth: "320px", alignItems: "center" }}>
            
    
        <div style={{ position: "relative", display: "inline-block" }}>
          <details 
            ref={node => {
              if (!node) return;
              node.querySelectorAll("button").forEach(btn => {
                btn.onclick = () => node.removeAttribute("open");
              });
              const handleClickOutside = e => {
                if (!node.contains(e.target)) {
                  node.removeAttribute("open");
                }
              };
              document.addEventListener("mousedown", handleClickOutside);
              return () => document.removeEventListener("mousedown", handleClickOutside);
            }}
            style={{ position: "relative" }}
          >
            <summary style={{ ...btnBase, background: "#f6f9fd", border: "1px solid #cbd5e1", color: "#0f172a", listStyle: "none", cursor: "pointer", userSelect: "none", width: "max-content", minWidth: "150px" }} title="Abrir Menu de Ações">
              Menu de Ações <ChevronDown size={14} />
            </summary>
            <div style={{ position: "absolute", left: 0, marginTop: "4px", background: "#f6f9fd", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", padding: "4px 0", display: "flex", flexDirection: "column", zIndex: 99, width: "max-content", minWidth: "220px" }}>
              
              <style>{`
                .menu-dropdown-item {
                  width: 100%;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  height: 34px;
                  padding: 0 16px;
                  border: none;
                  background: transparent;
                  font-size: 0.8rem;
                  font-weight: 600;
                  cursor: pointer;
                  box-sizing: border-box;
                  border-bottom: 1px solid #e1e6ed;
                  white-space: nowrap;
                  text-align: left;
                  transition: background-color 0.15s ease;
                }
                .menu-dropdown-item:last-child {
                  border-bottom: none;
                }
                .menu-dropdown-item:hover:not(:disabled) {
                  background-color: #e1e6ed;
                }
              `}</style>

              {/* Botão Localização Obra (Pergunta se quer a página atual ou o banco completo) */}
              <button 
                onClick={lidarComCliqueLocalizacaoObra} 
                className="menu-dropdown-item"
                style={{ color: "#334155" }}
              >
                <MapPin size={14} style={{ color: corTheme }} /> Localização Obra
              </button>

              <button 
                onClick={() => {
                  if (!linhasSelecionadasIds || linhasSelecionadasIds.length === 0) {
                    Swal.fire("Atenção", "Selecione ao menos um registro na tabela para aplicar o carimbo.", "warning");
                    return;
                  }
                  abrirModalCarimbo({ 
                    supabase, 
                    tabelaImportacaoEspecial, 
                    corTheme, 
                    swalDefault, 
                    getNomeUsuarioLogado, 
                    invalidarCaches, 
                    carregarDados: async () => {
                      setLinhasSelecionadasIds([]);
                      setRegistroSelecionadoId(null);
                      setRegistroSelecionadoObj(null);
                      await solicitarAtualizacaoCache("carimbo", false, true);
                      invalidarCaches();
                      carregarDados();
                    }, 
                    linhasSelecionadasIds,
                    registros,
                    textoProgressoCache: "Atualizando cache da base de dados..." 
                  });
                }} 
                className="menu-dropdown-item"
                style={{ color: "#334155" }}
              >
                <Stamp size={14} /> Carimbar Etapa
              </button>

              <button 
                onClick={() => {
                  if (!linhasSelecionadasIds || linhasSelecionadasIds.length === 0) {
                    Swal.fire({
                      icon: "warning",
                      title: "Atenção",
                      text: "Selecione ao menos um registro na tabela para visualizar os serviços mapeados.",
                      confirmButtonColor: corTheme
                    });
                    return;
                  }
                  abrirModalServicosConsolidados({ linhasSelecionadasIds, registros, supabase, Swal, swalDefault, corTheme });
                }} 
                className="menu-dropdown-item"
                style={{ color: "#334155" }}
              >
                <FileText size={14} /> Serviço Mapeado
              </button>

              <button onClick={copiarPIs} className="menu-dropdown-item" style={{ color: '#334155' }}>
                <Copy size={14} /> Copiar PEP's
              </button>

              <button onClick={exportarDadosTabela} className="menu-dropdown-item" style={{ color: "#334155" }}>
                <Download size={14} /> Exportar Dados
              </button>

              <button onClick={importarDadosTabela} className="menu-dropdown-item" style={{ color: "#475569" }}>
                <Upload size={14} /> Importar Dados
              </button>
                    
              {isDesenvolvedor && (
                <button onClick={excluirBancoCompleto} className="menu-dropdown-item" style={{ color: "#dc2626" }}>
                  <Trash2 size={14} /> Excluir Banco
                </button>
              )}

            </div>
          </details>
        </div>

          <select
            value={colunaBuscaSelecionada}
            onChange={e => {
              setColunaBuscaSelecionada(e.target.value);
              if (!e.target.value) {
                setBusca("");
                setBuscaConsulta("");
                setPaginaAtual(1);
              }
            }}
            style={{
              height: "32px",
              padding: "0 8px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              fontWeight: "600",
              fontSize: "0.82rem",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="">Selecione uma coluna</option>            
            <option value="nota">Filtrar por Nota</option>
            <option value="pep">Filtrar por Pep</option>
          </select>

          <div style={{ position: "relative", flex: "1", minWidth: "260px", height: "32px", background: colunaBuscaSelecionada ? "#fff" : "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", display: "flex", alignItems: "center", padding: "0 40px 0 32px", boxSizing: "border-box", opacity: colunaBuscaSelecionada ? 1 : 0.6, pointerEvents: colunaBuscaSelecionada ? "auto" : "none" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", zIndex: 2 }} />
             
            <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", width: "100%", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
              {termosBusca.map((termo, index) => (
                <span key={index} style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", fontSize: "0.78rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                  {termo}
                  <X size={12} style={{ cursor: "pointer", opacity: 0.7 }} onClick={(e) => {
                    e.stopPropagation();
                    const novosTermos = termosBusca.filter((_, i) => i !== index);
                    const textoAtualizado = novosTermos.join(", ");
                    setBusca(textoAtualizado);
                    setBuscaConsulta(textoAtualizado.trim());
                    setPaginaAtual(1);
                  }} />
                </span>
              ))}

              <input
                type="text"
                disabled={!colunaBuscaSelecionada}
                placeholder={termosBusca.length === 0 ? (colunaBuscaSelecionada ? "Pesquisar em massa (cole os dados)" : "Pesquisa em massa de Notas ou PES's, selecione uma coluna...") : ""}
                value={termosBusca.length === 0 ? busca : ""}
                onChange={e => setBusca(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    dispararBuscaGeral();
                  }
                }}
                onPaste={e => {
                  e.preventDefault();
                  const textoColado = e.clipboardData.getData("text").trim();
                  setBusca(textoColado);
                }}
                style={{ flex: 1, border: "none", outline: "none", fontSize: "0.85rem", background: "transparent", color: "#334155", minWidth: "60px", padding: 0, marginLeft: termosBusca.length > 0 ? "4px" : "0", display: termosBusca.length > 0 ? "none" : "block" }}
              />
            </div>
             
            <button
              type="button"
              disabled={!colunaBuscaSelecionada}
              onClick={dispararBuscaGeral}
              title="Filtrar"
              style={{
                position: "absolute",
                right: "4px",
                top: "3px",
                bottom: "3px",
                background: colunaBuscaSelecionada ? corTheme : "#cbd5e1",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                width: "28px",
                cursor: colunaBuscaSelecionada ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Search size={14} />
            </button>
          </div>
    </div>

    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {temFiltroAtivo && (
          <button onClick={limparTodosFiltros} style={{ ...btnIco, background: "#fff", border: "1px solid #cbd5e1", color: "#dc2626" }} title="Limpar filtros"><FilterX size={16} /></button>
        )}
    </div>
    </div>

    <div style={{ flex: 1, background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading || carregandoInicial ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#64748b", fontWeight: "500" }}>
            Carregando dados e calculando totais <span className="loading-dots"></span>
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
            onFilterChange={f => { setFiltrosColunas({ ...(f || {}) }); setPaginaAtual(1); }}
            onSortChange={ord => { setOrdenacao(ord); setPaginaAtual(1); }}
            ordenacaoExterna={ordenacao}
            onFetchColumnOptions={buscarOpcoesColunaBanco}
            filtrosExternos={filtrosColunas}
            tableId={`tabelas_dados_${tabelaBd}_${userIdKey}`}
            onSelectionChange={handleSelectionChange}
            colunasIniciais={estrutura.map(c => c.nome_coluna).filter(Boolean)}
          />
        )}
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

    {/* ========================================== */}
    {/* MODAL DO MAPA (LOCALIZAÇÃO DA OBRA)        */}
    {/* ========================================== */}
    {modalMapaAberto && (
      <div style={{ position: "fixed", inset: "0", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
        <div style={{ background: "#fff", width: "95vw", height: "90vh", borderRadius: "12px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
          
          <div style={{ background: "#f8fafc", padding: "12px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ background: corTheme, color: "#fff", padding: "6px", borderRadius: "6px" }}><MapPin size={18} /></div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a", fontWeight: "700" }}>Localização Geográfica das Obras</h3>
            </div>
            
            {/* Destrói a instância do Leaflet ao fechar para permitir reabertura sem tela em branco */}
            <button 
              onClick={() => {
                destruirMapa();
                setModalMapaAberto(false);
              }} 
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}>
            
            <div style={{ position: "absolute", top: "15px", left: "60px", zIndex: 1000, display: "flex", gap: "8px", background: "white", padding: "6px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
              <input 
                type="text" 
                id="inputPesquisaMapa" 
                placeholder="Pesquisar PEP ou Nota..." 
                onKeyDown={e => { if(e.key === 'Enter') window.pesquisarNoMapa && window.pesquisarNoMapa(); }}
                style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "4px 8px", fontSize: "0.85rem", outline: "none" }} 
              />
              <button 
                onClick={() => window.pesquisarNoMapa && window.pesquisarNoMapa()} 
                style={{ background: corTheme, color: "white", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}
              >
                Buscar
              </button>
              <button 
                id="btnLimparMapa" 
                onClick={() => window.limparRotaBusca && window.limparRotaBusca()} 
                style={{ display: "none", background: "#ef4444", color: "white", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", alignItems: "center", gap: "4px" }}
              >
                Limpar Rota
              </button>
            </div>

            <button 
              onClick={() => window.abrirLegendaMapa && window.abrirLegendaMapa()}
              style={{ position: "absolute", bottom: "25px", left: "15px", zIndex: 1000, background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontWeight: "bold", color: "#334155", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}
            >
              🗺️ Legenda
            </button>

            <div style={{ position: "absolute", bottom: "25px", right: "15px", zIndex: 1000, background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 12px", fontSize: "0.85rem", color: "#475569", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
              Exibindo: <strong id="contadorPontosMapa" style={{ color: corTheme }}>0 pontos</strong>
            </div>

            <div id="mapaCarteiraContainer" style={{ width: "100%", height: "100%" }}></div>

          </div>
        </div>
      </div>
    )}

  </div>
  );
}