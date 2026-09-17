// ==========================================
// MÓDULO DE PROCESSADORES ESPECÍFICOS DE IMPORTAÇÃO
// ==========================================

export const configuracoesImportacaoEspecificas = {
  'tabe_imp_pep': {
    nomeFantasia: "Importação Avançada de PEP's", tabela: "tabe_imp_pep", requerSelecaoOpcao: true,
    extensoesAceitas: ['csv', 'xls', 'xlsx'], acceptInput: ".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    textoDropzone: "Arraste a planilha <b>.csv, .xls</b> ou <b>.xlsx</b> aqui", textoRegra: "A planilha deve conter <b>6 colunas</b> estruturadas para o processamento de PEP.",
    funcaoProcessadora: executarProcessamentoPEP
  },
  'tabe_imp_pep_local': {
    nomeFantasia: "Importação Avançada de PEP Localização", tabela: "tabe_imp_pep_local", requerSelecaoOpcao: true,
    extensoesAceitas: ['csv', 'xls', 'xlsx'], acceptInput: ".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    textoDropzone: "Arraste a planilha <b>.csv, .xls</b> ou <b>.xlsx</b> aqui", textoRegra: "A planilha deve conter no mínimo <b>19 colunas</b> (da Nota até a Zona) estruturadas para a Localização.",
    funcaoProcessadora: processarImportacaoPEPLocal
  },
  'tabe_imp_ltg_proj': {
    nomeFantasia: "Importação Avançada Base LTG", tabela: "tabe_imp_ltg_proj", requerSelecaoOpcao: true,
    extensoesAceitas: ['csv', 'xls', 'xlsx'], acceptInput: ".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    textoDropzone: "Arraste a planilha <b>.csv, .xls</b> ou <b>.xlsx</b> aqui", textoRegra: "A planilha deve conter exatamente <b>15 colunas</b> para processamento da base LTG.",
    funcaoProcessadora: processarImportacaoLTGProj
  },
  'tabe_imp_caderno_servico': {
    nomeFantasia: "Importação Avançada Caderno de Serviço", tabela: "tabe_imp_caderno_servico", requerSelecaoOpcao: true,
    extensoesAceitas: ['csv', 'xls', 'xlsx'], acceptInput: ".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    textoDropzone: "Arraste a planilha <b>.csv, .xls</b> ou <b>.xlsx</b> aqui", textoRegra: "A planilha deve conter exatamente <b>12 colunas</b> estruturadas para o Caderno de Serviço.",
    funcaoProcessadora: processarImportacaoCadernoServico
  },
  'tabe_imp_pep_lto': {
    nomeFantasia: "Importação Avançada LTO em Massa", tabela: "tabe_imp_pep_lto", requerSelecaoOpcao: true,
    extensoesAceitas: ['csv', 'xls', 'xlsx'], acceptInput: ".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    textoDropzone: "Arraste a planilha <b>.csv, .xls</b> ou <b>.xlsx</b> aqui", textoRegra: "A planilha deve conter pelo menos <b>5 colunas</b> estruturadas para LTO em Massa.",
    funcaoProcessadora: processarImportacaoLTOMassa
  },
  'tabe_cad_carteira': {
    nomeFantasia: "Importação Avançada de Atividades", tabela: "tabe_cad_carteira", requerSelecaoOpcao: true,
    extensoesAceitas: ['csv', 'xls', 'xlsx'], acceptInput: ".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    textoDropzone: "Arraste a planilha <b>.csv, .xls</b> ou <b>.xlsx</b> aqui", textoRegra: "A planilha deve conter a coluna <b>id_rastreio</b> e <b>carteira</b> para o gerenciamento automático de IDs.",
    funcaoProcessadora: processarImportacaoAtividadeMassa
  }
};

