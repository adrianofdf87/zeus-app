import { supabase } from "../../services/supabase";
import Swal from "sweetalert2";

/* ==========================================================================
   MODAL DE NOVA/EDITAR ATIVIDADE - novaAtividade.js
   ========================================================================== */

export async function abrirModalAtividade(idAtividade = null, onSucesso = null) {
    const isEdit = !!idAtividade;
    const headerBgColor = isEdit ? '#005596' : '#10b981';
    const headerTitle = isEdit ? 'Editar Atividade' : 'Adicionar Atividade';
    const headerText = isEdit ? 'Atualize as informações da atividade.' : 'Cadastre uma nova atividade na tabela.';

    const svgIcon = isEdit 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

    const formHtml = `
        <div class="custom-modal-header">
            <div class="header-icon" style="background-color:${headerBgColor};">${svgIcon}</div>
            <div class="header-text"><h2>${headerTitle}</h2><p>${headerText}</p></div>
        </div>
        <div id="formNovaAtividade" class="atividade-form-container" translate="no">
            <!-- Linha 1 (3 campos): aviso, filial, contratante -->
            <div class="form-row-3">
                <div class="form-group"><label>Aviso (Data) <span class="req">*</span></label><input type="date" id="form_aviso" class="form-control" ${isEdit ? 'readonly' : ''}></div>
                <div class="form-group"><label>Filial <span class="req">*</span></label><select id="form_filial" class="form-control select2-init" ${isEdit ? 'disabled' : ''}></select></div>
                <div class="form-group"><label>Contratante <span class="req">*</span></label><select id="form_contratante" class="form-control select2-init" ${isEdit ? 'disabled' : ''}></select></div>
            </div>

            <!-- Linha 2 (3 campos): tipo de custo, tipo de rastreio, Id rastreio -->
            <div class="form-row-3">
                <div class="form-group"><label>Tipo de Custo <span class="req">*</span></label><select id="form_tipo_custo" class="form-control select2-init"><option value="">Selecione...</option><option value="INVESTIMENTO">INVESTIMENTO</option><option value="CUSTEIO">CUSTEIO</option></select></div>
                <div class="form-group"><label>Tipo de Rastreio <span class="req">*</span></label><select id="form_tipo_rastreio" class="form-control select2-init"></select></div>
                <div class="form-group"><label>ID Rastreio <span class="req">*</span></label><input type="text" id="form_id_rastreio" class="form-control"></div>
            </div>

            <!-- Linha 3 (3 campos): area, tipo atividade, prioridade -->
            <div class="form-row-3">
                <div class="form-group"><label>Área (Processo) <span class="req">*</span></label><select id="form_area" class="form-control select2-init"></select></div>
                <div class="form-group"><label>Tipo de Atividade <span class="req">*</span></label><select id="form_tipo_atividade" class="form-control select2-init"></select></div>
                <div class="form-group"><label>Prioridade <span class="req">*</span></label><select id="form_prioridade" class="form-control select2-init"></select></div>
            </div>

            <!-- Linha 4 (Proporção 1 para 2) -->
            <div class="form-row-custom-4">
                <div class="form-group"><label id="label_vinculo_pagamento">Vínculo de Pagamento</label><input type="text" id="form_vinculo_pagamento" class="form-control"></div>
                <div class="form-group"><label>Descrição Breve <span class="req">*</span></label><input type="text" id="form_descricao_breve" class="form-control"></div>
            </div>

            <!-- Linha 5 (2 campos iguais preenchendo 100%) -->
            <div class="form-row-2">
                <div class="form-group"><label>Município <span class="req">*</span></label><select id="form_municipio" class="form-control select2-init"></select></div>
                <div class="form-group"><label>Seccional <span class="req">*</span></label><input type="text" id="form_seccional" class="form-control" readonly placeholder="Automático"></div>
            </div>

            <!-- Linha 6 (3 campos) -->
            <div class="form-row-3">
                <div class="form-group"><label>Coord X (Latitude) <span class="req">*</span></label><input type="text" id="form_coord_x" class="form-control"></div>
                <div class="form-group"><label>Coord Y (Longitude) <span class="req">*</span></label><input type="text" id="form_coord_y" class="form-control"></div>
                <div class="form-group"><label>SEAL (Alimentador)</label><select id="form_seal" class="form-control select2-init"></select></div>
            </div>

            <!-- Linha 7 (2 campos iguais preenchendo 100%) -->
            <div class="form-row-2">
                <div class="form-group"><label>Solicitante <span class="req">*</span></label><select id="form_solicitante" class="form-control select2-init" ${isEdit ? 'disabled' : ''}></select></div>
                <div class="form-group"><label>Responsável Técnico <span class="req">*</span></label><select id="form_responsavel_tecnico" class="form-control select2-init"></select></div>
            </div>

            <!-- Linha 8 (3 campos) -->
            <div class="form-row-3">
                <div class="form-group"><label>Prazo (Data) <span class="req">*</span></label><input type="date" id="form_prazo" class="form-control" ${isEdit ? 'readonly' : ''}></div>
                <div class="form-group"><label>Carteira <span class="req">*</span></label><input type="month" id="form_prev_faturamento" class="form-control"></div>
                <div class="form-group"><label>Status <span class="req">*</span></label><select id="form_status" class="form-control select2-init"></select></div>
            </div>
            
            <!-- Botões -->
            <div class="form-group modal-buttons-container">
                <button type="button" id="btnCancelarModal" class="btn-cancelar-custom">Cancelar</button>
                <button type="button" id="btnSalvarModal" class="btn-salvar-custom">Salvar</button>
            </div>
        </div>
        <style>
            .swal2-title{display:none!important}
            .swal2-html-container{margin:0!important;overflow:hidden!important}
            .swal2-popup{padding:16px 20px 12px!important;border-radius:10px!important}
            .custom-modal-header{background:#f8fafc;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,.02)}
            .header-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center}
            .header-text{text-align:left}
            .header-text h2{margin:0;font-size:1.05rem;font-weight:700;color:#0f172a}
            .header-text p{margin:0;font-size:.75rem;color:#64748b}

            .atividade-form-container{display:flex;flex-direction:column;gap:8px;text-align:left}
            
            /* Tipos de linhas com grids independentes */
            .form-row-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%}
            .form-row-2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;width:100%}
            .form-row-custom-4{display:grid;grid-template-columns:1fr 2fr;gap:12px;width:100%}

            .form-group{display:flex;flex-direction:column;width:100%}
            .form-group label{font-size:.75rem;font-weight:600;color:#334155;margin-bottom:2px}
            .req{color:#dc2626;margin-left:2px}
            .form-control{width:100%;height:28px;padding:2px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:.8rem;background:#fff;color:#1e293b;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}
            .form-control:focus{outline:none;border-color:#005696;box-shadow:0 0 0 1px #005696}
            .form-control[readonly],.form-control:disabled{background:#f1f5f9;color:#64748b;cursor:not-allowed}
            .campo-obrigatorio-erro{border-color:#dc2626!important;box-shadow:0 0 0 1px rgba(220,38,38,.12)!important}
            .select2-selection.campo-obrigatorio-erro{border-color:#dc2626!important;box-shadow:0 0 0 1px rgba(220,38,38,.12)!important}
            .select2-container{width:100%!important;z-index:99999!important}
            .select2-container .select2-selection--single{height:28px!important;border:1px solid #cbd5e1!important;border-radius:4px!important;display:flex;align-items:center}
            .select2-container--default .select2-selection--single .select2-selection__arrow{height:26px!important;top:1px!important}
            .select2-container--default .select2-selection--single .select2-selection__rendered{padding-left:8px;font-size:.8rem;line-height:26px!important}
            .select2-container--default.select2-container--focus .select2-selection--single{border-color:#005696!important;box-shadow:0 0 0 1px #005696!important}
            
            .swal2-actions { display: none !important; }
            .modal-buttons-container {
                display: flex !important;
                flex-direction: row !important;
                justify-content: flex-end !important;
                gap: 8px !important;
                margin-top: 14px !important;
          }
          .btn-salvar-custom {
              background-color: #005696 !important;
              color: #fff !important;
              border: none !important;
              padding: 6px 16px !important;
              min-width: 100px !important;
              border-radius: 4px !important;
              font-size: .85rem !important;
              font-weight: 600 !important;
              cursor: pointer !important;
          }
          .btn-cancelar-custom {
              background-color: #e2e8f0 !important;
              color: #0f172a !important;
              border: none !important;
              padding: 6px 16px !important;
              min-width: 100px !important;
              border-radius: 4px !important;
              font-size: .85rem !important;
              font-weight: 600 !important;
              cursor: pointer !important;
          }
      </style>
    `;

    Swal.fire({
        html: formHtml,
        width: '900px',
        showCancelButton: false,
        showConfirmButton: false,
        didOpen: async () => {
            if (window.jQuery?.fn?.select2) {
                window.jQuery('.select2-init').select2({ dropdownParent: window.jQuery('.swal2-popup') });
            }

            document.getElementById('btnCancelarModal')?.addEventListener('click', () => {
                Swal.close();
            });

            document.getElementById('btnSalvarModal')?.addEventListener('click', async () => {
                const validacao = validarCamposObrigatorios();

                // CORREÇÃO: Interrompe a execução se houver campos obrigatórios faltando
                if (!validacao.valido) {
                    return;
                }

                const dados = coletarDadosFormulario();

                try {
                    const duplicado = await verificarDuplicidadeRastreio(dados.tipo_rastreio, dados.id_rastreio, idAtividade);
                    if (duplicado) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Atenção',
                            text: 'Já existe uma atividade com o mesmo Tipo de Rastreio e ID Rastreio.',
                            confirmButtonColor: '#005696'
                        });
                        return;
                    }
                } catch (err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro',
                        text: err.message,
                        confirmButtonColor: '#005696'
                    });
                    return;
                }

                if (!isEdit) dados.status = 'CADASTRO';
                Swal.close();
                await salvarAtividade(dados, idAtividade, onSucesso);
            });

            const hoje = new Date();
            const yyyy = hoje.getFullYear();
            const mm = String(hoje.getMonth() + 1).padStart(2, '0');
            const dd = String(hoje.getDate()).padStart(2, '0');
            const dataAtual = `${yyyy}-${mm}-${dd}`;
            const mesAtual = `${yyyy}-${mm}`;

            const campoAviso = obterElemento('form_aviso');
            const campoPrazo = obterElemento('form_prazo');
            const campoPrevFat = obterElemento('form_prev_faturamento');

            if (campoAviso) {
                campoAviso.setAttribute('max', dataAtual); 
                campoAviso.addEventListener('change', function() {
                    removerErroCampo(this);
                    if (this.value && campoPrazo) {
                        campoPrazo.setAttribute('min', this.value); 
                        if (campoPrazo.value && campoPrazo.value < this.value) campoPrazo.value = ''; 
                    } else if (campoPrazo) {
                        campoPrazo.removeAttribute('min');
                    }
                });
            }

            if (campoPrevFat) campoPrevFat.setAttribute('min', mesAtual);

            const campoCoordX = obterElemento('form_coord_x');
            const campoCoordY = obterElemento('form_coord_y');
            
            if (campoCoordX) campoCoordX.addEventListener('blur', aoSairCampoCoordenada);
            if (campoCoordY) campoCoordY.addEventListener('blur', aoSairCampoCoordenada);

            const selectFilial = obterElemento('form_filial');
            const selectMunicipio = obterElemento('form_municipio');
            const selectTipoRastreio = obterElemento('form_tipo_rastreio');
            const campoIdRastreio = obterElemento('form_id_rastreio');
            const selectContratante = obterElemento('form_contratante');

            await carregarOpcoesSelect('tabi_apoio_contrato', 'filial', 'form_filial');
            await carregarOpcoesSelect('tabi_apoio_cliente', 'nome', 'form_responsavel_tecnico', 'DÍNAMO ENGENHARIA LTDA', 'empresa');

            selectFilial?.addEventListener('change', async function() {
                removerErroCampo(this);
                if (this.value) {
                    await atualizarCamposPorFilial(this.value);
                } else {
                    limparCamposDependentes();
                }
                if (!isEdit) await garantirStatusCadastrado();
            });

            selectContratante?.addEventListener('change', async function() {
                removerErroCampo(this);
                const contratante = this.value;
                const campoSolicitante = obterElemento('form_solicitante');
                if (campoSolicitante) {
                    campoSolicitante.innerHTML = '<option value="">Selecione...</option>';
                    removerErroCampo(campoSolicitante);
                }
                if (contratante) await carregarOpcoesSelect('tabi_apoio_cliente', 'nome', 'form_solicitante', contratante, 'empresa');
            });

            selectMunicipio?.addEventListener('change', async function() {
                removerErroCampo(this);
                const municipio = this.value;
                const filial = selectFilial?.value || '';
                const campoSeccional = obterElemento('form_seccional');
                if (!campoSeccional) return;

                campoSeccional.value = '';
                removerErroCampo(campoSeccional);
                if (!municipio) return;

                try {
                    let query = supabase.from('tabi_apoio_localidade').select('seccional').eq('localidade', municipio).limit(1);
                    if (filial) query = query.eq('filial', filial);
                    const { data, error } = await query.maybeSingle();
                    if (error) throw error;
                    
                    campoSeccional.value = data?.seccional || '';
                    if (campoSeccional.value) removerErroCampo(campoSeccional);
                } catch (err) { console.error('Erro ao carregar seccional:', err); }
            });

            selectTipoRastreio?.addEventListener('change', async function() {
                removerErroCampo(this);
            });

            campoIdRastreio?.addEventListener('input', async function() { 
                removerErroCampo(this); 
                if (!this.value.trim()) {
                    limparCamposDependentesRastreio();
                }
            });
            
            campoIdRastreio?.addEventListener('blur', async function() { 
                const valorId = this.value.trim();
                if (!valorId) {
                    limparCamposDependentesRastreio();
                    return;
                }
                await tratarTipoRastreioPEP(); 
                await buscarDadosPepLocal();
            });

            if (!isEdit) await garantirStatusCadastrado();

            if (isEdit) {
                Swal.showLoading();
                try {
                    const { data: atividade, error } = await supabase.from('tabe_cad_carteira').select('*').eq('id', idAtividade).single();
                    if (error) throw error;

                    if (atividade) {
                        preencherCampo('form_aviso', atividade.aviso);
                        if (atividade.aviso && campoPrazo) campoPrazo.setAttribute('min', atividade.aviso);

                        preencherCampo('form_id_rastreio', atividade.id_rastreio);
                        preencherCampo('form_coord_x', atividade.coord_x);
                        preencherCampo('form_coord_y', atividade.coord_y);
                        preencherCampo('form_prev_faturamento', atividade.carteira);
                        preencherCampo('form_prazo', atividade.prazo);
                        preencherCampo('form_seccional', atividade.seccional);

                        definirValorSelect('form_tipo_custo', atividade.tipo_custo);

                        if (atividade.filial && selectFilial) {
                            selectFilial.value = atividade.filial;
                            await atualizarCamposPorFilial(atividade.filial);

                            if (selectContratante) {
                                selectContratante.value = atividade.contratante || '';
                                if (window.jQuery?.fn?.select2) window.jQuery(selectContratante).trigger('change.select2');
                            }
                            if (atividade.contratante) await carregarOpcoesSelect('tabi_apoio_cliente', 'nome', 'form_solicitante', atividade.contratante, 'empresa');

                            definirValorSelect('form_municipio', atividade.municipio);
                            definirValorSelect('form_area', atividade.area);
                            definirValorSelect('form_tipo_atividade', atividade.tipo_atividade);
                            definirValorSelect('form_prioridade', atividade.prioridade);
                            definirValorSelect('form_tipo_rastreio', atividade.tipo_rastreio);
                            definirValorSelect('form_seal', atividade.seal);
                            definirValorSelect('form_solicitante', atividade.solicitante);
                            definirValorSelect('form_responsavel_tecnico', atividade.responsavel_tecnico);
                            definirValorSelect('form_status', atividade.status);

                            if (atividade.municipio && selectMunicipio) dispararChange(selectMunicipio);
                        }

                        setTimeout(async () => {
                            await tratarTipoRastreioPEP();
                            preencherCampo('form_vinculo_pagamento', atividade.vinculo_pagamento);
                            preencherCampo('form_descricao_breve', atividade.descricao_breve);
                        }, 200);

                        if (window.jQuery?.fn?.select2) {
                            window.jQuery('#form_filial, #form_contratante, #form_solicitante').prop('disabled', true).trigger('change.select2');
                        }
                    }
                } catch (err) {
                    Swal.fire('Erro', 'Não foi possível carregar a atividade: ' + err.message, 'error');
                } finally {
                    Swal.hideLoading();
                }
            }
        }
    });
}

