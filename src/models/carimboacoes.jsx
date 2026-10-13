import React from "react";
import ReactDOMServer from "react-dom/server";
import Swal from "sweetalert2";
import { Stamp } from "lucide-react";

// ==========================================
// 1. CREATE / INSERT (Filtra duplicados e salva apenas os inéditos)
// ==========================================
export const abrirModalCarimbo = async ({
  supabase,
  corTheme,
  swalDefault,
  getNomeUsuarioLogado,
  invalidarCaches,
  carregarDados,
  carregarAnosDisponiveis,
  linhasSelecionadasIds = [],
  setLinhasSelecionadasIds,
  setRegistroSelecionadoId,
  setRegistroSelecionadoObj,
  registros = []
}) => {
  if (!linhasSelecionadasIds || linhasSelecionadasIds.length === 0) {
    Swal.fire("Atenção", "Selecione ao menos um registro na tabela para aplicar o carimbo.", "warning");
    return;
  }

  const limparSelecoes = () => {
    if (typeof setLinhasSelecionadasIds === "function") setLinhasSelecionadasIds([]);
    if (typeof setRegistroSelecionadoId === "function") setRegistroSelecionadoId(null);
    if (typeof setRegistroSelecionadoObj === "function") setRegistroSelecionadoObj(null);
  };

  let opcoesResponsaveis = `<option value="">Carregando responsáveis...</option>`;
  try {
    const { data: dadosClientes, error: erroClientes } = await supabase
      .from("tabi_apoio_cliente")
      .select("nome")
      .order("nome", { ascending: true });

    if (!erroClientes && dadosClientes) {
      opcoesResponsaveis = `<option value="">Selecione um responsável...</option>` + 
        dadosClientes.map(item => `<option value="${item.nome}">${item.nome}</option>`).join("");
    } else {
      opcoesResponsaveis = `<option value="">Erro ao carregar responsáveis</option>`;
    }
  } catch (err) {
    console.error("Erro ao buscar responsáveis:", err);
    opcoesResponsaveis = `<option value="">Erro ao carregar responsáveis</option>`;
  }

  let dadosEtapas = [];
  let opcoesAcoes = `<option value="">Carregando etapas...</option>`;
  try {
    const { data: dadosApoio, error: erroApoio } = await supabase
      .from("tabi_apoio_etapa")
      .select("etapa, condicao, id_etapa")
      .order("id_etapa", { ascending: true });

    if (!erroApoio && dadosApoio) {
      dadosEtapas = dadosApoio;

      const etapasMap = new Map();
      dadosApoio.forEach(item => {
        if (item.etapa && !etapasMap.has(item.etapa)) {
          etapasMap.set(item.etapa, item.id_etapa || "");
        }
      });

      const etapasUnicas = Array.from(etapasMap.keys()).sort((a, b) => {
        return (etapasMap.get(a) || "").localeCompare(etapasMap.get(b) || "", undefined, { numeric: true });
      });

      opcoesAcoes = `<option value="">Selecione uma etapa...</option>` + 
        etapasUnicas.map(etapa => `<option value="${etapa}">${etapa}</option>`).join("");
    } else {
      opcoesAcoes = `<option value="">Erro ao carregar etapas</option>`;
    }
  } catch (err) {
    console.error("Erro ao buscar tabela tabi_apoio_etapa:", err);
    opcoesAcoes = `<option value="">Erro ao carregar etapas</option>`;
  }

  const dataAtual = new Date();
  const anoAtual = dataAtual.getFullYear();
  const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, "0");
  const mesAnoDefault = `${anoAtual}-${mesAtual}`;
  const diaAtual = String(dataAtual.getDate()).padStart(2, "0");
  const prazoDefault = `${anoAtual}-${mesAtual}-${diaAtual}`;

  // Renderiza o ícone Stamp do Lucide para uso seguro no HTML do Swal
  const stampIconHtml = ReactDOMServer.renderToString(<Stamp size={20} />);

  Swal.fire({
    ...swalDefault,
    title: "",
    showCloseButton: false,
    html: `
      <div style="position: relative; width: 100%;">
        <button type="button" id="btnCustomClose" style="position: absolute; top: 0; right: 0; background: transparent; border: none; cursor: pointer; color: #64748b; padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: 6px; z-index: 10;" title="Fechar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="modal-header-pro" style="display: flex; align-items: center; padding-right: 32px;">
          <div class="modal-header-left" style="display: flex; align-items: center; gap: 12px;">
            <div class="modal-icon-box" style="background:${corTheme}; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px; color: #fff;">
              ${stampIconHtml}
            </div>
            <div>
              <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2; text-align: left;">Carimbo de Ação</h2>
              <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b; text-align: left;">Destino: <b>tabe_cad_carteira_log</b> (${linhasSelecionadasIds.length} item(ns))</p>
            </div>
          </div>
        </div>
        <div class="modal-body-pro" style="display: flex; flex-direction: column; gap: 16px; text-align: left; margin-top: 10px;">
          <div id="carimboFormContainer" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label style="display:block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Etapa: *</label>
              <select id="selectAcao" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; background: #fff; color: #334155; outline: none;">${opcoesAcoes}</select>
            </div>
            <div>
              <label style="display:block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Condição: *</label>
              <select id="selectMotivo" disabled style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; background: #f1f5f9; color: #94a3b8; outline: none; cursor: not-allowed;"><option value="">Selecione primeiro uma etapa...</option></select>
            </div>
            <div>
              <label style="display:block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Responsável: *</label>
              <select id="selectResponsavel" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; background: #fff; color: #334155; outline: none;">${opcoesResponsaveis}</select>
            </div>
            <div style="display: flex; gap: 12px; width: 100%;">
              <div style="flex: 1;">
                <label style="display:block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Mês / Ano: *</label>
                <input type="month" id="inputMesAno" value="${mesAnoDefault}" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; outline: none; box-sizing: border-box;" />
              </div>
              <div style="flex: 1;">
                <label style="display:block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Prazo: *</label>
                <input type="date" id="inputPrazo" value="${prazoDefault}" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; outline: none; box-sizing: border-box;" />
              </div>
            </div>
            <div>
              <label style="display:block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px;">Descrição da Ação: <span style="color: #94a3b8; font-weight: normal;">(Opcional)</span></label>
              <textarea id="inputDescricaoAcao" rows="3" placeholder="Detalhes adicionais..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; outline: none; box-sizing: border-box; resize: vertical;"></textarea>
            </div>
          </div>
          <div id="carimboProgressContainer" style="display:none; text-align:center; padding: 20px 0;">
            <div id="carimboMsgStatus" style="font-size: 0.95rem; color: #334155; font-weight: 600; margin-bottom: 12px;">Iniciando processo...</div>
            <div class="progress-container"><div id="carimboBarraProgresso" class="progress-bar" style="width: 0%;"></div></div>
            <div id="carimboProgressText" class="progress-text" style="margin-top: 8px; font-weight: 600;">0%</div>
          </div>
          <div id="carimboMensagemFinal" style="display:none; text-align:center; padding: 20px 0;"></div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Inserir",
    cancelButtonText: "Cancelar",
    confirmButtonColor: corTheme,
    cancelButtonColor: "#64748b",
    width: "600px",
    allowOutsideClick: false,
    didOpen: () => {
      const fecharModalLimpo = () => {
        limparSelecoes();
        Swal.close();
      };

      const btnCustomClose = document.getElementById("btnCustomClose");
      if (btnCustomClose) btnCustomClose.addEventListener("click", fecharModalLimpo);

      const cancelBtn = Swal.getCancelButton();
      if (cancelBtn) cancelBtn.addEventListener("click", fecharModalLimpo);

      const selectAcao = document.getElementById("selectAcao");
      const selectMotivo = document.getElementById("selectMotivo");

      selectAcao.addEventListener("change", (e) => {
        const etapaValor = e.target.value;
        selectMotivo.innerHTML = ""; 
        if (!etapaValor) {
          selectMotivo.disabled = true;
          selectMotivo.style.background = "#f1f5f9";
          selectMotivo.innerHTML = `<option value="">Selecione primeiro uma etapa...</option>`;
          return;
        }

        const itensFiltrados = dadosEtapas.filter(item => item.etapa === etapaValor && item.condicao);

        const condicoesMap = new Map();
        itensFiltrados.forEach(item => {
          if (!condicoesMap.has(item.condicao)) {
            condicoesMap.set(item.condicao, item.id_etapa || "");
          }
        });

        const condicoesFiltradas = Array.from(condicoesMap.keys()).sort((a, b) => {
          return (condicoesMap.get(a) || "").localeCompare(condicoesMap.get(b) || "", undefined, { numeric: true });
        });

        if (condicoesFiltradas.length > 0) {
          selectMotivo.disabled = false;
          selectMotivo.style.background = "#fff";
          selectMotivo.style.color = "#334155";
          selectMotivo.style.cursor = "pointer";
          selectMotivo.innerHTML = `<option value="">Selecione uma condição...</option>` +
            condicoesFiltradas.map(condicao => `<option value="${condicao}">${condicao}</option>`).join("");
        } else {
          selectMotivo.disabled = true;
          selectMotivo.style.background = "#f1f5f9";
          selectMotivo.innerHTML = `<option value="">Nenhuma condição cadastrada</option>`;
        }
      });
    },
    preConfirm: async () => {
      const etapaSelecionada = document.getElementById("selectAcao").value;
      const selectMotivo = document.getElementById("selectMotivo");
      const condicaoSelecionada = selectMotivo.value;
      const responsavel = document.getElementById("selectResponsavel").value;
      const mesAnoInput = document.getElementById("inputMesAno").value;
      const prazo = document.getElementById("inputPrazo").value;
      const descricaoAcao = document.getElementById("inputDescricaoAcao").value.trim();

      if (!etapaSelecionada) {
        Swal.showValidationMessage("Por favor, selecione uma Etapa válida.");
        return false;
      }
      if (!selectMotivo.disabled && selectMotivo.innerHTML.includes("condição") && !condicaoSelecionada) {
        Swal.showValidationMessage("Por favor, selecione uma Condição válida.");
        return false;
      }
      if (!responsavel) {
        Swal.showValidationMessage("Por favor, selecione um Responsável.");
        return false;
      }
      if (!mesAnoInput) {
        Swal.showValidationMessage("Por favor, selecione o Mês / Ano.");
        return false;
      }
      if (!prazo) {
        Swal.showValidationMessage("Por favor, selecione o Prazo.");
        return false;
      }

      const itemEncontrado = dadosEtapas.find(item => 
        item.etapa === etapaSelecionada && 
        (condicaoSelecionada ? item.condicao === condicaoSelecionada : (!item.condicao || item.condicao === ""))
      );

      const idEtapaFinal = itemEncontrado ? itemEncontrado.id_etapa : null;

      if (!idEtapaFinal) {
        Swal.showValidationMessage("Não foi possível localizar o ID da Etapa correspondente no apoio.");
        return false;
      }

      const anoMes = mesAnoInput.replace("-", "/");
      const formContainer = document.getElementById("carimboFormContainer");
      const progContainer = document.getElementById("carimboProgressContainer");
      const msgStatus = document.getElementById("carimboMsgStatus");
      const progressBar = document.getElementById("carimboBarraProgresso");
      const progressText = document.getElementById("carimboProgressText");
      const msgFinal = document.getElementById("carimboMensagemFinal");

      if (formContainer) formContainer.style.display = "none";
      
      // Oculta permanentemente o botão de confirmação (Inserir) em todas as etapas seguintes
      const confirmBtn = Swal.getConfirmButton();
      if (confirmBtn) confirmBtn.style.display = "none";

      if (progContainer) progContainer.style.display = "block";

      try {
        const usuCad = getNomeUsuarioLogado();

        const registrosParaCarimbar = linhasSelecionadasIds.map(idSel => {
          const idStr = String(idSel);
          if (idStr.startsWith("row-")) {
            const index = parseInt(idStr.replace("row-", ""), 10);
            return registros[index];
          }
          return registros.find(r => String(r.id) === idStr);
        }).filter(Boolean);

        if (registrosParaCarimbar.length === 0) {
          throw new Error("Nenhum registro correspondente encontrado.");
        }

        const pepsSelecionados = registrosParaCarimbar.map(item => String(item.pep || "SEM_PEP")).filter(Boolean);

        if (msgStatus) msgStatus.innerText = "Verificando registros existentes...";
        if (progressBar) progressBar.style.width = "5%";
        if (progressText) progressText.innerText = "5%";

        let queryVerificacao = supabase
          .from("tabe_cad_carteira_log")
          .select("id_atividade")
          .eq("id_etapa", idEtapaFinal)
          .in("id_atividade", pepsSelecionados);

        const { data: existentes, error: erroVerificacao } = await queryVerificacao;
        if (erroVerificacao) throw erroVerificacao;

        const pepsJaCadastrados = new Set((existentes || []).map(e => e.id_atividade));

        const registrosIneditos = registrosParaCarimbar.filter(item => {
          const pep = String(item.pep || "SEM_PEP");
          return !pepsJaCadastrados.has(pep);
        });

        const pepsIgnorados = Array.from(pepsJaCadastrados);

        if (registrosIneditos.length === 0) {
          if (progContainer) progContainer.style.display = "none";
          if (msgFinal) {
            msgFinal.style.display = "block";
            msgFinal.innerHTML = `
              <div style="color: #d97706; font-weight: 700; font-size: 1.05rem; margin-bottom: 6px;">Nenhum registro novo</div>
              <p style="font-size: 0.9rem; color: #475569; margin: 0;">Todos os itens selecionados já possuem este carimbo.<br/><br/><small style="color:#64748b;">Itens ignorados: ${pepsIgnorados.join(", ")}</small></p>
            `;
          }
          limparSelecoes();
          return false;
        }

        const registrosParaInserir = registrosIneditos.map(item => ({
          id_atividade: String(item.pep || "SEM_PEP"),
          id_etapa: idEtapaFinal, 
          responsavel: responsavel || null,
          ano_mes: anoMes,
          prazo: prazo || null,
          descricao_acao: descricaoAcao || null,
          usu_cada: String(usuCad)
        }));

        const totalRegistros = registrosParaInserir.length;

        for (let i = 0; i < totalRegistros; i++) {
          const loteItem = [registrosParaInserir[i]];
          const percentualAtual = Math.round(10 + ((i + 1) / totalRegistros) * 85);

          if (msgStatus) msgStatus.innerText = `Carimbando etapa em ${i + 1} de ${totalRegistros} registros`;
          if (progressBar) progressBar.style.width = `${percentualAtual}%`;
          if (progressText) progressText.innerText = `${percentualAtual}%`;

          const { error } = await supabase.from("tabe_cad_carteira_log").insert(loteItem);
          if (error) throw error;
        }

        if (msgStatus) msgStatus.innerText = "Atualizando cache da base de dados...";
        if (progressBar) progressBar.style.width = "98%";
        if (progressText) progressText.innerText = "98%";

        const { error: errRpc } = await supabase.rpc("solicitar_atualizacao_pep_cache", { p_origem: "carimbo" });
        if (errRpc) console.error("Aviso ao atualizar cache:", errRpc);

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

        if (progressBar) progressBar.style.width = "100%";
        if (progressText) progressText.innerText = "100%";

        let htmlMensagem = `<b>${totalRegistros}</b> registro(s) inserido(s) e cache atualizado com sucesso.`;
        if (pepsIgnorados.length > 0) {
          htmlMensagem += `<br/><br/><span style="color:#d97706;font-weight:600;">Ignorados (${pepsIgnorados.length} já possuíam este carimbo):</span><br/><small style="color:#64748b;max-height:100px;overflow-y:auto;display:block;">${pepsIgnorados.join(", ")}</small>`;
        }

        limparSelecoes();
        invalidarCaches();
        carregarDados();
        if (typeof carregarAnosDisponiveis === "function") carregarAnosDisponiveis();

        setTimeout(() => {
          if (progContainer) progContainer.style.display = "none";
          if (msgFinal) {
            msgFinal.style.display = "block";
            msgFinal.innerHTML = `
              <div style="width: 46px; height: 46px; border-radius: 50%; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div style="color: #10b981; font-weight: 700; font-size: 1.05rem; margin-bottom: 6px;">Processo Concluído!</div>
              <p style="font-size: 0.9rem; color: #475569; margin: 0; line-height: 1.4;">${htmlMensagem}</p>
            `;
          }
        }, 400);

        return false;
      } catch (err) {
        if (formContainer) formContainer.style.display = "flex";
        limparSelecoes();
        if (progContainer) progContainer.style.display = "none";
        Swal.showValidationMessage("Erro ao inserir carimbo: " + err.message);
        return false;
      }
    }
  });
};

// ==========================================
// 2. READ / SELECT
// ==========================================
export const buscarLogsPorPep = async (supabase, pep) => {
  try {
    const { data, error } = await supabase
      .from("tabe_cad_carteira_log")
      .select("*")
      .eq("id_atividade", pep)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Erro ao buscar logs:", err);
    return [];
  }
};

// ==========================================
// 3. UPDATE / EDITAR
// ==========================================
export const atualizarLogCarimbo = async (supabase, idLog, novosDados, getNomeUsuarioLogado, callbackSucesso) => {
  try {
    const usuarioLogado = getNomeUsuarioLogado();
    const { error } = await supabase
      .from("tabe_cad_carteira_log")
      .update({
        ...novosDados,
        usu_cada: String(usuarioLogado)
      })
      .eq("id", idLog);

    if (error) throw error;

    Swal.fire("Sucesso!", "Registro atualizado com sucesso.", "success");
    if (typeof callbackSucesso === "function") callbackSucesso();
  } catch (err) {
    Swal.fire("Erro", "Não foi possível atualizar: " + err.message, "error");
  }
};

// ==========================================
// 4. DELETE / EXCLUIR
// ==========================================
export const excluirLogCarimbo = async (supabase, idLog, callbackSucesso) => {
  const confirmacao = await Swal.fire({
    title: "Tem certeza?",
    text: "Esta ação excluirá este log permanentemente.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626"
  });

  if (confirmacao.isConfirmed) {
    try {
      const { error } = await supabase
        .from("tabe_cad_carteira_log")
        .delete()
        .eq("id", idLog);

      if (error) throw error;

      Swal.fire("Excluído!", "O registro foi removido.", "success");
      if (typeof callbackSucesso === "function") callbackSucesso();
    } catch (err) {
      Swal.fire("Erro", "Não foi possível excluir: " + err.message, "error");
    }
  }
};