const delay = ms => new Promise(r => setTimeout(r, ms));
const loadXlsx = async (update) => {
  if (typeof XLSX === 'undefined') {
    update(3, "Carregando biblioteca...");
    await new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = res; s.onerror = () => rej(new Error("Falha ao carregar biblioteca.")); document.head.appendChild(s);
    });
  }
};
const getUsu = () => {
  try { 
    const d = localStorage.getItem("usuario_logado"); 
    if (d) { 
      const p = JSON.parse(d); 
      return p.email || window.emailUsuario || window.usuarioLogado || p.nome || 'sistema@email.com'; 
    } 
  } catch(e){}
  return window.emailUsuario || window.usuarioLogado || 'sistema@email.com';
};
const limpaStr = v => v ? String(v).replace(/^"|"$/g, '').trim() : null;
const parseNum = v => { if (!v && v !== 0) return 0; if (typeof v === 'number') return v; const p = parseFloat(String(v).replace(/\s+/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.')); return isNaN(p) ? 0 : p; };
const parseCoord = v => { if (v == null || v === '') return null; if (typeof v === 'number') return v; const p = parseFloat(String(v).replace(/\s+/g, '').replace(',', '.')); return isNaN(p) ? null : p; };
const parseIntNum = v => { if (!v && v !== 0) return null; if (typeof v === 'number') return Math.round(v); const p = parseInt(String(v).replace(/\D/g, ''), 10); return isNaN(p) ? null : p; };
const formatPep = v => { if(!v) return null; let l = v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(); return l.length >= 18 ? `${l.substring(0, 2)}-${l.substring(2, 13)}.${l.substring(13, 14)}.${l.substring(14, 18)}` : v.substring(0, 21); };
const formataDt = v => { if(!v) return null; if(v instanceof Date) return `${v.getUTCFullYear()}-${String(v.getUTCMonth()+1).padStart(2,'0')}-${String(v.getUTCDate()).padStart(2,'0')}`; let c = limpaStr(v); if(c && c.includes('/')){ const p = c.split('/'); if(p.length===3) return `${p[2]}-${p[1]}-${p[0]}`; } return c; };
const chunkArr = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
const askAction = (count, id) => new Promise(res => {
  const p = document.getElementById('apoioStateProgress');
  p.insertAdjacentHTML('beforebegin', `<div id="${id}" style="padding:10px 0;text-align:center;"><h3 style="font-size:1.1rem;color:#1e293b;margin:0 0 8px;">Registros Existentes</h3><p style="font-size:0.9rem;color:#475569;margin:0 0 15px;line-height:1.4;">Encontramos <b>${count}</b> registros já existentes. Substituir ou salvar apenas novos?</p><div style="display:flex;gap:10px;justify-content:center;"><button id="btnSub_${id}" style="background:#005596;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Substituir</button><button id="btnNov_${id}" style="background:#e2e8f0;color:#475569;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Apenas Novos</button></div></div>`);
  p.style.display = 'none';
  const clr = act => { document.getElementById(id).remove(); p.style.display = 'flex'; res(act); };
  document.getElementById(`btnSub_${id}`).onclick = () => clr('SUBSTITUIR');
  document.getElementById(`btnNov_${id}`).onclick = () => clr('APENAS_NOVAS');
});
const readRows = (file, opt) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: opt?.cellDates });
      let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: opt?.defval });
      while (rows.length && rows[rows.length - 1].join("").trim() === "") rows.pop();
      res(rows);
    } catch(err) { rej(err); }
  };
  r.onerror = rej; r.readAsArrayBuffer(file);
});
const travarSwal = () => { if(typeof Swal!=='undefined'){ const b = Swal.getConfirmButton(); if(b) Object.assign(b.style, {opacity:"0.4", cursor:"not-allowed", backgroundColor:"#94a3b8"}), b.disabled = true; } };
const fetchTOut = (prom, ms=8000) => { let t; return Promise.race([prom, new Promise((_, r) => t = setTimeout(() => r(new Error('TIMEOUT')), ms))]).finally(() => clearTimeout(t)); };