/* ==========================================================================
   FUNÇÕES DE LIMPEZA DOS CAMPOS DEPENDENTES DO ID RASTREIO
   ========================================================================== */

function limparCamposDependentesRastreio() {
    preencherCampo('form_vinculo_pagamento', '');
    preencherCampo('form_descricao_breve', '');
    definirValorSelect('form_municipio', '');
    preencherCampo('form_seccional', '');
    preencherCampo('form_coord_x', '');
    preencherCampo('form_coord_y', '');

    const campoVinculo = obterElemento('form_vinculo_pagamento');
    const campoDescricao = obterElemento('form_descricao_breve');
    if (campoVinculo) campoVinculo.disabled = false;
    if (campoDescricao) campoDescricao.disabled = false;
}

/* ==========================================================================
   FUNÇÃO DE TRATAMENTO E BUSCA DA TABELA tabe_imp_pep (Vínculo e Descrição)
   ========================================================================== */

async function tratarTipoRastreioPEP() {
    const idRastreio = obterElemento('form_id_rastreio')?.value?.trim() || '';
    const campoVinculo = obterElemento('form_vinculo_pagamento');
    const campoDescricao = obterElemento('form_descricao_breve');

    if (!campoVinculo || !campoDescricao) return;

    if (!idRastreio) {
        limparCamposDependentesRastreio();
        return;
    }

    campoVinculo.value = 'Buscando...';
    campoDescricao.value = 'Buscando...';
    campoVinculo.disabled = true;
    campoDescricao.disabled = true;

    try {
        const { data, error } = await supabase
            .from('tabe_imp_pep')
            .select('nota, pep, descricao')
            .eq('nota', idRastreio)
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            const pepValor = data.pep ?? '';
            const descValor = data.descricao ?? '';

            campoVinculo.value = pepValor;
            campoDescricao.value = descValor;

            campoVinculo.disabled = String(pepValor).trim() !== '';
            campoDescricao.disabled = false; 
            
            if (campoVinculo.value) removerErroCampo(campoVinculo);
            if (campoDescricao.value) removerErroCampo(campoDescricao);
        } else {
            campoVinculo.value = '';
            campoDescricao.value = '';
            campoVinculo.disabled = false;
            campoDescricao.disabled = false;
        }
    } catch (err) {
        console.error('Falha ao consultar a tabela tabe_imp_pep:', err);
        campoVinculo.value = '';
        campoDescricao.value = '';
        campoVinculo.disabled = false;
        campoDescricao.disabled = false;
    }
}

