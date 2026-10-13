// src/pages/database/dadosExternos/baseservicos.jsx
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import DataTable from "../../../models/DataTable";
import { FileText, ChevronLeft, ChevronRight, Printer, Download } from "lucide-react";

export async function abrirModalServicosConsolidados({
    linhasSelecionadasIds,
    registros,
    supabase,
    Swal,
    swalDefault,
    corTheme,
    userIdKey = "geral",
    onLimparSelecao
}) {
    if (!linhasSelecionadasIds || linhasSelecionadasIds.length === 0) {
        Swal.fire("Atenção", "Selecione ao menos um registro na tabela para visualizar os dados consolidados.", "warning");
        return;
    }

    let nomeUsuarioLogado = "Usuário";
    try {
        const usuarioStorage = JSON.parse(localStorage.getItem("usuario_logado"));
        if (usuarioStorage && usuarioStorage.nome) {
            nomeUsuarioLogado = usuarioStorage.nome;
        }
    } catch (e) {
        console.error("Erro ao ler usuário do localStorage:", e);
    }

    const notasSet = new Set();

    linhasSelecionadasIds.forEach(idAlvo => {
        let objSelecionado = registros.find(r => String(r.id) === String(idAlvo));

        if (!objSelecionado && String(idAlvo).startsWith("row-")) {
        const indice = parseInt(String(idAlvo).replace("row-", ""), 10);
        if (!isNaN(indice) && registros[indice]) {
            objSelecionado = registros[indice];
        }
        }

        if (objSelecionado?.nota) {
        notasSet.add(String(objSelecionado.nota).trim());
        }
    });

    if (notasSet.size === 0 && registros.length > 0) {
        const primeiroObj = registros[0];
        if (primeiroObj?.nota) {
        notasSet.add(String(primeiroObj.nota).trim());
        }
    }

    const notasAlvo = Array.from(notasSet);

    if (notasAlvo.length === 0) {
        Swal.fire("Atenção", "Nenhum dos registros selecionados possui uma nota associada na coluna 'nota'.", "warning");
        return;
    }

    Swal.fire({
        title: "Carregando...",
        text: `Buscando serviços para ${notasAlvo.length} nota(s)...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const { data, error } = await supabase
        .from("view_consolidado_servicos")
        .select("*")
        .in("nota", notasAlvo);

        if (error) throw error;

        if (!data || data.length === 0) {
        Swal.fire("Atenção", "Nenhum registro encontrado na view para as notas informadas.", "info");
        return;
        }

        const formatarMoeda = valor => {
        const num = Number(valor) || 0;
        return num.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
        };

        const somaGeral = data.reduce((acc, row) => {
        acc.prev += Number(row.valor_prev || row.VALOR_PREV) || 0;
        acc.prod += Number(row.valor_prod || row.VALOR_PROD) || 0;
        acc.medi += Number(row.valor_medi || row.VALOR_MEDI) || 0;
        acc.fatu += Number(row.valor_fatu || row.VALOR_FATU) || 0;
        return acc;
        }, { prev: 0, prod: 0, medi: 0, fatu: 0 });

        const dadosPorNota = {};
        const metadadosNota = {};

        data.forEach(row => {
        const nota = String(row.nota || "Geral").trim();

        if (!dadosPorNota[nota]) {
            dadosPorNota[nota] = [];
            metadadosNota[nota] = {
            pep: row.pep || "N/D",
            status: row.status || "N/D",
            soma: { prev: 0, prod: 0, medi: 0, fatu: 0 }
            };
        }

        const vPrev = Number(row.valor_prev || row.VALOR_PREV) || 0;
        const vProd = Number(row.valor_prod || row.VALOR_PROD) || 0;
        const vMedi = Number(row.valor_medi || row.VALOR_MEDI) || 0;
        const vFatu = Number(row.valor_fatu || row.VALOR_FATU) || 0;

        metadadosNota[nota].soma.prev += vPrev;
        metadadosNota[nota].soma.prod += vProd;
        metadadosNota[nota].soma.medi += vMedi;
        metadadosNota[nota].soma.fatu += vFatu;

        const rowFormatada = { ...row };
        const codServ = rowFormatada.cod_servico || rowFormatada.COD_SERVICO;

        if (codServ) {
            rowFormatada._cod_servico_tooltip = String(codServ);
        }

        dadosPorNota[nota].push(rowFormatada);
        });

        const notasEncontradas = Object.keys(dadosPorNota);

        const selecionarNotaRelatorio = async () => {
            if (notasEncontradas.length === 1) {
                return notasEncontradas[0];
            }

            const containerModal = Swal.getPopup();
            if (!containerModal) return null;

            let seletorExistente = document.getElementById("modal-seletor-notas-overlay");
            if (seletorExistente) seletorExistente.remove();

            const overlaySelecao = document.createElement("div");
            overlaySelecao.id = "modal-seletor-notas-overlay";
            overlaySelecao.style.cssText = `
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: transparent; display: flex; justify-content: center;
                align-items: center; z-index: 99999; padding: 20px; box-sizing: border-box;
            `;

            const optionsHtml = `
                <option value="geral">Todas as Notas</option>
                ${notasEncontradas.map(n => `<option value="${n}">Nota: ${n}</option>`).join("")}
            `;

            overlaySelecao.innerHTML = `
                <div style="background: #fff; padding: 24px; border-radius: 10px; width: 100%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); border: 1px solid #cbd5e1; text-align: center; box-sizing: border-box;">
                    <h3 style="margin: 0 0 10px; font-size: 1.1rem; color: #0f172a; font-weight: 700;">Selecionar Notas</h3>
                    <p style="margin: 0 0 16px; font-size: 0.85rem; color: #64748b;">Deseja incluir todas as notas ou uma específica?</p>
                    <select id="select-escolha-nota-relatorio" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; margin-bottom: 20px; outline: none; background: #f8fafc;">
                        ${optionsHtml}
                    </select>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="btn-cancelar-relatorio-overlay" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Cancelar</button>
                        <button id="btn-confirmar-relatorio-overlay" style="padding: 8px 16px; background: ${corTheme}; border: none; color: #fff; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Continuar</button>
                    </div>
                </div>
            `;

            containerModal.style.position = "relative";
            containerModal.appendChild(overlaySelecao);

            const escolhaSelecao = await new Promise((resolve) => {
                document.getElementById("btn-confirmar-relatorio-overlay").onclick = () => {
                    const val = document.getElementById("select-escolha-nota-relatorio").value;
                    overlaySelecao.remove();
                    resolve(val);
                };
                document.getElementById("btn-cancelar-relatorio-overlay").onclick = () => {
                    overlaySelecao.remove();
                    resolve(null);
                };
            });

            return escolhaSelecao;
        };

        // ============================================================
        // EMISSÃO DO RELATÓRIO (IMPRESSÃO COM PAGINAÇÃO INDEPENDENTE POR NOTA)
        // ============================================================
        window.__emitirRelatorioServicos = async () => {
            const tipoRelatorio = await selecionarNotaRelatorio();
            if (!tipoRelatorio) return;

            const notasParaImprimir = tipoRelatorio === "geral" ? notasEncontradas : [tipoRelatorio];
            const dataAtualFormatada = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });

            const escaparHtml = valor =>
                String(valor ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");

            const conteudoTabelasHtml = notasParaImprimir.map((nota, i) => {
                const meta = metadadosNota[nota];
                const registrosNota = dadosPorNota[nota];

                if (!meta || !registrosNota?.length) return "";

                const s = meta.soma;

                const colunas = Object.keys(registrosNota[0] || {}).filter(col => {
                const c = col.toLowerCase();
                return c !== "pep" &&
                    c !== "status" &&
                    c !== "_cod_servico_tooltip";
                });

                const linhasHtml = registrosNota.map(reg => `
                <tr>
                    ${colunas.map(col =>
                    `<td>${escaparHtml(reg[col])}</td>`
                    ).join("")}
                </tr>
                `).join("");

                const cabecalhoColunasHtml = colunas
                .map(col => `<th>${escaparHtml(col.toUpperCase())}</th>`)
                .join("");

                return `
                <div class="bloco-nota-pagina" style="${i > 0 ? 'page-break-before: always; break-before: page;' : ''}">
                    <table class="tabela-relatorio">
                        <thead>
                            <tr class="linha-cabecalho-institucional">
                                <td colspan="${colunas.length}">
                                    <div class="caixa-cabecalho-padrao">
                                        <div class="empresa-titulo">Dínamo Engenhari LTDA.</div>
                                        <div class="gerencia-titulo">Gerência de Obras e Manutenção - Filial Belém/PA</div>
                                        <div class="relatorio-titulo">Relatório Consolidado de Serviços</div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="${colunas.length}" style="padding: 0; border: none; height: 10px;"></td>
                            </tr>
                            <tr class="linha-meta-nota">
                                <td colspan="${colunas.length}">
                                    <b>Nota:</b> ${escaparHtml(nota)} &nbsp;|&nbsp;
                                    <b>PEP:</b> ${escaparHtml(meta.pep)} &nbsp;|&nbsp;
                                    <b>Status:</b> ${escaparHtml(meta.status)} &nbsp;|&nbsp;
                                    <b>Registros:</b> ${registrosNota.length}
                                </td>
                            </tr>
                            <tr class="linha-resumo-financeiro">
                                <td colspan="${colunas.length}">
                                    <div class="resumo-box">
                                        <div class="resumo-titulo">Resumo Financeiro — Nota ${escaparHtml(nota)}</div>
                                        <div>Previsto: <b>${formatarMoeda(s.prev)}</b></div>
                                        <div>Produzido: <b class="valor-produzido">${formatarMoeda(s.prod)}</b></div>
                                        <div>Medido: <b class="valor-medido">${formatarMoeda(s.medi)}</b></div>
                                        <div>Faturado: <b class="valor-faturado">${formatarMoeda(s.fatu)}</b></div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="${colunas.length}" style="padding: 0; border: none; height: 6px;"></td>
                            </tr>
                            <tr>${cabecalhoColunasHtml}</tr>
                        </thead>
                        <tbody>
                            ${linhasHtml}
                        </tbody>
                    </table>
                </div>
                `;
            }).join("");

            const janelaRelatorio = window.open("", "_blank");

            if (!janelaRelatorio) {
                Swal.fire(
                "Atenção",
                "O navegador bloqueou a janela do relatório. Permita pop-ups para este sistema e tente novamente.",
                "warning"
                );
                return;
            }

            janelaRelatorio.document.open();

            janelaRelatorio.document.write(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Relatório Consolidado de Serviços</title>

                    <style>
                    * { box-sizing: border-box; }
                    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; padding: 20px; margin: 0; font-size: 11px; background-color: #ffffff; }
                    
                    .tabela-relatorio { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 30px; }
                    .tabela-relatorio th, .tabela-relatorio td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; }
                    .tabela-relatorio th { background: #e2e8f0; color: #0f172a; font-weight: bold; text-transform: uppercase; }
                    
                    .linha-cabecalho-institucional td { border: none !important; padding: 0 0 10px 0 !important; background: transparent !important; }
                    .caixa-cabecalho-padrao {
                        width: 100%;
                        background-color: #f8fafc;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                        padding: 12px 16px;
                        text-align: center;
                    }
                    .empresa-titulo { font-size: 16px; font-weight: bold; color: #0f172a; line-height: 1.3; }
                    .gerencia-titulo { font-size: 16px; font-weight: bold; color: #0f172a; line-height: 1.3; }
                    .relatorio-titulo { font-size: 14px; font-weight: bold; color: #475569; margin-top: 4px; padding-top: 6px; border-top: 1px solid #e2e8f0; }

                    .linha-meta-nota td { background: #0f172a !important; color: #fff !important; font-size: 10px; padding: 8px 10px !important; border-radius: 4px 4px 0 0; border: none !important; }
                    .linha-resumo-financeiro td { padding: 0 !important; border: none !important; }
                    
                    .resumo-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-top: none; padding: 8px 10px; margin-bottom: 10px; display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 9px; }
                    .resumo-titulo { width: 100%; font-weight: bold; color: #0f172a; margin-bottom: 4px; }

                    .botoes-relatorio { margin: 25px 0; display: flex; justify-content: center; }
                    .botoes-relatorio button { background: ${corTheme}; color: #fff; border: none; padding: 10px 20px; font-size: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                    
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 15mm 15mm 15mm 15mm;
                            @bottom-left {
                                content: "Usuário: ${escaparHtml(nomeUsuarioLogado)} | Data: ${dataAtualFormatada}";
                                font-family: Arial, sans-serif;
                                font-size: 9px;
                                color: #64748b;
                                padding-top: 8px;
                                border-top: 1px solid #cbd5e1;
                            }
                            @bottom-right {
                                content: "Página " counter(page) " de " counter(pages);
                                font-family: Arial, sans-serif;
                                font-size: 9px;
                                color: #64748b;
                                padding-top: 8px;
                                border-top: 1px solid #cbd5e1;
                            }
                        }

                        body { margin: 0 !important; padding: 0 !important; font-size: 9px; background: #fff !important; }
                        .no-print, .botoes-relatorio { display: none !important; }
                        
                        /* Isola a contagem de páginas por cada bloco de nota (Página X de Y reiniciando por nota) */
                        .bloco-nota-pagina {
                            page: notaPage;
                            page-break-before: always;
                            break-before: page;
                        }
                        .bloco-nota-pagina:first-of-type {
                            page-break-before: avoid;
                            break-before: avoid;
                        }

                        @page notaPage {
                            size: A4 portrait;
                            margin: 15mm 15mm 15mm 15mm;
                            counter-reset: page 1;
                        }

                        .tabela-relatorio thead { display: table-header-group; }
                        .tabela-relatorio tr { page-break-inside: avoid; break-inside: avoid; }
                    }
                    </style>
                </head>
                <body>
                    <main>${conteudoTabelasHtml}</main>

                    <div class="botoes-relatorio no-print">
                        <button onclick="window.print()">Imprimir / Salvar PDF</button>
                    </div>
                </body>
                </html>
            `);
            janelaRelatorio.document.close();
        };

        // ============================================================
        // EXPORTAÇÃO DE RELATÓRIO EM FORMATO XLS COM VÍRGULA DECIMAL E SEM AVISO DO EXCEL
        // ============================================================
        window.__exportarRelatorioServicos = async () => {
            const tipoRelatorio = await selecionarNotaRelatorio();
            if (!tipoRelatorio) return;

            const notasParaExportar = tipoRelatorio === "geral" ? notasEncontradas : [tipoRelatorio];

            let todosRegistrosExportacao = [];
            notasParaExportar.forEach(nota => {
                const regs = dadosPorNota[nota] || [];
                regs.forEach(r => {
                    todosRegistrosExportacao.push({
                        ...r,
                        nota: r.nota || nota
                    });
                });
            });

            if (todosRegistrosExportacao.length === 0) {
                Swal.fire("Atenção", "Nenhum dado para exportar.", "warning");
                return;
            }

            const chaves = Object.keys(todosRegistrosExportacao[0]).filter(c => 
                c !== "pep" && c !== "status" && c !== "_cod_servico_tooltip"
            );

            let htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>`;
            htmlContent += `<table border="1">`;
            
            htmlContent += `<tr>`;
            chaves.forEach(col => {
                htmlContent += `<th>${col.toUpperCase()}</th>`;
            });
            htmlContent += `</tr>`;

            todosRegistrosExportacao.forEach(row => {
                htmlContent += `<tr>`;
                chaves.forEach(col => {
                    let val = row[col] ?? "";

                    // Substituir ponto por vírgula em valores numéricos/decimais
                    if (typeof val === "number") {
                        val = String(val).replace(".", ",");
                    } else if (typeof val === "string" && /^-?\d+(\.\d+)?$/.test(val)) {
                        val = val.replace(".", ",");
                    }

                    const escaparHtml = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    htmlContent += `<td>${escaparHtml(val)}</td>`;
                });
                htmlContent += `</tr>`;
            });

            htmlContent += `</table></body></html>`;

            const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `relatorio_servicos_${tipoRelatorio}_${new Date().toISOString().slice(0, 10)}.xls`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        Swal.fire({
        ...swalDefault,
        width: "1250px",
        didOpen: () => {
            const popup = Swal.getPopup();
            if (popup) {
                popup.style.width = "1250px";
                popup.style.maxHeight = "85vh";
                popup.style.display = "flex";
                popup.style.flexDirection = "column";
                popup.style.overflow = "hidden";
                popup.style.boxSizing = "border-box";
            }
        },
        didClose: () => {
            if (typeof onLimparSelecao === "function") {
                onLimparSelecao();
            } else {
                const checkboxes = document.querySelectorAll("input[type='checkbox'][data-table-checkbox]");
                checkboxes.forEach(cb => { cb.checked = false; });
                window.__linhasSelecionadasIds = [];
            }
        },
        html: `
            <style>
            #swal-cursor-tooltip {
                position: fixed; display: none; background: #0f172a; color: #f8fafc;
                padding: 5px 10px; font-size: 0.75rem; font-weight: 500; border-radius: 6px;
                pointer-events: none; z-index: 999999; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); white-space: nowrap;
            }
            .servico-celula-hover { cursor: default; }
            .btn-relatorio-geral:hover, .btn-exportar-geral:hover { opacity: 0.9; }
            .btn-navegacao-nota { background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px; }
            .btn-navegacao-nota:hover:not(:disabled) { background: #e2e8f0; }
            .btn-navegacao-nota:disabled { opacity: 0.4; cursor: not-allowed; }
            </style>

            <div id="swal-cursor-tooltip"></div>

            <div id="modal-principal-container" style="padding:0; width:100%; height:100%; max-height:78vh; box-sizing:border-box; display:flex; flex-direction:column; overflow:hidden;">
                <!-- Cabeçalho Principal -->
                <div id="modal-header-principal" class="modal-header-pro" style="flex-direction:column; align-items:stretch; gap:8px; padding:8px 0; border:none; flex-shrink:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div class="modal-header-left" style="display:flex; align-items:center; gap:10px;">
                            <div class="modal-icon-box">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                            </div>
                            <div>
                                <h2 style="margin:0; font-size:1.1rem; font-weight:700; color:#0f172a; line-height:1.2;">
                                    Serviços Consolidados por Registro
                                </h2>
                                <p style="margin:2px 0 0; font-size:0.78rem; color:#64748b;">
                                    Total de tabelas geradas: <b>${notasEncontradas.length}</b>
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Barra de Navegação condicional e Botões de Ação -->
                    <div style="width:100%; box-sizing:border-box; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; flex-shrink:0;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${notasEncontradas.length > 1 ? `
                                <button id="btn-nota-anterior" class="btn-navegacao-nota" onclick="window.__mudarNota(-1)">Anterior</button>
                                <button id="btn-nota-proxima" class="btn-navegacao-nota" onclick="window.__mudarNota(1)">Próxima</button>
                                <span style="font-size:0.78rem; font-weight:600; color:#334155; margin:0 4px;"></span>
                            ` : ''}
                        </div>

                        <div style="display:flex; align-items:center; gap:8px;">
                            <!-- Botão de Imprimir (Apenas Ícone) -->
                            <button
                                onclick="window.__emitirRelatorioServicos()"
                                class="btn-relatorio-geral"
                                title="Emitir Relatório / Imprimir"
                                style="background:${corTheme}; color:#fff; border:none; padding:6px 10px; font-size:0.78rem; font-weight:600; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                    <rect x="6" y="14" width="12" height="8"></rect>
                                </svg>
                            </button>

                            <!-- Botão de Exportar Relatório XLS (Apenas Ícone) -->
                            <button
                                onclick="window.__exportarRelatorioServicos()"
                                class="btn-exportar-geral"
                                title="Exportar Relatório (Excel .xls)"
                                style="background:${corTheme}; color:#fff; border:none; padding:6px 10px; font-size:0.78rem; font-weight:600; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Cabeçalho de Informações da Nota Ativa -->
                    <div id="indicator-cabecalho-nota" style="background:#0f172a; color:#fff; padding:6px 12px; font-size:0.78rem; border-radius:6px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                        <!-- Preenchido dinamicamente -->
                    </div>

                    <!-- Div de Totais Gerais -->
                    <div id="modal-soma-geral" style="width:100%; box-sizing:border-box; background:#f1f5f9; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <span style="font-size:0.78rem; font-weight:700; color:#1e293b; text-transform:uppercase;">
                            Soma Total Geral:
                        </span>

                        <div style="display:flex; gap:14px; font-size:0.78rem; flex-wrap:wrap;">
                            <span>Prev: <b style="color:${corTheme};">${formatarMoeda(somaGeral.prev)}</b></span>
                            <span>Prod: <b style="color:#10b981;">${formatarMoeda(somaGeral.prod)}</b></span>
                            <span>Medi: <b style="color:#0284c7;">${formatarMoeda(somaGeral.medi)}</b></span>
                            <span>Fatu: <b style="color:#6366f1;">${formatarMoeda(somaGeral.fatu)}</b></span>
                        </div>
                    </div>
                </div>

                <!-- Corpo Onde a Tabela Ativa É Renderizada -->
                <div id="modal-corpo-tabela-unica" style="flex:1; min-height: 280px; overflow:hidden; background:transparent; display:flex; flex-direction:column; width:100%; box-sizing:border-box; margin-top:4px;">
                    <!-- Renderizado dinamicamente -->
                </div>
            </div>
        `,
        showConfirmButton: false,

        didOpen: () => {
            if (swalDefault.didOpen) swalDefault.didOpen();

            let indiceAtual = 0;
            window.__notaAtual = notasEncontradas[0];

            const atualizarVisualizacaoNota = () => {
                const notaDada = notasEncontradas[indiceAtual];
                window.__notaAtual = notaDada;
                const meta = metadadosNota[notaDada];
                const registrosNota = dadosPorNota[notaDada];

                const cabecalhoNotaEl = document.getElementById("indicator-cabecalho-nota");
                if (cabecalhoNotaEl) {
                    cabecalhoNotaEl.innerHTML = `
                        <span><b>Nota:</b> ${notaDada}</span>
                        <span>&nbsp;|&nbsp;</span>
                        <span><b>PEP:</b> ${meta.pep}</span>
                        <span>&nbsp;|&nbsp;</span>
                        <span><b>Status:</b> ${meta.status}</span>
                    `;
                }

                const indicadorEl = document.getElementById("indicator-nota-atual");
                if (indicadorEl) {
                    indicadorEl.textContent = `Nota ${notaDada} (${indiceAtual + 1} de ${notasEncontradas.length})`;
                }

                const regEl = document.getElementById("indicator-registros-nota");
                if (regEl) {
                    regEl.textContent = `${registrosNota.length} reg(s)`;
                }

                const btnAnt = document.getElementById("btn-nota-anterior");
                const btnProx = document.getElementById("btn-nota-proxima");
                if (btnAnt) btnAnt.disabled = indiceAtual === 0;
                if (btnProx) btnProx.disabled = indiceAtual === notasEncontradas.length - 1;

                const corpoEl = document.getElementById("modal-corpo-tabela-unica");
                if (!corpoEl) return;
                corpoEl.innerHTML = "";

                const subDiv = document.createElement("div");
                subDiv.style.width = "100%";
                subDiv.style.height = "100%";
                subDiv.style.display = "flex";
                subDiv.style.flexDirection = "column";
                subDiv.style.overflow = "hidden";
                corpoEl.appendChild(subDiv);

                const colunasIniciais = Object.keys(registrosNota[0] || {}).filter(col => {
                    const colLower = col.toLowerCase();
                    return colLower !== "pep" && 
                           colLower !== "status" && 
                           colLower !== "cod_servico" && 
                           colLower !== "_cod_servico_tooltip" && 
                           colLower !== "nota";
                });

                const root = ReactDOM.createRoot(subDiv);

                const DataTableWrapper = () => {
                    const [dadosTabela, setDadosTabela] = useState(registrosNota);
                    const [ordenacaoTabela, setOrdenacaoTabela] = useState({ coluna: null, asc: true });

                    return (
                        <DataTable
                            data={dadosTabela}
                            totalBanco={dadosTabela.length}
                            paginaAtual={1}
                            registrosPorPagina={10}
                            onPageChange={() => {}}
                            onLimitChange={() => {}}
                            onFilterChange={() => {}}
                            ordenacaoExterna={ordenacaoTabela}
                            onSortChange={(novaOrd) => {
                                setOrdenacaoTabela(novaOrd);
                                if (novaOrd && novaOrd.coluna) {
                                    const sorted = [...dadosTabela].sort((a, b) => {
                                        let valA = a[novaOrd.coluna] ?? "";
                                        let valB = b[novaOrd.coluna] ?? "";
                                        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
                                            valA = Number(valA); valB = Number(valB);
                                        } else {
                                            valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase();
                                        }
                                        if (valA < valB) return novaOrd.asc ? -1 : 1;
                                        if (valA > valB) return novaOrd.asc ? 1 : -1;
                                        return 0;
                                    });
                                    setDadosTabela(sorted);
                                }
                            }}
                            onFetchColumnOptions={async () => []}
                            tableId={`tabelas_dados_servicos_nota_${notaDada}_${userIdKey}`}
                            colunasIniciais={colunasIniciais}
                        />
                    );
                };

                root.render(<DataTableWrapper />);

                setTimeout(() => {
                    const tooltipEl = document.getElementById("swal-cursor-tooltip");
                    if (!tooltipEl) return;
                    const linhasTabela = subDiv.querySelectorAll("tbody tr");
                    linhasTabela.forEach((tr, rowIndex) => {
                        const reg = registrosNota[rowIndex];
                        if (!reg || !reg._cod_servico_tooltip) return;
                        const celulas = tr.querySelectorAll("td");
                        celulas.forEach(td => {
                            const textoCel = td.textContent.trim();
                            const textoServico = String(reg.servico || reg.SERVICO || "").trim();
                            if (textoCel !== textoServico) return;
                            td.classList.add("servico-celula-hover");
                            td.addEventListener("mouseenter", () => {
                                tooltipEl.textContent = `Cód: ${reg._cod_servico_tooltip}`;
                                tooltipEl.style.display = "block";
                            });
                            td.addEventListener("mousemove", e => {
                                tooltipEl.style.left = `${e.clientX + 12}px`;
                                tooltipEl.style.top = `${e.clientY + 12}px`;
                            });
                            td.addEventListener("mouseleave", () => {
                                tooltipEl.style.display = "none";
                            });
                        });
                    });
                }, 300);
            };

            window.__mudarNota = (direcao) => {
                const novoIndice = indiceAtual + direcao;
                if (novoIndice >= 0 && novoIndice < notasEncontradas.length) {
                    indiceAtual = novoIndice;
                    atualizarVisualizacaoNota();
                }
            };

            atualizarVisualizacaoNota();
        }
        });

    } catch (err) {
        Swal.fire(
        "Erro",
        "Não foi possível carregar os dados consolidados: " + err.message,
        "error"
        );
    }
}