// PROCESSADOR DE IMPORTAÇÃO DE ATIVIDADES EM MASSA
async function processarImportacaoAtividadeMassa(limparBase, file, sb, atualizarProgressoGlobal) {
    atualizarProgressoGlobal(2, "Lendo planilha de Atividades...");

    await loadXlsx(atualizarProgressoGlobal);
    const usuCad = getUsu();

    const formatarDataParaBanco = (data) => {
        if (!data) return null;
        if (data instanceof Date) return data.toISOString().split('T')[0];
        if (typeof data === 'string') {
            const partes = data.split('/');
            if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
            return data; 
        }
        if (typeof data === 'number') {
            const date = new Date(Math.round((data - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
        }
        return null;
    };

    const formatarCarteiraTexto = (valor) => {
        if (!valor) return null;
        if (valor instanceof Date) {
            const ano = valor.getUTCFullYear();
            const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
            return `${ano}-${mes}`;
        }
        if (typeof valor === 'number') {
            const date = new Date(Math.round((valor - 25569) * 86400 * 1000));
            const ano = date.getUTCFullYear();
            const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
            return `${ano}-${mes}`;
        }
        return String(valor).trim();
    };

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                atualizarProgressoGlobal(10, "Mapeando arquivo Excel...");
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                
                const dadosImportacao = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                if (!dadosImportacao || dadosImportacao.length === 0) {
                    throw new Error("A planilha está vazia.");
                }

                const idsRastreioPlanilha = dadosImportacao
                    .map(item => item.id_rastreio)
                    .filter(id => id !== null && id !== undefined && String(id).trim() !== '');

                let setRastreiosExistentes = new Set();
                
                if (idsRastreioPlanilha.length > 0) {
                    const arrIds = Array.from(new Set(idsRastreioPlanilha));
                    const chunkBusca = 150;
                    const totalChunks = Math.max(1, Math.ceil(arrIds.length / chunkBusca));

                    for (let i = 0; i < arrIds.length; i += chunkBusca) {
                        const chunk = arrIds.slice(i, i + chunkBusca);
                        const loteAtual = Math.floor(i / chunkBusca) + 1;
                        
                        atualizarProgressoGlobal(20 + ((loteAtual / totalChunks) * 20), `Validando duplicidades no banco (Lote ${loteAtual}/${totalChunks})...`);
                        
                        const { data: rastreiosNoBanco, error: errBusca } = await sb
                            .from('tabe_cad_carteira')
                            .select('id_rastreio')
                            .in('id_rastreio', chunk);

                        if (errBusca) throw new Error('Erro ao checar rastreios no banco: ' + errBusca.message);
                        
                        (rastreiosNoBanco || []).forEach(r => setRastreiosExistentes.add(String(r.id_rastreio).trim()));
                    }
                }

                atualizarProgressoGlobal(45, "Filtrando atividades novas...");

                const dadosParaInserir = dadosImportacao.filter(item => {
                    const idRastreioAtual = item.id_rastreio ? String(item.id_rastreio).trim() : null;
                    if (!idRastreioAtual) return false; 
                    return !setRastreiosExistentes.has(idRastreioAtual);
                });

                if (dadosParaInserir.length === 0) {
                    throw new Error("Não há atividades novas. Todas já estão registradas no banco ou não possuem a coluna 'id_rastreio'.");
                }

                atualizarProgressoGlobal(55, "Gerando novos IDs baseados na carteira...");

                const agrupadoPorCarteira = {};
                for (const item of dadosParaInserir) {
                    const carteiraTexto = formatarCarteiraTexto(item.carteira);
                    item.carteira = carteiraTexto;

                    if (!carteiraTexto) {
                        throw new Error(`A atividade com rastreio ${item.id_rastreio} está sem a coluna 'carteira'.`);
                    }
                    if (!agrupadoPorCarteira[carteiraTexto]) {
                        agrupadoPorCarteira[carteiraTexto] = [];
                    }
                    agrupadoPorCarteira[carteiraTexto].push(item);
                }

                const registrosFinais = [];

                for (const [carteira, itens] of Object.entries(agrupadoPorCarteira)) {
                    const { data: registrosCarteira, error: errCarteira } = await sb
                        .from('tabe_cad_carteira')
                        .select('id')
                        .like('id', `${carteira}-%`);

                    if (errCarteira) throw new Error(`Erro ao buscar numeração da carteira ${carteira}: ` + errCarteira.message);

                    let maiorNumero = 0;
                    (registrosCarteira || []).forEach(registro => {
                        const partes = String(registro.id || '').split('-');
                        if (partes.length >= 3) {
                            const numero = parseInt(partes[partes.length - 1], 10);
                            if (Number.isFinite(numero) && numero > maiorNumero) {
                                maiorNumero = numero;
                            }
                        }
                    });

                    itens.forEach(item => {
                        maiorNumero++;
                        item.id = `${carteira}-${String(maiorNumero).padStart(4, '0')}`;
                        
                        if (item.aviso) item.aviso = formatarDataParaBanco(item.aviso);
                        if (item.prazo) item.prazo = formatarDataParaBanco(item.prazo);
                        if (!item.status) item.status = 'CADASTRADO';
                        
                        registrosFinais.push(item);
                    });
                }

                const total = registrosFinais.length;
                const tamanhoLote = 500;
                let inseridos = 0;

                for (let i = 0; i < total; i += tamanhoLote) {
                    const lote = registrosFinais.slice(i, i + tamanhoLote);
                    const { error } = await sb.from("tabe_cad_carteira").insert(lote);
                    
                    if (error) {
                        console.error('Erro de inserção:', error);
                        throw new Error(`Erro de banco: ${error.message}`);
                    }

                    // Inserindo os logs correspondentes ao lote inserido usando o e-mail em `usu_cad`
                    const loteLogs = lote.map(item => ({
                        id_atividade: item.id,
                        acao: "CADASTRO",
                        descricao_acao: "CADASTRO EM MASSA",
                        usu_cad: usuCad
                    }));

                    const { error: errLog } = await sb.from("tabe_cad_carteira_log").insert(loteLogs);
                    if (errLog) {
                        console.error('Erro ao inserir logs:', errLog);
                        throw new Error(`Erro ao registrar logs de auditoria: ${errLog.message}`);
                    }

                    inseridos += lote.length;
                    const percentual = 70 + ((inseridos / total) * 30);
                    atualizarProgressoGlobal(percentual, `Enviando dados finais e logs para o banco (${inseridos}/${total})...`);
                }

                resolve();

            } catch (error) {
                reject(error);
            }
        };

        reader.readAsArrayBuffer(file);
    });
}