/* ==========================================================================
   FUNÇÃO DE BUSCA DA TABELA tabe_imp_pep_local
   ========================================================================== */

async function buscarDadosPepLocal() {
    const idRastreio = obterElemento('form_id_rastreio')?.value?.trim() || '';
    if (!idRastreio) return;

    try {
        const { data, error } = await supabase
            .from('tabe_imp_pep_local')
            .select('municipio, latitude, longitude')
            .eq('nota', idRastreio)
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            if (data.municipio) {
                definirValorSelect('form_municipio', data.municipio);
                const selectMunicipio = obterElemento('form_municipio');
                if (selectMunicipio) dispararChange(selectMunicipio);
                removerErroCampo(selectMunicipio);
            }
            if (data.latitude) {
                preencherCampo('form_coord_x', data.latitude);
                removerErroCampo(obterElemento('form_coord_x'));
            }
            if (data.longitude) {
                preencherCampo('form_coord_y', data.longitude);
                removerErroCampo(obterElemento('form_coord_y'));
            }
            aoSairCampoCoordenada();
        }
    } catch (err) {
        console.error('Erro ao consultar a tabela tabe_imp_pep_local:', err);
    }
}

/* ==========================================================================
   FUNÇÃO DE VINCULAÇÃO DA LISTA TÉCNICA (tabe_imp_pep_lto)
   ========================================================================== */

