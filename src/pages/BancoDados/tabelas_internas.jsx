import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";
import DataTable from "../../models/DataTable";
import Swal from "sweetalert2";
import { 
  Plus, Search, Edit3, Trash2, Maximize2, Globe, Lock, 
  List as ListIcon, X, Loader2, Download, Upload, Database, ChevronDown,
  LayoutGrid, AlignJustify, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown 
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import TabelasDados from "./tabelas_dados";
import "./tabelas_internas.css";

const DynamicIcon = ({ name, ...props }) => {
  if (!name) return <Database {...props} />;
  const camelCaseName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const Icon = LucideIcons[camelCaseName] || Database;
  return <Icon {...props} />;
};

const paletaCoresPorArea = {
  "Financeiro": { fundo: "#fefce8", icone: "#d97706" },
  "Operações": { fundo: "#e0f2fe", icone: "#0284c7" },
  "Frota": { fundo: "#f1f5f9", icone: "#475569" },
  "Pessoas": { fundo: "#f4ede2", icone: "#8b5a2b" },
  "Segurança": { fundo: "#f0fdf4", icone: "#15803d" },
  "Suprimento": { fundo: "#faf5ff", icone: "#9333ea" },
  "Tecnologia / TI": { fundo: "#e0e7ff", icone: "#4f46e5" }
};

const listaIconesDisponiveis = [
  'database', 'table', 'list', 'file-text', 'server', 'folder',
  'users', 'settings', 'shield', 'box', 'map-pin', 'map',
  'external-link', 'globe', 'terminal', 'cpu', 'zap', 
  'layers', 'tool', 'activity', 'bar-chart', 'briefcase', 
  'calendar', 'check-circle', 'cloud', 'code', 'compass', 
  'edit', 'eye', 'file', 'filter', 'flag', 'folder-open', 
  'grid', 'hard-drive', 'home', 'image', 'info', 'key', 
  'layout', 'link', 'lock', 'monitor', 'navigation', 'play', 
  'plus', 'power', 'printer', 'refresh-cw', 'save',
  'search', 'send', 'share-2', 'shopping-cart', 'smartphone', 
  'star', 'sun', 'tag', 'target', 'trash', 'trash-2', 
  'trending-up', 'tv', 'upload', 'download', 'user', 'video', 'wifi', 'wrench',
  'truck', 'car', 'package', 'archive'
];

const svgSalvar = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
const svgCancelar = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 6px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
const svgAddBtn = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
const svgLixeiraBtn = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const svgHeaderEdit = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
const svgHeaderLayout = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;

export default function TabelasInternas() {
  const [tabelasData, setTabelasData] = useState([]);
  const [filtrosAtivos, setFiltrosAtivos] = useState({ area: 'TODOS', desenvolvedor: 'TODOS', busca: '' });
  const [tipoFiltroAtual, setTipoFiltroAtual] = useState('area');
  const [valorFiltroBusca, setValorFiltroBusca] = useState('');
  const [valorFiltroSelect, setValorFiltroSelect] = useState('TODOS');
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [viewMode, setViewMode] = useState('list'); 
  const [tabelaAbertaGerenciamento, setTabelaAbertaGerenciamento] = useState(null);

  // Estados de Ordenação
  const [ordenacaoCampo, setOrdenacaoCampo] = useState('titulo');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState('asc');

  const AlertaLimpo = Swal.mixin({
    showCancelButton: false,
    showConfirmButton: true,
    confirmButtonText: 'OK',
    allowOutsideClick: false,
    allowEscapeKey: true,
    buttonsStyling: true,
    customClass: {
      popup: 'swal-feedback',
      confirmButton: 'swal-botao-ok-curto',
      cancelButton: 'swal-esconder-cancelamento'
    }
  });

  useEffect(() => {
    const carregarUsuario = () => {
      try {
        const dados = localStorage.getItem("usuario_logado");
        if (dados) setUsuarioLogado(JSON.parse(dados));
      } catch (e) {
        console.error("Erro ao ler usuário:", e);
      }
    };
    carregarUsuario();
  }, []);

  useEffect(() => {
    if (usuarioLogado) {
      carregarCardsTabelas();
    }
  }, [usuarioLogado]);

  const carregarCardsTabelas = async () => {
    if (!usuarioLogado) return;
    const emailUsuarioLogado = usuarioLogado.email || '';

    try {
      const { data: tabelas, error } = await supabase
        .from("tabi_apoio_tabelas")
        .select("*")
        .or(`usuario.eq.Sistema,usuario.eq.${emailUsuarioLogado}`)
        .order("usuario", { ascending: false })
        .order("area", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      const tabelasComCount = await Promise.all((tabelas || []).map(async (tabela) => {
        try {
          const { count, error: countErr } = await supabase
            .from(tabela.tabela_bd)
            .select('*', { count: 'exact', head: true });

          if (countErr) throw countErr;
          return { ...tabela, rowCount: count !== null ? count : 0 };
        } catch (e) {
          return { ...tabela, rowCount: '?' };
        }
      }));

      setTabelasData(tabelasComCount);
    } catch (err) {
      AlertaLimpo.fire({ icon: "error", title: "Erro", text: "Não foi possível carregar as tabelas: " + err.message });
    }
  };

  const adicionarFiltroDinamico = () => {
    setFiltrosAtivos(prev => {
      const novosFiltros = { ...prev };
      if (tipoFiltroAtual === 'busca') {
        novosFiltros.busca = valorFiltroBusca.trim();
      } else if (tipoFiltroAtual === 'area') {
        novosFiltros.area = valorFiltroSelect;
      } else if (tipoFiltroAtual === 'desenvolvedor') {
        novosFiltros.desenvolvedor = valorFiltroSelect;
      }
      return novosFiltros;
    });
  };

  const removerFiltro = (tipo) => {
    setFiltrosAtivos(prev => ({ ...prev, [tipo]: tipo === 'busca' ? '' : 'TODOS' }));
  };

  const limparTodosFiltros = () => {
    setFiltrosAtivos({ area: 'TODOS', desenvolvedor: 'TODOS', busca: '' });
  };

  const abrirModalCriarCard = async (id = null, itemAtual = {}) => {
    const editando = Boolean(id);
    let iconeSelecionado = itemAtual.icone || "database";
    const perfilUsuario = usuarioLogado?.Perfil || 'Comum';
    const ehPerfilEspecial = ['Desenvolvedor', 'Gerente'].includes(perfilUsuario);

    const crudMarcado = itemAtual.crud !== undefined 
      ? (itemAtual.crud === true || itemAtual.crud === "true" || itemAtual.crud === "Sim") 
      : true;

    window._iconeAtualSalvo = iconeSelecionado;
    window.selecionarIconeDoPopOver = (nomeIcone) => {
      window._iconeAtualSalvo = nomeIcone;
      document.querySelectorAll('#gridLequeIcones .icon-popup-option').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('data-name') === nomeIcone) el.classList.add('active');
      });
      const preview = document.getElementById('previewIcone');
      const texto = document.getElementById('textoIcone');
      
      if (preview) {
        renderizarIconeNoElemento(preview, nomeIcone, 16);
      }
      if (texto) {
        texto.textContent = nomeIcone;
      }
      window.fecharLequeIcones();
    };

    window.fecharLequeIcones = () => {
      const popover = document.getElementById('popoverLequeIcones');
      if (popover) popover.style.display = 'none';
    };

    const renderizarIconeNoElemento = (elemento, nomeIcone, tamanho = 18) => {
      if (!elemento) return;
      elemento.innerHTML = "";
      const camelCaseName = nomeIcone
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
      const IconComponent = LucideIcons[camelCaseName] || Database;
      
      const rootSpan = document.createElement("span");
      rootSpan.style.display = "inline-flex";
      rootSpan.style.alignItems = "center";
      rootSpan.style.justifyContent = "center";
      elemento.appendChild(rootSpan);

      import("react-dom/client").then(({ createRoot }) => {
        if (!rootSpan || !document.body.contains(rootSpan)) return;
        const reactRoot = createRoot(rootSpan);
        reactRoot.render(React.createElement(IconComponent, { size: tamanho, strokeWidth: 2 }));
      });
    };

    const { value: formValues } = await Swal.fire({
      title: false,
      showCloseButton: false, 
      width: '650px',
      html: `
        <div class="swal-modal-header-custom">
          <div class="modal-header-icon" style="background-color: #005596; color: white;">
            ${editando ? svgHeaderEdit : svgHeaderLayout}
          </div>
          <div class="modal-header-text">
            <h3>${editando ? "Editar Card de Tabela" : "Adicionar Tabela"}</h3>
            <p>${editando ? "Atualize as informações do card selecionado." : "Cadastre uma nova tabela de apoio para o painel."}</p>
          </div>
        </div>

        <div class="swal-form-container">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="swal-form-group" style="margin-bottom: 0;">
              <label>Título de Exibição *</label>
              <input id="swal-titulo" class="swal-form-input" placeholder="Ex: Tabela de Localidades" value="${itemAtual.titulo || ''}">
            </div>
            <div class="swal-form-group" style="margin-bottom: 0;">
              <label>Nome da Tabela no Banco (BD) *</label>
              <input id="swal-tabela-bd" class="swal-form-input" placeholder="Ex: tabi_apoio_localidades" value="${itemAtual.tabela_bd || ''}">
            </div>
          </div>

          <div class="swal-form-group" style="margin-top: 10px;">
            <label>Descrição</label>
            <input id="swal-desc" class="swal-form-input" placeholder="Resumo do propósito desta tabela" value="${itemAtual.descricao || ''}">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="swal-form-group" style="margin-bottom: 0;">
              <label>Origem *</label>
              <select id="swal-origem" class="swal-form-select">
                <option value="">Selecione...</option>
                <option value="Interno" ${itemAtual.origem === 'Interno' ? 'selected' : ''}>Interno</option>
                <option value="Externo" ${itemAtual.origem === 'Externo' ? 'selected' : ''}>Externo</option>
              </select>
            </div>
            <div class="swal-form-group" style="margin-bottom: 0;">
              <label>Área</label>
              <select id="swal-area" class="swal-form-select">
                <option value="">Selecione a área...</option>
                ${Object.keys(paletaCoresPorArea).map(area => `<option value="${area}" ${itemAtual.area === area ? 'selected' : ''}>${area}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: ${ehPerfilEspecial ? '1fr 1fr' : '1fr'}; gap: 12px; margin-top: 10px;">
            <div class="swal-form-group" style="margin-bottom: 0;">
              <label>Desenvolvedor</label>
              <select id="swal-dev" class="swal-form-select">
                <option value="">Selecione...</option>
                <option value="Sistema" ${itemAtual.desenvolvedor === 'Sistema' ? 'selected' : ''}>Sistema</option>
                <option value="Dínamo" ${itemAtual.desenvolvedor === 'Dínamo' ? 'selected' : ''}>Dínamo</option>
                <option value="Equatorial" ${itemAtual.desenvolvedor === 'Equatorial' ? 'selected' : ''}>Equatorial</option>
                <option value="Outros" ${itemAtual.desenvolvedor === 'Outros' ? 'selected' : ''}>Outros</option>
              </select>
            </div>

            ${ehPerfilEspecial ? `
              <div class="swal-form-group" style="margin-bottom: 0;">
                <label>Visibilidade da Tabela</label>
                <select id="swal-visibilidade" class="swal-form-select">
                  <option value="publico" ${itemAtual.usuario === 'Sistema' ? 'selected' : ''}>Pública (Visível para todos)</option>
                  <option value="restrito" ${itemAtual.usuario !== 'Sistema' ? 'selected' : ''}>Privada (Apenas para mim)</option>
                </select>
              </div>
            ` : ''}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; align-items: center;">
            <div class="swal-form-group" style="position: relative; margin-bottom: 0;">
              <label>Ícone</label>
              <div class="icon-selector-trigger" id="btnToggleLeque">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span id="previewIcone" style="color: #0284c7; display: inline-flex; align-items: center;"></span>
                  <span id="textoIcone" style="font-size: 0.8rem; font-weight: 500;">${iconeSelecionado}</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <div class="swal-form-group" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: flex-end;">
              <label style="margin-bottom: 6px;">Ações da Tabela</label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: #334155; font-weight: 500; height: 38px;">
                <input 
                  type="checkbox" 
                  id="swal-crud" 
                  ${crudMarcado ? 'checked' : ''} 
                  style="width: 18px; height: 18px; accent-color: #005596; cursor: pointer;"
                />
                <span>Habilitar Ações de Cadastro?</span>
              </label>
            </div>
          </div>

          <div id="popoverLequeIcones" class="leque-popover-flutuante" style="display: none;">
            <div class="leque-header-busca">
              <input id="inputFiltroIcones" class="swal-form-input" placeholder="Pesquisar ícone..." autocomplete="off">
              <button type="button" onclick="window.fecharLequeIcones()" class="leque-btn-fechar">X</button>
            </div>
            <div class="icon-popup-grid" id="gridLequeIcones">
              ${listaIconesDisponiveis.map(icon => `
                <div class="icon-popup-option ${iconeSelecionado === icon ? 'active' : ''}" data-name="${icon}" onclick="window.selecionarIconeDoPopOver('${icon}')" title="${icon}">
                  <span class="grid-icon-placeholder" data-icon="${icon}" style="display: inline-flex; align-items: center;"></span>
                  <span style="font-size:9px; margin-top:2px;">${icon}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `,
      customClass: { popup: 'swal-atalho-modal' },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: editando ? `${svgSalvar} Salvar` : `${svgAddBtn} Cadastrar`,
      cancelButtonText: `${svgCancelar} Cancelar`,
      didOpen: () => {
        const btnToggle = document.getElementById('btnToggleLeque');
        const popover = document.getElementById('popoverLequeIcones');
        const inputFiltro = document.getElementById('inputFiltroIcones');
        const selectArea = document.getElementById('swal-area');
        const preview = document.getElementById('previewIcone');

        if (selectArea && selectArea.value && paletaCoresPorArea[selectArea.value] && preview) {
          preview.style.color = paletaCoresPorArea[selectArea.value].icone;
        }

        if (selectArea) {
          selectArea.onchange = (e) => {
            if (paletaCoresPorArea[e.target.value] && preview) {
              preview.style.color = paletaCoresPorArea[e.target.value].icone;
            }
          };
        }

        document.querySelectorAll('.grid-icon-placeholder').forEach(el => {
          const iconName = el.getAttribute('data-icon');
          renderizarIconeNoElemento(el, iconName, 16);
        });

        if (preview) {
          renderizarIconeNoElemento(preview, iconeSelecionado, 18);
        }

        if (btnToggle && popover) {
          btnToggle.onclick = (e) => {
            e.stopPropagation();
            popover.style.display = 'flex';
            if (inputFiltro) {
              inputFiltro.value = '';
              inputFiltro.focus();
              document.querySelectorAll('#gridLequeIcones .icon-popup-option').forEach(el => el.style.display = 'flex');
            }
          };
        }

        if (inputFiltro) {
          inputFiltro.oninput = (e) => {
            const termo = e.target.value.toLowerCase();
            document.querySelectorAll('#gridLequeIcones .icon-popup-option').forEach(item => {
              const nome = item.getAttribute('data-name');
              item.style.display = nome.includes(termo) ? 'flex' : 'none';
            });
          };
        }
      },
      preConfirm: () => {
        const titulo = document.getElementById("swal-titulo").value.trim();
        const tabela_bd = document.getElementById("swal-tabela-bd").value.trim();
        const descricao = document.getElementById("swal-desc").value.trim();
        const origem = document.getElementById("swal-origem").value;
        const area = document.getElementById("swal-area").value;
        const desenvolvedor = document.getElementById("swal-dev").value;
        const crud = document.getElementById("swal-crud").checked;
        const icone = window._iconeAtualSalvo || 'database';

        let visibilidadeSelect = document.getElementById("swal-visibilidade");
        let tipoVisibilidade = visibilidadeSelect ? visibilidadeSelect.value : 'restrito';

        if (!titulo || !tabela_bd || !origem) {
          Swal.showValidationMessage("Por favor, preencha o Título, o Nome da Tabela e selecione a Origem.");
          return false;
        }

        const temaCores = paletaCoresPorArea[area] || paletaCoresPorArea["Frota"];
        const usuarioFinal = (ehPerfilEspecial && tipoVisibilidade === 'publico') ? "Sistema" : usuarioLogado.email;

        return { 
          titulo, tabela_bd, descricao, origem, area, desenvolvedor, crud, icone, 
          cor_fundo: temaCores.fundo, cor_icone: temaCores.icone, usuario: usuarioFinal 
        };
      }
    });

    if (!formValues) return;

    try {
      if (editando) {
        const { error } = await supabase.from("tabi_apoio_tabelas").update(formValues).eq("id", id);
        if (error) throw error;
        await AlertaLimpo.fire({ icon: "success", title: "Atualizado!", text: "Alterações salvas com sucesso." });
      } else {
        const { error } = await supabase.from("tabi_apoio_tabelas").insert([formValues]);
        if (error) throw error;
        await AlertaLimpo.fire({ icon: "success", title: "Cadastrado!", text: "A nova tabela de apoio foi mapeada com sucesso." });
      }
      carregarCardsTabelas();
    } catch (err) {
      await AlertaLimpo.fire({ icon: "error", title: "Erro", text: "Erro ao salvar: " + err.message });
    }
  };

  const handleExcluirCard = async (e, id, usuarioAtalho) => {
    e.stopPropagation();
    const perfilUsuario = usuarioLogado?.Perfil || 'Comum';
    const ehPerfilEspecial = ['Desenvolvedor', 'Gerente'].includes(perfilUsuario);

    if (usuarioAtalho === 'Sistema' && !ehPerfilEspecial) {
      await AlertaLimpo.fire({ icon: "warning", title: "Acesso Restrito", text: "Apenas Desenvolvedores ou Gerentes podem excluir cards públicos." });
      return;
    }

    const confirm = await Swal.fire({
      title: "Deseja remover este card?",
      text: "Os dados da tabela não serão apagados, apenas o atalho sairá do painel.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: `${svgLixeiraBtn} Sim, remover`,
      cancelButtonText: `${svgCancelar} Cancelar`
    });

    if (confirm.isConfirmed) {
      try {
        const { error } = await supabase.from("tabi_apoio_tabelas").delete().eq("id", id);
        if (error) throw error;
        await AlertaLimpo.fire({ icon: "success", title: "Removido!", text: "Card removido com sucesso." });
        carregarCardsTabelas();
      } catch (err) {
        await AlertaLimpo.fire({ icon: "error", title: "Erro", text: "Erro ao excluir: " + err.message });
      }
    }
  };

  // Filtragem e Ordenação dos dados
  const tabelasFiltradas = tabelasData.filter(item => {
    const atendeArea = (filtrosAtivos.area === 'TODOS') || ((item.area || 'Geral') === filtrosAtivos.area);
    const atendeDev = (filtrosAtivos.desenvolvedor === 'TODOS') || ((item.desenvolvedor || 'Indefinido') === filtrosAtivos.desenvolvedor);
    const atendeBusca = filtrosAtivos.busca === '' || (item.titulo && item.titulo.toLowerCase().includes(filtrosAtivos.busca.toLowerCase()));
    return atendeArea && atendeDev && atendeBusca;
  }).sort((a, b) => {
    let valorA = a[ordenacaoCampo];
    let valorB = b[ordenacaoCampo];

    if (valorA === undefined || valorA === null) valorA = '';
    if (valorB === undefined || valorB === null) valorB = '';

    if (typeof valorA === 'string') valorA = valorA.toLowerCase();
    if (typeof valorB === 'string') valorB = valorB.toLowerCase();

    if (valorA < valorB) return ordenacaoDirecao === 'asc' ? -1 : 1;
    if (valorA > valorB) return ordenacaoDirecao === 'asc' ? 1 : -1;
    return 0;
  });

  const alternarOrdenacao = (campo) => {
    if (ordenacaoCampo === campo) {
      setOrdenacaoDirecao(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenacaoCampo(campo);
      setOrdenacaoDirecao('asc');
    }
  };

  const temFiltroAtivo = filtrosAtivos.area !== 'TODOS' || filtrosAtivos.desenvolvedor !== 'TODOS' || filtrosAtivos.busca !== '';
  const perfilUsuarioAtual = usuarioLogado?.Perfil || 'Comum';
  const ehPerfilEspecial = ['Desenvolvedor', 'Gerente'].includes(perfilUsuarioAtual);

  // Estilo unificado com altura exatamente 32px
  const alturaUnificadaEstilo = {
    height: '32px',
    boxSizing: 'border-box'
  };

  return (
    <div className="data-apoio-container">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: '#ffffff', padding: '10px 16px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#0284c7', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,85,150,0.2)' }}>
            <Database size={16} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: '700', lineHeight: '1.2' }}>Painel de Tabelas do Sistema</h2>
            <p style={{ margin: '1px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>Gerenciamento das tabelas no banco de dados do sistema.</p>
          </div>
        </div>

        <button className="btn-adicionar-card-global" style={{ ...alturaUnificadaEstilo, position: 'relative', top: 'auto', right: 'auto', padding: '0 14px', fontSize: '0.85rem' }} onClick={() => abrirModalCriarCard()}>
          <Plus size={14} strokeWidth={2.5} />
          <span>Adicionar Tabela</span>
        </button>
      </div>

      {/* FILTER BAR & CONTROLES DE ORDENAÇÃO */}
      <div className="filter-bar">
        <div className="filter-controls-wrapper">
          <div className="filter-select-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select className="filter-control-field" style={alturaUnificadaEstilo} value={tipoFiltroAtual} onChange={(e) => setTipoFiltroAtual(e.target.value)}>
              <option value="area">Filtrar por Área</option>
              <option value="desenvolvedor">Filtrar por Desenvolvedor</option>
              <option value="busca">Filtrar por Título</option>
            </select>

            {tipoFiltroAtual === 'busca' ? (
              <input 
                type="text" 
                className="filter-control-field" 
                style={alturaUnificadaEstilo} 
                placeholder="Digite o nome..." 
                value={valorFiltroBusca}
                onChange={(e) => setValorFiltroBusca(e.target.value)} 
              />
            ) : (
              <select className="filter-control-field" style={alturaUnificadaEstilo} value={valorFiltroSelect} onChange={(e) => setValorFiltroSelect(e.target.value)}>
                <option value="TODOS">TODOS</option>
                {tipoFiltroAtual === 'area' 
                  ? [...new Set(tabelasData.map(t => t.area || 'Geral'))].sort().map(op => <option key={op} value={op}>{op}</option>)
                  : [...new Set(tabelasData.map(t => t.desenvolvedor || 'Indefinido'))].sort().map(op => <option key={op} value={op}>{op}</option>)
                }
              </select>
            )}

            <button type="button" className="filter-btn-aplicar" style={alturaUnificadaEstilo} onClick={adicionarFiltroDinamico}>
              Adicionar Filtro
            </button>

            {temFiltroAtivo && (
              <button type="button" className="filter-btn-limpar-todos" style={alturaUnificadaEstilo} onClick={limparTodosFiltros} title="Limpar todos os filtros">
                <X size={11} /> Limpar Todos
              </button>
            )}

            {/* CONTROLES DE ORDENAÇÃO E VISÃO UNIFICADOS */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Ordenar por:</span>
                <select 
                  className="filter-control-field" 
                  style={{ ...alturaUnificadaEstilo, fontSize: '0.78rem' }}
                  value={ordenacaoCampo}
                  onChange={(e) => setOrdenacaoCampo(e.target.value)}
                >
                  <option value="titulo">Título</option>
                  <option value="area">Área</option>
                  <option value="desenvolvedor">Desenvolvedor</option>
                  <option value="rowCount">Registros</option>
                </select>
                <button 
                  type="button" 
                  onClick={() => setOrdenacaoDirecao(prev => prev === 'asc' ? 'desc' : 'asc')} 
                  style={{ ...alturaUnificadaEstilo, width: '32px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title={ordenacaoDirecao === 'asc' ? 'Crescente' : 'Decrescente'}
                >
                  {ordenacaoDirecao === 'asc' ? <ArrowUp size={13} strokeWidth={2.5} /> : <ArrowDown size={13} strokeWidth={2.5} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => setViewMode('grid')} 
                  style={{ 
                    ...alturaUnificadaEstilo, 
                    width: '32px',
                    background: viewMode === 'grid' ? '#e2e8f0' : 'transparent', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '6px', cursor: 'pointer', color: '#475569',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Visão em Cards"
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  style={{ 
                    ...alturaUnificadaEstilo, 
                    width: '32px',
                    background: viewMode === 'list' ? '#e2e8f0' : 'transparent', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '6px', cursor: 'pointer', color: '#475569',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Visão em Lista"
                >
                  <ListIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="filter-badges-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {filtrosAtivos.area !== 'TODOS' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 500, border: '1px solid #bae6fd' }}>
                <span>Área: <strong>{filtrosAtivos.area}</strong></span>
                <button onClick={() => removerFiltro('area')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0369a1', display: 'flex', alignItems: 'center', padding: 0 }}><X size={12} /></button>
              </div>
            )}
            {filtrosAtivos.desenvolvedor !== 'TODOS' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 500, border: '1px solid #bae6fd' }}>
                <span>Dev: <strong>{filtrosAtivos.desenvolvedor}</strong></span>
                <button onClick={() => removerFiltro('desenvolvedor')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0369a1', display: 'flex', alignItems: 'center', padding: 0 }}><X size={12} /></button>
              </div>
            )}
            {filtrosAtivos.busca !== '' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 500, border: '1px solid #bae6fd' }}>
                <span>Nome: <strong>{filtrosAtivos.busca}</strong></span>
                <button onClick={() => removerFiltro('busca')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0369a1', display: 'flex', alignItems: 'center', padding: 0 }}><X size={12} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RENDERIZAÇÃO DO CONTEÚDO */}
      <div id="gridTabelasApoio">
        {tabelasFiltradas.length === 0 ? (
          <div className="grupo-desenvolvedor-container" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Nenhuma tabela encontrada para os filtros selecionados.</p>
          </div>
        ) : (
          viewMode === 'grid' ? (
            <div className="grupo-grid-atalhos" style={{ marginTop: '12px' }}>
              {tabelasFiltradas.map(item => {
                const ehPublico = item.usuario === 'Sistema';
                const podeGerenciar = !ehPublico || ehPerfilEspecial;
                const corDinamica = item.cor_icone || '#0284c7';
                const bgCard = item.cor_fundo || '#f8fafc';

                return (
                  <div key={item.id} className="link-card-wrapper" style={{ backgroundColor: bgCard }}>
                    <div className="link-card" style={{ cursor: 'pointer' }} onClick={() => setTabelaAbertaGerenciamento(item)}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        {ehPublico ? (
                          <span className="card-badge-visibilidade" style={{ color: corDinamica }} title="Visível para todos">
                            <Globe size={10} /> Tabela Pública
                          </span>
                        ) : (
                          <span className="card-badge-visibilidade" style={{ color: corDinamica }} title="Visível apenas para você">
                            <Lock size={10} /> Minha Tabela
                          </span>
                        )}
                        <div className="card-top-row">
                          <div className="card-icon" style={{ color: corDinamica }}>
                            <DynamicIcon name={item.icone} size={14} />
                          </div>
                          <div className="card-content">
                            <h3 style={{ color: corDinamica }}>{item.titulo}</h3>
                            <p style={{ color: corDinamica, opacity: 0.85 }}>{item.descricao || 'Sem descrição'}</p>
                          </div>
                          <div className="card-action" style={{ color: corDinamica }}>
                            <Maximize2 size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card-meta-footer">
                      <div className="card-info-group">
                        <span className="card-badge-area">{item.area || 'Geral'}</span>
                        <span className="card-badge-count"><ListIcon size={9} style={{ marginRight: 3 }}/> {item.rowCount}</span>
                      </div>
                      {podeGerenciar && (
                        <div className="card-options">
                          <button title="Editar Card" onClick={(e) => { e.stopPropagation(); abrirModalCriarCard(item.id, item); }}>
                            <Edit3 size={12} strokeWidth={2.5} />
                          </button>
                          <button className="btn-delete" title="Excluir Card" onClick={(e) => handleExcluirCard(e, item.id, item.usuario)}>
                            <Trash2 size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table className="tabela-apoio-estilizada" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>Ícone</th>
                    <th onClick={() => alternarOrdenacao('titulo')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Título</span>
                        {ordenacaoCampo === 'titulo' && (
                          ordenacaoDirecao === 'asc' ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: '#005596' }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: '#005596' }} />
                        )}
                      </div>
                    </th>
                    <th>Descrição</th>
                    <th onClick={() => alternarOrdenacao('origem')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Origem</span>
                        {ordenacaoCampo === 'origem' && (
                          ordenacaoDirecao === 'asc' ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: '#005596' }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: '#005596' }} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacao('area')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Área</span>
                        {ordenacaoCampo === 'area' && (
                          ordenacaoDirecao === 'asc' ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: '#005596' }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: '#005596' }} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacao('desenvolvedor')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Desenvolvedor</span>
                        {ordenacaoCampo === 'desenvolvedor' && (
                          ordenacaoDirecao === 'asc' ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: '#005596' }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: '#005596' }} />
                        )}
                      </div>
                    </th>
                    <th>Visibilidade</th>
                    <th onClick={() => alternarOrdenacao('rowCount')} style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center', width: '100%' }}>
                        <span>Registros</span>
                        {ordenacaoCampo === 'rowCount' && (
                          ordenacaoDirecao === 'asc' ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: '#005596' }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: '#005596' }} />
                        )}
                      </div>
                    </th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelasFiltradas.map(item => {
                    const ehPublico = item.usuario === 'Sistema';
                    const podeGerenciar = !ehPublico || ehPerfilEspecial;
                    const corDinamica = item.cor_icone || '#0284c7';

                    return (
                      <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setTabelaAbertaGerenciamento(item)}>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', padding: '6px', borderRadius: '6px', background: item.cor_fundo || '#f8fafc', color: corDinamica }}>
                            <DynamicIcon name={item.icone} size={16} />
                          </div>
                        </td>
                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{item.titulo}</td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.descricao || 'Sem descrição'}</td>
                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{item.origem || '-'}</td>
                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{item.area || 'Geral'}</td>
                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{item.desenvolvedor || 'Indefinido'}</td>
                        <td>
                          {ehPublico ? (
                            <span style={{ fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={12}/> Pública</span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12}/> Privada</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="card-badge-count"><ListIcon size={10} style={{ marginRight: 4 }}/> {item.rowCount}</span>
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          {podeGerenciar ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button onClick={() => abrirModalCriarCard(item.id, item)} className="btn-acao-crud edit" title="Editar Card">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={(e) => handleExcluirCard(e, item.id, item.usuario)} className="btn-acao-crud delete" title="Excluir Card">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '12px' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* RENDERIZAÇÃO DO GERENCIAMENTO DA TABELA */}
      {tabelaAbertaGerenciamento && (
        <TabelasDados 
          tabelaBd={tabelaAbertaGerenciamento.tabela_bd}
          titulo={tabelaAbertaGerenciamento.titulo}
          icone={tabelaAbertaGerenciamento.icone}
          corTheme={tabelaAbertaGerenciamento.cor_icone || '#005596'}
          permiteCrud={tabelaAbertaGerenciamento.crud !== false && tabelaAbertaGerenciamento.crud !== 'Não' && String(tabelaAbertaGerenciamento.crud).toLowerCase() !== 'false'}
          onClose={() => {
            setTabelaAbertaGerenciamento(null);
            carregarCardsTabelas();
          }}
        />
      )}
    </div>
  );
}