// PROCESSADOR DE IMPORTAÇÃO LTO EM MASSA
async function processarImportacaoLTOMassa(limpar, file, sb, update) {
  try {
    update(2, "Processando LTO em Massa..."); await loadXlsx(update);
    const usuCad = getUsu(); update(10, "Extraindo dados...");
    const rows = await readRows(file, { defval: "" });
    if (rows.length < 2) throw new Error("Planilha vazia.");
    if (rows[0].length < 5) throw new Error(`Mínimo de 5 colunas. Encontrado: ${rows[0].length}.`);
    const notasPlan = new Set();
    for (let i = 1; i < rows.length; i++) { const n = limpaStr(rows[i][0]); if(n) notasPlan.add(n); }
    if (!notasPlan.size) throw new Error("Nenhuma Nota válida.");
    update(15, "Mapeando notas existentes...");
    const notasBD = new Set(); let p = 0, fetchM = true;
    while (fetchM) {
      const { data, error } = await sb.from('tabe_imp_pep_lto').select('nota').range(p * 1000, (p + 1) * 1000 - 1);
      if (error) throw error;
      if (data?.length) { data.forEach(i => { if(i.nota) notasBD.add(String(i.nota).trim()); }); if(data.length < 1000) fetchM = false; else p++; } else fetchM = false;
    }
    const conflitos = new Set([...notasPlan].filter(n => notasBD.has(n)));
    let acao = 'SUBSTITUIR';
    if (conflitos.size > 0) acao = await askAction(conflitos.size, 'boxLTO');
    if (acao === 'SUBSTITUIR' && conflitos.size > 0) {
      update(50, "Eliminando registros antigos...");
      for (const ch of chunkArr(Array.from(conflitos), 30)) { const { error } = await sb.from("tabe_imp_pep_lto").delete().in('nota', ch); if(error) throw error; }
    }
    update(60, "Formatando dados...");
    const inserir = []; let pulados = 0;
    for (let i = 1; i < rows.length; i++) {
      const c = rows[i]; while (c.length < 5) c.push("");
      const n = limpaStr(c[0]); if (!n) continue;
      if (acao === 'APENAS_NOVAS' && notasBD.has(n)) { pulados++; continue; }
      const cod = limpaStr(c[1]);
      inserir.push({ nota: n, codigo_lista: cod ? cod.replace(/\s+/g, '') : null, descricao: limpaStr(c[2]), quantidade: parseNum(c[3]), acao: limpaStr(c[4]), usu_cada: usuCad });
    }
    if (!inserir.length) throw new Error(`Nenhum registro para salvar. ${pulados > 0 ? "Todas existiam e não foram substituídas." : ""}`);
    let ins = 0;
    for (const ch of chunkArr(inserir, 500)) {
      const { error } = await sb.from("tabe_imp_pep_lto").insert(ch); if(error) throw error;
      ins += ch.length; update(70 + ((ins/inserir.length) * 30), `Salvando (${ins}/${inserir.length})...`);
    }
  } catch (err) { console.error(err); throw err; }
}