async function vincularListaTecnicaPepLto(idAtividade, idRastreio, usuCad) {
    if (!idAtividade || !idRastreio) return;

    try {
        const { data: registrosLto, error: errBusca } = await supabase
            .from('tabe_imp_pep_lto')
            .select('id, nota')
            .eq('nota', idRastreio);

        if (errBusca) throw errBusca;

        if (Array.isArray(registrosLto) && registrosLto.length > 0) {
            const { error: errUpdate } = await supabase
                .from('tabe_imp_pep_lto')
                .update({ id_atividade: idAtividade })
                .eq('nota', idRastreio);

            if (errUpdate) throw errUpdate;

            const { error: errLog } = await supabase
                .from('tabe_cad_carteira_log')
                .insert([{
                    id_atividade: idAtividade,
                    acao: 'LISTA TECNICA PROJETADA',
                    descricao_acao: 'Lista Técnica do Projeto Inicial',
                    usu_cad: usuCad
                }]);

            if (errLog) console.error('Erro ao gravar log de Lista Técnica:', errLog);
        }
    } catch (err) {
        console.error('Erro ao processar a vinculação na tabela tabe_imp_pep_lto:', err);
    }
}

/* ==========================================================================
   GERAÇÃO DO PRÓXIMO ID (AJUSTADO PARA FORMATO SEM HÍFENS: YYYYMMXXXX)
   ========================================================================== */

async function gerarProximoIdAtividade() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const prefixo = `${ano}${mes}`;

    const { data, error } = await supabase
        .from('tabe_cad_carteira')
        .select('id')
        .like('id', `${prefixo}%`);

    if (error) {
        throw new Error('Não foi possível gerar o ID da atividade: ' + error.message);
    }

    let maior = 0;

    (data || []).forEach(registro => {
        const valorId = String(registro.id || '');
        const parteSeq = valorId.replace(prefixo, '');
        const numero = parseInt(parteSeq, 10);
        if (Number.isFinite(numero) && numero > maior) {
            maior = numero;
        }
    });

    const proximo = maior + 1;
    if (proximo > 9999) {
        throw new Error(`O limite de 9.999 registros para ${prefixo} foi atingido.`);
    }

    return `${prefixo}${String(proximo).padStart(4, '0')}`;
}

/* ==========================================================================
   FUNÇÕES DE CONVERSÃO E FORMATAÇÃO DE COORDENADAS (LAT/LON & UTM)
   ========================================================================== */

function utmParaLatLon(easting, northing, zone = 22, isSouth = true) {
    const a = 6378137.0; 
    const e = 0.081819191; 
    const e1sq = 0.006739497; 
    const k0 = 0.9996;

    const x = easting - 500000.0;
    const y = isSouth ? northing - 10000000.0 : northing;

    const M = y / k0;
    const mu = M / (a * (1 - Math.pow(e, 2)/4 - 3*Math.pow(e, 4)/64 - 5*Math.pow(e, 6)/256));

    const e1 = (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));

    const J1 = (3*e1/2 - 27*Math.pow(e1, 3)/32);
    const J2 = (21*Math.pow(e1, 2)/16 - 55*Math.pow(e1, 4)/32);
    const J3 = (151*Math.pow(e1, 3)/96);
    const J4 = (1097*Math.pow(e1, 4)/512);

    const fp = mu + J1*Math.sin(2*mu) + J2*Math.sin(4*mu) + J3*Math.sin(6*mu) + J4*Math.sin(8*mu);

    const C1 = e1sq * Math.pow(Math.cos(fp), 2);
    const T1 = Math.pow(Math.tan(fp), 2);
    const R1 = a * (1 - Math.pow(e, 2)) / Math.pow(1 - Math.pow(e, 2)*Math.pow(Math.sin(fp), 2), 1.5);
    const N1 = a / Math.sqrt(1 - Math.pow(e, 2)*Math.pow(Math.sin(fp), 2));
    const D = x / (N1 * k0);

    const Q1 = N1 * Math.tan(fp) / R1;
    const Q2 = Math.pow(D, 2) / 2;
    const Q3 = (5 + 3*T1 + 10*C1 - 4*Math.pow(C1, 2) - 9*e1sq) * Math.pow(D, 4) / 24;
    const Q4 = (61 + 90*T1 + 298*C1 + 45*Math.pow(T1, 2) - 252*e1sq - 3*Math.pow(C1, 2)) * Math.pow(D, 6) / 720;
    const lat = fp - Q1 * (Q2 - Q3 + Q4);

    const Q5 = D;
    const Q6 = (1 + 2*T1 + C1) * Math.pow(D, 3) / 6;
    const Q7 = (5 - 2*C1 + 28*T1 - 3*Math.pow(C1, 2) + 8*e1sq + 24*Math.pow(T1, 2)) * Math.pow(D, 5) / 120;
    const lon = (Q5 - Q6 + Q7) / Math.cos(fp);

    const centralMeridian = (zone > 0 ? (zone - 1) * 6 - 180 + 3 : 0);
    const latDeg = lat * 180 / Math.PI;
    const lonDeg = centralMeridian + (lon * 180 / Math.PI);

    return { lat: latDeg, lon: lonDeg };
}