// PROCESSADOR DE IMPORTAÇÃO CADERNO DE SERVIÇO (CSG)
async function processarImportacaoCadernoServico(limpar, file, sb, update) {
  try {
    update(2, "Iniciando Caderno de Serviço..."); await loadXlsx(update);
    const usuCad = getUsu(); update(5, "Lendo arquivo...");
    const rows = await readRows(file, { defval: "", cellDates: true });
    if (rows.length < 2) throw new Error("Planilha vazia.");
    if (rows[0].length !== 12) throw new Error(`O Caderno de Serviço precisa ter 12 colunas. Encontramos ${rows[0].length}.`);
    update(20, "Formatando..."); const inserir = [];
    for (let i = 1; i < rows.length; i++) {
      const c = rows[i]; while(c.length < 12) c.push("");
      inserir.push({ contrato: limpaStr(c[0]), condicao: limpaStr(c[1]), segmento: limpaStr(c[2]), grupo: limpaStr(c[3]), caderno: limpaStr(c[4]), codigo: limpaStr(c[5]), codigo_novo: limpaStr(c[6]), texto_breve: limpaStr(c[7]), valor_antigo: parseNum(c[8]), valor_novo: parseNum(c[9]), descricao: limpaStr(c[10]), tipo: limpaStr(c[11]), usu_cada: usuCad });
    }
    if (!inserir.length) throw new Error("Nenhum dado válido.");
    update(50, "Limpando base..."); const { error: errD } = await sb.from("tabe_imp_caderno_servico").delete().not('id', 'is', null); if(errD) throw errD;
    update(70, "Gravando..."); let ins = 0;
    for (const ch of chunkArr(inserir, 500)) {
      const { error } = await sb.from("tabe_imp_caderno_servico").insert(ch); if(error) throw error;
      ins += ch.length; update(Math.round(70 + ((ins/inserir.length) * 30)), `Gravando (${ins}/${inserir.length})...`);
    }
    try {
      await sb.from("tabe_imp_caderno_servico").delete().eq("contrato", "PLACEHOLDER");
    } catch(e) {}
  } catch(err) { throw err; }
}