function formatarEConverterCoordenadas(rawX, rawY) {
    if (!rawX && !rawY) return { x: null, y: null };

    let xStr = rawX ? String(rawX).trim().replace(',', '.') : '';
    let yStr = rawY ? String(rawY).trim().replace(',', '.') : '';

    let x = parseFloat(xStr);
    let y = parseFloat(yStr);

    if (isNaN(x) && isNaN(y)) {
        return { x: rawX || null, y: rawY || null };
    }

    if (!isNaN(x) && !isNaN(y)) {
        if (Math.abs(x) > 100000 && Math.abs(y) > 1000000) {
            const result = utmParaLatLon(x, y, 22, true);
            x = result.lat; 
            y = result.lon; 
        } 
        else if (Math.abs(y) > 100000 && Math.abs(x) > 1000000) {
            const result = utmParaLatLon(y, x, 22, true);
            x = result.lat; 
            y = result.lon; 
        }
        else if (Math.abs(x) > 20 && Math.abs(y) < 20) {
            const temp = x;
            x = y; 
            y = temp; 
        }
    }

    return {
        x: isNaN(x) ? (rawX || null) : Number(x.toFixed(8)),
        y: isNaN(y) ? (rawY || null) : Number(y.toFixed(8))
    };
}

function aoSairCampoCoordenada() {
    const campoX = obterElemento('form_coord_x');
    const campoY = obterElemento('form_coord_y');

    if (!campoX || !campoY) return;

    const valX = campoX.value;
    const valY = campoY.value;

    if (valX || valY) {
        const formatado = formatarEConverterCoordenadas(valX, valY);
        if (formatado.x !== null && !isNaN(formatado.x)) campoX.value = formatado.x;
        if (formatado.y !== null && !isNaN(formatado.y)) campoY.value = formatado.y;
    }
}

/* ==========================================================================
   DEMAIS FUNÇÕES DE COLETA E VALIDAÇÃO
   ========================================================================== */

function coletarDadosFormulario() {
    const coordXRaw = obterElemento('form_coord_x')?.value || null;
    const coordYRaw = obterElemento('form_coord_y')?.value || null;
    const coordsFormatadas = formatarEConverterCoordenadas(coordXRaw, coordYRaw);

    return {
        aviso: obterElemento('form_aviso')?.value?.trim() || null,
        carteira: obterElemento('form_prev_faturamento')?.value?.trim() || null, 
        filial: obterElemento('form_filial')?.value?.trim() || null,
        contratante: obterElemento('form_contratante')?.value?.trim() || null,
        municipio: obterElemento('form_municipio')?.value?.trim() || null,
        seccional: obterElemento('form_seccional')?.value?.trim() || null,
        area: obterElemento('form_area')?.value?.trim() || null,
        tipo_custo: obterElemento('form_tipo_custo')?.value?.trim() || null,
        tipo_atividade: obterElemento('form_tipo_atividade')?.value?.trim() || null,
        prioridade: obterElemento('form_prioridade')?.value?.trim() || null,
        tipo_rastreio: obterElemento('form_tipo_rastreio')?.value?.trim() || null,
        id_rastreio: obterElemento('form_id_rastreio')?.value?.trim() || null,
        vinculo_pagamento: obterElemento('form_vinculo_pagamento')?.value?.trim() || null,
        descricao_breve: obterElemento('form_descricao_breve')?.value?.trim() || null,
        seal: obterElemento('form_seal')?.value?.trim() || null,
        coord_x: coordsFormatadas.x, 
        coord_y: coordsFormatadas.y, 
        prazo: obterElemento('form_prazo')?.value?.trim() || null,
        solicitante: obterElemento('form_solicitante')?.value?.trim() || null,
        responsavel_tecnico: obterElemento('form_responsavel_tecnico')?.value?.trim() || null,
        status: obterElemento('form_status')?.value?.trim() || null
    };
}

function validarCamposObrigatorios() {
    const camposObrigatorios = [
        'form_aviso', 'form_filial', 'form_contratante', 'form_municipio', 'form_seccional', 
        'form_area', 'form_tipo_custo', 'form_tipo_atividade', 'form_prioridade', 'form_tipo_rastreio', 
        'form_id_rastreio', 'form_descricao_breve', 'form_coord_x', 'form_coord_y', 'form_solicitante', 
        'form_responsavel_tecnico', 'form_prazo', 'form_prev_faturamento', 'form_status'
    ];

    let valido = true;
    let primeiroCampoVazio = null;

    document.querySelectorAll('#formNovaAtividade .campo-obrigatorio-erro').forEach(el => {
        el.classList.remove('campo-obrigatorio-erro');
    });

    camposObrigatorios.forEach(id => {
        const campo = obterElemento(id);
        if (!campo) return;

        const valor = String(campo.value ?? '').trim();

        if (!valor) {
            valido = false;
            if (!primeiroCampoVazio) primeiroCampoVazio = campo;

            campo.classList.add('campo-obrigatorio-erro');

            if (campo.tagName === 'SELECT' && window.jQuery?.fn?.select2) {
                window.jQuery(campo).next('.select2-container').find('.select2-selection').addClass('campo-obrigatorio-erro');
            }
        }
    });

    if (!valido && primeiroCampoVazio) {
        primeiroCampoVazio.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Alterado para um alerta fixo (sem timer de auto-fechamento) para o usuário conseguir ler e interagir
        Swal.fire({
            icon: 'warning',
            title: 'Campos Obrigatórios',
            text: 'Por favor, preencha todos os campos obrigatórios destacados em vermelho.',
            confirmButtonColor: '#005696',
            confirmButtonText: 'OK'
        });
    }

    return { valido };
}

function removerErroCampo(campo) {
    if (!campo) return;
    campo.classList.remove('campo-obrigatorio-erro');
    if (campo.tagName === 'SELECT' && window.jQuery?.fn?.select2) {
        window.jQuery(campo).next('.select2-container').find('.select2-selection').removeClass('campo-obrigatorio-erro');
    }
}

async function verificarDuplicidadeRastreio(tipoRastreio, idRastreio, idAtividadeAtual = null) {
    if (!tipoRastreio || !idRastreio) return false;

    let query = supabase
        .from('tabe_cad_carteira')
        .select('id,tipo_rastreio,id_rastreio')
        .eq('tipo_rastreio', tipoRastreio)
        .eq('id_rastreio', idRastreio)
        .limit(1);

    if (idAtividadeAtual !== null && idAtividadeAtual !== undefined) {
        query = query.neq('id', idAtividadeAtual);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error('Não foi possível verificar se o Tipo de Rastreio e ID Rastreio já existem.');
    }

    return Array.isArray(data) && data.length > 0;
}

async function garantirStatusCadastrado() {
    const select = obterElemento('form_status');
    if (!select) return;

    let option = [...select.options].find(o => String(o.value).trim().toUpperCase() === 'CADASTRO');

    if (!option) {
        option = new Option('CADASTRO', 'CADASTRO');
        select.appendChild(option);
    }

    select.value = 'CADASTRO';
    select.disabled = true;

    if (window.jQuery?.fn?.select2) {
        window.jQuery(select).val('CADASTRO').trigger('change');
        window.jQuery(select).prop('disabled', true).trigger('change');
    }
}

async function salvarAtividade(dadosFormulario, idAtividade, callbackSucesso) {
    try {
        Object.keys(dadosFormulario).forEach(key => {
            if (dadosFormulario[key] === null || dadosFormulario[key] === undefined || String(dadosFormulario[key]).trim() === '') {
                dadosFormulario[key] = null;
            }
        });

        let usuarioStorage = null;
        try {
            const dadosStorage = localStorage.getItem("usuario_logado");
            if (dadosStorage) {
                usuarioStorage = JSON.parse(dadosStorage);
            }
        } catch (e) {
            console.error("Erro ao ler 'usuario_logado' do localStorage:", e);
        }

        const usuCad = window.usuarioLogado || 
            window.usuarioAtual || 
            window.emailUsuario || 
            usuarioStorage?.nome || 
            usuarioStorage?.email || 
            'Usuário Sistema';

        let idGeradoOuExistente = idAtividade;

        if (!idAtividade) {
            idGeradoOuExistente = await gerarProximoIdAtividade();
            dadosFormulario.id = idGeradoOuExistente;
            dadosFormulario.status = 'CADASTRO';
            
            const { error } = await supabase
                .from('tabe_cad_carteira')
                .insert([dadosFormulario]);

            if (error) throw error;

            let descricaoLog = 'Atividade cadastrada no sistema.';
            const tipoCusto = String(dadosFormulario.tipo_custo || '').trim().toUpperCase();
            const tipoRastreio = String(dadosFormulario.tipo_rastreio || '').trim().toUpperCase();

            if (tipoCusto === 'INVESTIMENTO' && tipoRastreio !== 'NOTA PROJ') {
                descricaoLog += ' (Aviso: Obra cadastrada sem Projeto)';
            }

            const { error: errLog } = await supabase.from('tabe_cad_carteira_log').insert([{
                id_atividade: dadosFormulario.id,
                acao: 'CADASTRO',
                descricao_acao: descricaoLog,
                usu_cad: usuCad
            }]);
            
            if (errLog) console.error('Erro ao gravar log de cadastro:', errLog);

        } else {
            const { data: registroAntigo, error: errBusca } = await supabase
                .from('tabe_cad_carteira')
                .select('*')
                .eq('id', idAtividade)
                .maybeSingle();

            if (errBusca) {
                console.error('Erro ao buscar registro antigo para log:', errBusca);
            }

            delete dadosFormulario.id;

            const { error } = await supabase
                .from('tabe_cad_carteira')
                .update(dadosFormulario)
                .eq('id', idAtividade);

            if (error) throw error;

            if (registroAntigo) {
                const logsParaInserir = [];

                for (const [campo, novoValor] of Object.entries(dadosFormulario)) {
                    const valorAntigo = registroAntigo[campo] !== null && registroAntigo[campo] !== undefined ? String(registroAntigo[campo]).trim() : '';
                    const valorNovo = novoValor !== null && novoValor !== undefined ? String(novoValor).trim() : '';

                    if (valorAntigo !== valorNovo) {
                        logsParaInserir.push({
                            id_atividade: idAtividade,
                            acao: 'EDICAO',
                            descricao_acao: `Edição de dados: era(${campo}: ${valorAntigo || 'vazio'}) passou a ser: (${campo}: ${valorNovo || 'vazio'})`,
                            usu_cad: usuCad
                        });
                    }
                }

                if (logsParaInserir.length > 0) {
                    const { error: errLogEdicao } = await supabase
                        .from('tabe_cad_carteira_log')
                        .insert(logsParaInserir);

                    if (errLogEdicao) {
                        console.error('Erro detalhado ao inserir log de edição no Supabase:', errLogEdicao);
                    }
                }
            }
        }

        if (dadosFormulario.id_rastreio) {
            await vincularListaTecnicaPepLto(idGeradoOuExistente, dadosFormulario.id_rastreio, usuCad);
        }

        Swal.fire({
            icon: 'success',
            title: 'Sucesso',
            text: idAtividade ? 'Atividade atualizada com sucesso!' : `Atividade criada com sucesso! ID: ${idGeradoOuExistente}`,
            confirmButtonColor: '#005696',
            timer: 2500
        });

        if (typeof callbackSucesso === 'function') {
            callbackSucesso();
        }
    } catch (err) {
        console.error('Erro ao salvar atividade:', err);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar',
            text: err.message || 'Ocorreu um erro ao salvar a atividade.',
            confirmButtonColor: '#005696'
        });
    }
}