// PROCESSADOR DE IMPORTAÇÃO LTG PROJ
async function processarImportacaoLTGProj(limpar, file, sb, update) {
  try {
    update(2, "Iniciando LTG..."); await loadXlsx(update);
    const usuCad = getUsu(); update(5, "Lendo arquivo...");
    const rows = await readRows(file, { defval: "", cellDates: true });
    if (rows.length < 2) throw new Error("Planilha vazia.");
    if (rows[0].length !== 15) throw new Error(`O arquivo LTG precisa ter EXATAMENTE 15 colunas. Encontramos ${rows[0].length}.`);
    update(20, "Formatando..."); const cods = new Set();
    for (let i = 1; i < rows.length; i++) { const c = limpaStr(rows[i][2]); if(c) cods.add(c); }
    const inserir = [];
    for (let i = 1; i < rows.length; i++) {
      const c = rows[i]; while(c.length < 15) c.push("");
      const cod = limpaStr(c[2]); let val = "SIM";
      if (cod) { if (!cod.endsWith('_CNV') && cods.has(cod + '_CNV')) val = "NÃO"; }
      inserir.push({ ind_principal: limpaStr(c[0]), grupo_componente: limpaStr(c[1]), cod_erp: cod, desc_erp: limpaStr(c[3]), cod_material: limpaStr(c[4]), desc_material: limpaStr(c[5]), qtd_material: parseNum(c[6]), und_material: limpaStr(c[7]), cod_servico: limpaStr(c[8]), desc_servico: limpaStr(c[9]), qtd_servico: parseNum(c[10]), contrato_item: limpaStr(c[11]), tipo_aplicacao: limpaStr(c[12]), empresa: limpaStr(c[13]), proj: limpaStr(c[14]), lt_valida: val, usu_cada: usuCad });
    }
    if (!inserir.length) throw new Error("Nenhum dado válido.");
    update(50, "Limpando base..."); const { error: errD } = await sb.from("tabe_imp_ltg_proj").delete().not('id', 'is', null); if(errD) throw errD;
    update(70, "Gravando..."); let ins = 0;
    for (const ch of chunkArr(inserir, 500)) {
      const { error } = await sb.from("tabe_imp_ltg_proj").insert(ch); if(error) throw error;
      ins += ch.length; update(Math.round(70 + ((ins/inserir.length) * 30)), `Gravando (${ins}/${inserir.length})...`);
    }
    try {
      await sb.from("tabe_imp_ltg_proj").delete().eq("ind_principal", "PLACEHOLDER");
    } catch(e) {}
  } catch(err) { throw err; }
}

// PROCESSADOR DE IMPORTAÇÃO PEP LOCALIZAÇÃO
async function processarImportacaoPEPLocal(limpar, file, sb, update) {
  try {
    update(2, "Iniciando Localização..."); await loadXlsx(update);
    const usuCad = getUsu(); update(5, "Lendo arquivo...");
    const rows = await readRows(file, { defval: "", cellDates: true });
    if (rows.length < 2) throw new Error("Planilha vazia.");
    if (rows[0].length < 19) throw new Error(`Mínimo 19 colunas. Encontramos ${rows[0].length}.`);
    update(20, "Extraindo PEPs..."); const pepsP = new Set();
    for (let i = 1; i < rows.length; i++) { const p = formatPep(limpaStr(rows[i][3])); if(p) pepsP.add(p); }
    if (!pepsP.size) throw new Error("Nenhum PEP válido.");
    const pepsB = new Set(), chunksP = chunkArr(Array.from(pepsP), 150);
    for (let i = 0; i < chunksP.length; i++) {
      update(25 + (((i+1)/chunksP.length) * 25), `Consultando base (${i+1}/${chunksP.length})...`);
      const { data, error } = await sb.from('tabe_imp_pep_local').select('pep').in('pep', chunksP[i]);
      if(error) throw error; (data||[]).forEach(r => pepsB.add(String(r.pep).trim()));
    }
    let acao = 'SUBSTITUIR';
    if (pepsB.size > 0) acao = await askAction(pepsB.size, 'boxLoc');
    update(60, "Formatando..."); const inserir = [];
    for (let i = 1; i < rows.length; i++) {
      const c = rows[i]; while(c.length < 19) c.push("");
      const p = formatPep(limpaStr(c[3])); if(!p || (acao === 'APENAS_NOVAS' && pepsB.has(p))) continue;
      inserir.push({ nota: limpaStr(c[0]), pasta: limpaStr(c[1]), descricao: limpaStr(c[2]), pep: p, visita: limpaStr(c[4]), ordem: limpaStr(c[5]), valor_obra: parseNum(c[6]), qtd_prevista_postes: parseIntNum(c[7]), previsao_entrega: limpaStr(c[8]), parceiro: limpaStr(c[9]), tipo_fiscalizacao: limpaStr(c[10]), tipo_projeto: limpaStr(c[11]), contrato: limpaStr(c[12]), empresa: limpaStr(c[13]), regional: limpaStr(c[14]), municipio: limpaStr(c[15]), latitude: parseCoord(c[16]), longitude: parseCoord(c[17]), zona: limpaStr(c[18]), usu_cada: usuCad });
    }
    if (!inserir.length) throw new Error("Nenhum registro para salvar.");
    if (acao === 'SUBSTITUIR' && pepsB.size > 0) {
      update(75, "Limpando antigos...");
      for(const ch of chunkArr(Array.from(pepsB), 150)){ const {error} = await sb.from("tabe_imp_pep_local").delete().in('pep', ch); if(error) throw error; }
    }
    let ins = 0;
    for (const ch of chunkArr(inserir, 500)) {
      const { error } = await sb.from("tabe_imp_pep_local").insert(ch); if(error) throw error;
      ins += ch.length; update(80 + ((ins/inserir.length) * 20), `Gravando (${ins}/${inserir.length})...`);
    }
  } catch(err) { throw err; }
}