function obterElemento(id) {
    return document.getElementById(id);
}

function preencherCampo(id, valor) {
    const el = obterElemento(id);
    if (el) el.value = valor ?? '';
}

function dispararChange(el) {
    el?.dispatchEvent(new Event('change', { bubbles: true }));
}

function definirValorSelect(id, valor) {
    const select = obterElemento(id);
    if (!select) return;

    select.value = valor ?? '';

    if (window.jQuery?.fn?.select2) {
        window.jQuery(select).trigger('change');
    } else {
        dispararChange(select);
    }
}

function limparCamposDependentes() {
    [
        'form_contratante', 'form_municipio', 'form_area', 'form_tipo_atividade', 
        'form_prioridade', 'form_tipo_rastreio', 'form_seal', 'form_solicitante', 'form_status'
    ].forEach(id => {
        const select = obterElemento(id);
        if (select) select.innerHTML = '<option value="">Selecione...</option>';
    });

    preencherCampo('form_seccional', '');

    const campoVinculo = obterElemento('form_vinculo_pagamento');
    const campoDescricao = obterElemento('form_descricao_breve');
    const labelVinculo = obterElemento('label_vinculo_pagamento');

    if (campoVinculo) {
        campoVinculo.value = '';
        campoVinculo.disabled = false;
    }

    if (campoDescricao) {
        campoDescricao.value = '';
        campoDescricao.disabled = false;
    }

    if (labelVinculo) {
        labelVinculo.textContent = 'Vínculo de Pagamento';
    }
}

async function carregarOpcoesSelect(tabela, colunaReturn, selectId, filtroValor = null, colunaFiltro = 'filial') {
    const selectEl = obterElemento(selectId);

    if (!selectEl) {
        console.error(`Select #${selectId} não encontrado no DOM.`);
        return [];
    }

    selectEl.innerHTML = '<option value="">Selecione...</option>';

    try {
        let query = supabase.from(tabela).select(colunaReturn);

        if (filtroValor !== null && filtroValor !== undefined && filtroValor !== '') {
            query = query.eq(colunaFiltro, filtroValor);
        }

        const { data, error } = await query;
        if (error) throw error;

        const uniqueValues = [...new Set(
            (data || [])
                .map(item => item[colunaReturn])
                .filter(val => val !== null && val !== undefined && String(val).trim() !== '')
                .map(val => String(val).trim())
        )].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

        uniqueValues.forEach(valor => {
            selectEl.appendChild(new Option(valor, valor));
        });

        if (window.jQuery?.fn?.select2) {
            window.jQuery(selectEl).trigger('change.select2');
        }

        return uniqueValues;
    } catch (err) {
        console.error(`Erro ao carregar opções para ${selectId}:`, err);
        return [];
    }
}

async function atualizarCamposPorFilial(filial) {
    if (!filial) {
        limparCamposDependentes();
        return;
    }

    await Promise.all([
        carregarOpcoesSelect('tabi_apoio_contrato', 'contratante', 'form_contratante', filial, 'filial'),
        carregarOpcoesSelect('tabi_apoio_contrato', 'processo', 'form_area', filial, 'filial'),
        carregarOpcoesSelect('tabi_apoio_localidade', 'localidade', 'form_municipio', filial, 'filial'),
        carregarOpcoesSelect('tabi_apoio_atividade', 'tipo_atividade', 'form_tipo_atividade', filial, 'filial'),
        carregarOpcoesSelect('tabi_apoio_prioridade', 'prioridade', 'form_prioridade', filial, 'filial'),
        carregarOpcoesSelect('tabi_apoio_rastreio', 'rastreio', 'form_tipo_rastreio', filial, 'filial'),
        carregarOpcoesSelect('tabi_apoio_alimentador', 'alimentador', 'form_seal', filial, 'filial'),
        carregarOpcoesSelect('tabi_apoio_etapa', 'situacao', 'form_status', filial, 'filial')
    ]);
}