// PROCESSADOR DE IMPORTAÇÃO PEP
async function executarProcessamentoPEP(limpar, file, sb, update) {
  const calcReg = p => {
    if(!p) return 'N/I';
    const c16 = p.substring(15, 16), c14 = p.substring(13, 14);
    switch(c16) { case '1': return 'NORTE'; case '2': return 'NORDESTE'; case '3': return 'SUL'; case '4': return 'OESTE'; case '5': return 'CENTRO'; default: switch(c14){ case '1': return 'NORTE'; case '2': return 'NORDESTE'; case '3': return 'SUL'; case '4': return 'OESTE'; case '5': return 'CENTRO'; default: return 'N/I'; } }
  };
  try {
    update(2, "Iniciando processamento seguro..."); await loadXlsx(update);
    const usuCad = getUsu(); update(5, "Lendo arquivo..."); await delay(100);
    const rows = await readRows(file, { header: 1, cellDates: true });
    if(rows.length < 2) { travarSwal(); throw new Error("Planilha vazia."); }
    update(20, "Formatando dados..."); await delay(50);
    const orig = [], pepsP = new Set();
    for (let i=1; i<rows.length; i+=500) {
      let l = Math.min(i+500, rows.length);
      for (let j=i; j<l; j++) {
        const c = rows[j]; while(c.length < 6) c.push("");
        const p = formatPep(limpaStr(c[0])); let s = limpaStr(c[3]);
        if (s) s = `${s.substring(0,4)}//${s.slice(-4)}`.replace(/\s+/g, '');
        if (p) { pepsP.add(p); orig.push({ pep: p, nota: limpaStr(c[1]), descrição: limpaStr(c[2]), status: s, liberacao: formataDt(c[4]), energizacao: formataDt(c[5]) }); }
      }
      update(20, `Formatando... (${l}/${rows.length})`); await delay(10);
    }
    if (!orig.length) { travarSwal(); throw new Error("Nenhum dado válido."); }
    const pepsB = new Set(), chunksP = chunkArr(Array.from(pepsP), 200);
    for (let i=0; i<chunksP.length; i++) {
      update(25 + (((i+1)/chunksP.length) * 20), `Buscando no banco (${i+1}/${chunksP.length})...`); await delay(15);
      let ok = false, tent = 0;
      while(!ok && tent < 3) {
        try {
          const { data, error } = await fetchTOut(sb.from('tabe_imp_pep').select('pep').in('pep', chunksP[i]));
          if (error) throw error; (data||[]).forEach(r => pepsB.add(String(r.pep).trim())); ok = true;
        } catch(e) { tent++; if(tent>=3) { travarSwal(); throw new Error(`Conexão perdida no lote ${i+1}.`); } await delay(2000); }
      }
    }
    let acao = 'SUBSTITUIR';
    if(pepsB.size > 0) acao = await askAction(pepsB.size, 'boxPep');
    update(48, "Aplicando filtros..."); await delay(15);
    const filt = [];
    for (let i=0; i<orig.length; i+=500) {
      let l = Math.min(i+500, orig.length);
      for(let j=i; j<l; j++) { if (acao === 'APENAS_NOVAS' && pepsB.has(orig[j].pep)) continue; filt.push(orig[j]); }
      await delay(5);
    }
    if (!filt.length) { travarSwal(); throw new Error("Nenhum registro para salvar."); }
    const procPeps = Array.from(new Set(filt.map(i => i.pep))), mapAnt = {}, chProc = chunkArr(procPeps, 200);
    for (let i=0; i<chProc.length; i++) {
      update(50 + (((i+1)/chProc.length) * 20), `Validando histórico (${i+1}/${chProc.length})...`); await delay(15);
      let ok = false, tent = 0;
      while(!ok && tent < 3) {
        try {
          const { data, error } = await fetchTOut(sb.from('tabe_imp_pep').select('pep, E_CONC, E_COMS, E_MED, E_PEND, E_LIB').in('pep', chProc[i]));
          if (error) throw error; (data||[]).forEach(r => mapAnt[r.pep] = r); ok = true;
        } catch(e) { tent++; if(tent>=3){ travarSwal(); throw new Error(`Falha no histórico lote ${i+1}.`); } await delay(2000); }
      }
    }
    update(75, "Preparando pacote final...");
    const dtAtual = formataDt(new Date()), inserir = [];
    for (let i=0; i<filt.length; i+=500) {
      let l = Math.min(i+500, filt.length);
      for (let j=i; j<l; j++) {
        const o = filt[j], db = mapAnt[o.pep] || {};
        inserir.push({ pep: o.pep, regional: calcReg(o.pep), nota: o.nota, descricao: o.descrição, status: o.status, liberacao: o.liberacao, energizacao: o.energizacao, E_CONC: (!db.E_CONC && o.status === 'LIB//CONC') ? dtAtual : (db.E_CONC || null), E_COMS: (!db.E_COMS && o.status === 'LIB//COMS') ? dtAtual : (db.E_COMS || null), E_MED: (!db.E_MED && o.status === 'LIB//MED') ? dtAtual : (db.E_MED || null), E_PEND: (!db.E_PEND && ['LIB//PEND','LIB//DEV','LIB//DFEC'].includes(o.status)) ? dtAtual : (db.E_PEND || null), E_LIB: (o.status === 'LIB//ATEC' && o.liberacao) ? o.liberacao : (db.E_LIB || null), usu_cada: usuCad });
      }
      await delay(5);
    }
    if (acao === 'SUBSTITUIR' && pepsB.size > 0) {
      const del = procPeps.filter(p => pepsB.has(p)), chDel = chunkArr(del, 1000);
      for (let i=0; i<chDel.length; i++) {
        update(78, "Sobrescrevendo antigos..."); await delay(15);
        let ok = false, tent = 0;
        while(!ok && tent < 3) {
          try { const { error } = await fetchTOut(sb.from("tabe_imp_pep").delete().in('pep', chDel[i])); if(error) throw error; ok = true; }
          catch(e) { tent++; if(tent>=3){ travarSwal(); throw new Error("Erro ao deletar antigos."); } await delay(2000); }
        }
      }
    }
    let ins = 0;
    for (const ch of chunkArr(inserir, 1000)) {
      update(80 + ((ins/inserir.length) * 20), `Gravando (${ins}/${inserir.length})...`); await delay(15);
      let ok = false, tent = 0;
      while(!ok && tent < 3) {
        try { const { error } = await fetchTOut(sb.from("tabe_imp_pep").insert(ch), 10000); if(error) throw error; ok = true; }
        catch(e) { tent++; if(tent>=3){ travarSwal(); throw new Error("Erro na gravação final."); } await delay(2000); }
      }
      ins += ch.length;
    }
    try {
      await sb.from("tabe_imp_pep").delete().eq("pep", "PLACEHOLDER");
    } catch(e) {}
  } catch(err) { travarSwal(); throw err; }
}