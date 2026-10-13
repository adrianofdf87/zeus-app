import React,{useState,useEffect,useMemo,useRef} from "react";
import {ChevronDown,ChevronLeft,ChevronRight,ArrowUp,ArrowDown,Columns3,Maximize2,Minimize2,Edit2,Check,RotateCcw} from "lucide-react";
import "./DataTable.css";

const formatadorMoedaBRL = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});

const formatarDado = (valor,coluna,apelidoColuna="") => {
  if(valor===null||valor===undefined||valor==="") return "-";
  const colLower = String(coluna).toLowerCase(), apelidoLower = String(apelidoColuna||"").toLowerCase(), valorStr = String(valor).trim();
  if(colLower==="id") return String(valor);

  const ehCoordenada = colLower.includes("latitude")||colLower==="lat"||colLower.includes("longitude")||colLower==="long"||colLower.includes("lng");
  if(ehCoordenada){
    const num = parseFloat(String(valor).replace(",","."));
    if(!isNaN(num)) return num.toFixed(6).replace(".",",");
  }

  const ehPercentual = colLower.includes("%")||colLower==="avanco"||apelidoLower.includes("%")||valorStr.endsWith("%");
  if(ehPercentual){
    const num = parseFloat(valorStr.replace("%","").replace(",","."));
    if(!isNaN(num)){
      return `${num.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:2})}%`;
    }
  }
  if(colLower.includes("valor")||colLower.includes("total")||colLower.includes("custo")||colLower.includes("pago")||colLower.includes("serviço")){
    const num = parseFloat(String(valor).replace(",","."));
    if(!isNaN(num)) return formatadorMoedaBRL.format(num);
  }
  if(typeof valor==="string"&&/^\d{4}-\d{2}-\d{2}/.test(valor)){
    const d = new Date(valor);
    if(!isNaN(d.getTime())) return `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`;
  }
  return String(valor);
};

export default function DataTable({
  data=[],
  tableId="tabela_geral",
  onSelectionChange,
  totalBanco,
  paginaAtual=1,
  registrosPorPagina=100,
  onPageChange,
  onLimitChange,
  onFilterChange,
  onSortChange, // Novo callback para ordenação no banco
  ordenacaoExterna, // Estado externo da ordenação
  onFetchColumnOptions,
  columnOptionsContextKey="",
  filtrosExternos,
  colunasIniciais=[],
  loading=false,
  loadingTexto="Carregando dados"
}){
  const [colunasTabela,setColunasTabela] = useState([]);
  const [colunasOcultas,setColunasOcultas] = useState([]);
  const [tempColunasOcultas,setTempColunasOcultas] = useState([]);
  const [colunasApelidos,setColunasApelidos] = useState({});
  const [filtrosLocais,setFiltrosLocais] = useState({});
  const [ordenacaoLocal,setOrdenacaoLocal] = useState({coluna:null,asc:true});
  const [linhasSelecionadas,setLinhasSelecionadas] = useState(new Set());
  const [telaCheia,setTelaCheia] = useState(false);
  const [menuAtivo,setMenuAtivo] = useState(null);
  const [posicaoPopup,setPosicaoPopup] = useState({top:0,left:0});
  const [termoBuscaFiltro,setTermoBuscaFiltro] = useState("");
  const [tempFiltrosCheckbox,setTempFiltrosCheckbox] = useState(new Set());
  const [inputMaiorQue,setInputMaiorQue] = useState("");
  const [inputMenorQue,setInputMenorQue] = useState("");
  const [opcoesBancoColuna,setOpcoesBancoColuna] = useState([]);
  const [loadingOpcoes,setLoadingOpcoes] = useState(false);
  const [editandoNome,setEditandoNome] = useState(false);
  const [novoApelidoCol,setNovoApelidoCol] = useState("");
  const [draggedColIdx,setDraggedColIdx] = useState(null);

  const [tooltipInfo, setTooltipInfo] = useState({ visivel: false, texto: "", x: 0, y: 0 });

  const popupRef = useRef(null);
  const opcoesCacheRef = useRef(new Map());
  const opcoesInFlightRef = useRef(new Map());
  const opcoesRequestRef = useRef(0);
  const mountedRef = useRef(true);

  const filtrosControlados = filtrosExternos!==undefined&&filtrosExternos!==null;
  const filtrosGlobais = filtrosControlados?filtrosExternos:filtrosLocais;
  
  const ordenacaoControlada = ordenacaoExterna!==undefined&&ordenacaoExterna!==null;
  const ordenacao = ordenacaoControlada?ordenacaoExterna:ordenacaoLocal;

  useEffect(()=>{
    mountedRef.current = true;
    return()=>{
      mountedRef.current = false;
      opcoesRequestRef.current += 1;
    };
  },[]);

  const assinaturaColunas = useMemo(()=>{
    const base = Array.isArray(colunasIniciais)&&colunasIniciais.length?colunasIniciais:data.length?Object.keys(data[0]):[];
    return base.filter(c=>c!=="id").join("\u001f");
  },[data,colunasIniciais]);

  useEffect(()=>{
    if(!assinaturaColunas) return;
    const colunasIniciaisArr = assinaturaColunas.split("\u001f");
    const lerLocalStorage = (chave,fallback)=>{
      try{
        const valor = localStorage.getItem(chave);
        return valor?JSON.parse(valor):fallback;
      }catch{return fallback;}
    };

    const ocultasSalvas = lerLocalStorage(`${tableId}_ocultas`,[]);
    const ordemSalva = lerLocalStorage(`${tableId}_ordem`,[]);
    const apelidosSalvos = lerLocalStorage(`${tableId}_apelidos`,{});

    setColunasOcultas(prev=>JSON.stringify(prev)===JSON.stringify(ocultasSalvas)?prev:ocultasSalvas);
    setColunasApelidos(prev=>JSON.stringify(prev)===JSON.stringify(apelidosSalvos)?prev:apelidosSalvos);

    const colunasAtivas = ordemSalva.length>0?ordemSalva.filter(c=>colunasIniciaisArr.includes(c)):[...colunasIniciaisArr];
    colunasIniciaisArr.forEach(c=>{if(!colunasAtivas.includes(c)) colunasAtivas.push(c);});
    setColunasTabela(prev=>JSON.stringify(prev)===JSON.stringify(colunasAtivas)?prev:colunasAtivas);
  },[assinaturaColunas,tableId]);

  useEffect(()=>{
    const handleClickFora = e=>{
      if(popupRef.current&&!popupRef.current.contains(e.target)&&!e.target.closest(".th-cell-container")&&!e.target.closest(".table-col-checkbox-btn")){
        setMenuAtivo(null);
        setEditandoNome(false);
      }
    };
    document.addEventListener("click",handleClickFora);
    return()=>document.removeEventListener("click",handleClickFora);
  },[]);

  const normalizarValorFiltro = valor=>{
    if(valor===null||valor===undefined) return "##NULL##";
    const texto = String(valor).trim();
    if(texto===""||texto==="-"||texto.toLowerCase()==="null"||texto.toLowerCase()==="undefined") return "##NULL##";
    return texto;
  };

  const converterNumero = valor=>{
    if(valor===null||valor===undefined) return NaN;
    let texto = String(valor).trim().toLowerCase()
      .replace(/\s/g,"")
      .replace(/^r\$/,"")
      .replace(/\./g,"")
      .replace(/%/g,"")
      .replace(",",".");
    if(!texto) return NaN;
    const numero = Number(texto);
    return Number.isFinite(numero)?numero:NaN;
  };

  const ehData = valor=>{
    if(valor instanceof Date) return !isNaN(valor.getTime());
    if(valor===null||valor===undefined||valor==="") return false;
    return /^\d{4}-\d{2}-\d{2}(?:$|T|\s)/.test(String(valor).trim());
  };

  const colunaEhData = (coluna,dados=data)=>{
    const valores = dados.map(item=>item?.[coluna]).filter(v=>v!==null&&v!==undefined&&String(v).trim()!=="");
    if(!valores.length) return false;
    const validos = valores.filter(ehData).length;
    return validos>0&&validos>=Math.max(1,Math.ceil(valores.length*.5));
  };

  const converterData = valor=>{
    if(valor===null||valor===undefined||valor==="") return NaN;
    if(valor instanceof Date){
      const d = new Date(Date.UTC(valor.getFullYear(),valor.getMonth(),valor.getDate()));
      return isNaN(d.getTime())?NaN:d.getTime();
    }
    const texto = String(valor).trim();
    const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?::(\d+))?)?(?:Z|[+-]\d{2}:?\d{2})?)?/);
    if(!m) return NaN;
    const ano = Number(m[1]),mes = Number(m[2]),dia = Number(m[3]);
    if(m[4]===undefined){
      const d = new Date(Date.UTC(ano,mes-1,dia));
      return d.getUTCFullYear()===ano&&d.getUTCMonth()===mes-1&&d.getUTCDate()===dia?d.getTime():NaN;
    }
    const d = new Date(texto);
    return isNaN(d.getTime())?NaN:d.getTime();
  };

  const normalizarDataInput = valor=>{
    if(!valor) return "";
    const m = String(valor).trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return m?m[1]:"";
  };

  const inicioDoDia = valor=>{
    const m = String(valor||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return NaN;
    return Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),0,0,0,0);
  };

  const fimDoDia = valor=>{
    const inicio = inicioDoDia(valor);
    return Number.isNaN(inicio)?NaN:inicio+86400000-1;
  };

  const valoresSaoIguais = (valorBanco,valorFiltro)=>{
    const banco = normalizarValorFiltro(valorBanco);
    const filtro = normalizarValorFiltro(valorFiltro);
    if(banco==="##NULL##"||filtro==="##NULL##") return banco===filtro;
    const numeroBanco = converterNumero(banco);
    const numeroFiltro = converterNumero(filtro);
    if(Number.isFinite(numeroBanco)&&Number.isFinite(numeroFiltro)&&numeroBanco===numeroFiltro) return true;
    return banco===filtro;
  };

  const regrasFiltrosProcessadas = useMemo(()=>{
    return Object.entries(filtrosGlobais||{})
      .filter(([,regras])=>Array.isArray(regras)&&regras.length>0)
      .map(([coluna,regras])=>{
        const filtrosNumericos = [];
        const filtrosDatas = [];
        const valoresExatos = new Set();
        const ehColData = colunaEhData(coluna,data);

        regras.forEach(regra=>{
          if(typeof regra!=="string") return;
          if(regra.startsWith(">=|")||regra.startsWith("<=|")){
            const tipo = regra.startsWith(">=|")?">=":"<=";
            const valorTexto = regra.slice(3);
            if(ehColData){
              const valor = tipo===">="?inicioDoDia(valorTexto):fimDoDia(valorTexto);
              if(!Number.isNaN(valor)) filtrosDatas.push({tipo,valor});
            }else{
              const valor = converterNumero(valorTexto);
              if(!Number.isNaN(valor)) filtrosNumericos.push({tipo,valor});
            }
          }else valoresExatos.add(regra);
        });
        return{coluna,filtrosNumericos,filtrosDatas,valoresExatos};
      });
  },[filtrosGlobais,data]);

  // Apenas filtragem local para busca rápida na página atual, sem ordenação via Front-end
  const dadosProcessados = useMemo(()=>{
    let processados = data;
    if(regrasFiltrosProcessadas.length>0){
      processados = data.filter(item=>{
        for(const regra of regrasFiltrosProcessadas){
          const valBruto = item[regra.coluna];
          const temDatas = regra.filtrosDatas.length>0;
          const temNumericos = regra.filtrosNumericos.length>0;
          const temExatos = regra.valoresExatos.size>0;

          let passaNum = !temNumericos;
          let passaData = !temDatas;
          let passaExact = !temExatos;

          if(temNumericos){
            const valNum = converterNumero(valBruto);
            passaNum = !Number.isNaN(valNum)&&regra.filtrosNumericos.every(f=>f.tipo===">="?valNum>=f.valor:valNum<=f.valor);
          }
          if(temDatas){
            const valData = converterData(valBruto);
            passaData = !Number.isNaN(valData)&&regra.filtrosDatas.every(f=>f.tipo===">="?valData>=f.valor:valData<=f.valor);
          }
          if(temExatos){
            passaExact = Array.from(regra.valoresExatos).some(filtro=>valoresSaoIguais(valBruto,filtro));
          }

          const passaCondicional = temDatas?passaData:passaNum;
          if((temDatas||temNumericos)&&temExatos){
            if(!passaCondicional&&!passaExact) return false;
          }else{
            if(!passaCondicional||!passaExact) return false;
          }
        }
        return true;
      });
    }
    return processados;
  },[data,regrasFiltrosProcessadas]);

  const totalRegistrosReal = totalBanco!==undefined?totalBanco:data.length;
  const totalPaginas = Math.ceil(totalRegistrosReal/registrosPorPagina)||1;

  const toggleSelecionarLinha = id=>{
    const novas = new Set(linhasSelecionadas);
    if(novas.has(id)) novas.delete(id);
    else novas.add(id);
    setLinhasSelecionadas(novas);
    if(onSelectionChange) onSelectionChange(Array.from(novas));
  };

  const handleDoubleClickCheckboxCell = e=>{
    e.stopPropagation();
    const todosIdsVisiveis = dadosProcessados.map((r,index)=>r.id??`row-${index}`);
    const todosJaSelecionados = todosIdsVisiveis.every(id=>linhasSelecionadas.has(id));
    const novas = new Set(linhasSelecionadas);
    if(todosJaSelecionados) todosIdsVisiveis.forEach(id=>novas.delete(id));
    else todosIdsVisiveis.forEach(id=>novas.add(id));
    setLinhasSelecionadas(novas);
    if(onSelectionChange) onSelectionChange(Array.from(novas));
  };

  const criarChaveOpcoes = (coluna,filtros,termo="")=>{
    const filtrosNormalizados = Object.entries(filtros||{})
      .filter(([,regras])=>Array.isArray(regras)&&regras.length>0)
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([col,regras])=>[col,[...regras].sort()]);
    return JSON.stringify([tableId,columnOptionsContextKey,coluna,filtrosNormalizados,String(termo||"").trim().toLocaleLowerCase("pt-BR")]);
  };

  const abrirMenuExcel = (coluna,e)=>{
    e.stopPropagation();
    const cellContainer = e.currentTarget.closest(".th-cell-container")||e.currentTarget;
    const rect = cellContainer.getBoundingClientRect();
    const popupWidth = 275, popupHeight = 390;
    let leftPos = rect.left;
    if(leftPos+popupWidth>window.innerWidth-15) leftPos = window.innerWidth-popupWidth-15;
    if(leftPos<15) leftPos = 15;
    let topPos = rect.bottom+4;
    if(topPos+popupHeight>window.innerHeight-15) topPos = rect.top-popupHeight-4;
    if(topPos<15) topPos = 15;
    const filtrosAtivos = filtrosGlobais[coluna]||[];
    const exatos = filtrosAtivos.filter(f=>!f.startsWith(">=|")&&!f.startsWith("<=|"));
    const gte = filtrosAtivos.find(f=>f.startsWith(">=|"))?.slice(3)||"";
    const lte = filtrosAtivos.find(f=>f.startsWith("<=|"))?.slice(3)||"";
    opcoesRequestRef.current += 1;
    setPosicaoPopup({top:topPos,left:leftPos});
    setTempFiltrosCheckbox(new Set(exatos));
    setInputMaiorQue(colunaEhData(coluna,data)?normalizarDataInput(gte):gte);
    setInputMenorQue(colunaEhData(coluna,data)?normalizarDataInput(lte):lte);
    setTermoBuscaFiltro("");
    setEditandoNome(false);
    setNovoApelidoCol(colunasApelidos[coluna]||coluna.toUpperCase());
    setOpcoesBancoColuna([]);
    setLoadingOpcoes(Boolean(onFetchColumnOptions));
    setMenuAtivo({tipo:"excel",coluna});
  };

  useEffect(()=>{
    if(menuAtivo?.tipo!=="excel"||!menuAtivo.coluna||!onFetchColumnOptions) return;
    const coluna = menuAtivo.coluna, termo = termoBuscaFiltro.trim();
    const filtrosParaConsulta = filtrosGlobais||{};
    const cacheKey = criarChaveOpcoes(coluna,filtrosParaConsulta,termo);
    const requestId = ++opcoesRequestRef.current;
    const cached = opcoesCacheRef.current.get(cacheKey);
    if(cached){
      const apelidoCol = colunasApelidos[coluna]||"";
      setOpcoesBancoColuna(cached.map(opt=>({...opt,exibicao:opt.chave==="##NULL##"?"-":formatarDado(opt.chave,coluna,apelidoCol)})));
      setLoadingOpcoes(false);
      return;
    }
    setLoadingOpcoes(true);
    const atraso = setTimeout(async()=>{
      try{
        let promessa = opcoesInFlightRef.current.get(cacheKey);
        if(!promessa){
          promessa = Promise.resolve(onFetchColumnOptions(coluna,filtrosParaConsulta,termo));
          opcoesInFlightRef.current.set(cacheKey,promessa);
        }
        const opcoes = await promessa;
        const apelidoCol = colunasApelidos[coluna]||"";
        const normalizadas = Array.isArray(opcoes)?opcoes.map(opt=>({...opt,exibicao:opt.chave==="##NULL##"?"-":formatarDado(opt.chave,coluna,apelidoCol)})):[];
        opcoesCacheRef.current.set(cacheKey,normalizadas);
        if(!mountedRef.current||requestId!==opcoesRequestRef.current) return;
        setOpcoesBancoColuna(normalizadas);
      }catch(err){
        if(!mountedRef.current||requestId!==opcoesRequestRef.current) return;
        console.error("Erro ao carregar opções da coluna:",err);
        setOpcoesBancoColuna([]);
      }finally{
        opcoesInFlightRef.current.delete(cacheKey);
        if(mountedRef.current&&requestId===opcoesRequestRef.current) setLoadingOpcoes(false);
      }
    },termo?250:0);
    return()=>{clearTimeout(atraso);};
  },[menuAtivo?.tipo,menuAtivo?.coluna,termoBuscaFiltro,filtrosGlobais,onFetchColumnOptions,columnOptionsContextKey,tableId,colunasApelidos]);

  const abrirMenuColunasGeral = e=>{
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 275, popupHeight = 300;
    let leftPos = rect.left;
    if(leftPos+popupWidth>window.innerWidth-15) leftPos = window.innerWidth-popupWidth-15;
    if(leftPos<15) leftPos = 15;
    let topPos = rect.bottom+4;
    if(topPos+popupHeight>window.innerHeight-15) topPos = rect.top-popupHeight-4;
    if(topPos<15) topPos = 15;
    setPosicaoPopup({top:topPos,left:leftPos});
    setTempColunasOcultas([...colunasOcultas]);
    setMenuAtivo({tipo:"colunas"});
  };

  const salvarApelidoColuna = coluna=>{
    const novosApelidos = {...colunasApelidos,[coluna]:novoApelidoCol};
    setColunasApelidos(novosApelidos);
    localStorage.setItem(`${tableId}_apelidos`,JSON.stringify(novosApelidos));
    setEditandoNome(false);
  };

  const aplicarFiltrosCompletos = coluna=>{
    let novasRegras = [];
    if(inputMaiorQue.trim()!=="") novasRegras.push(`>=|${inputMaiorQue.trim().replace(",", ".")}`);
    if(inputMenorQue.trim()!=="") novasRegras.push(`<=|${inputMenorQue.trim().replace(",", ".")}`);
    if(tempFiltrosCheckbox.size>0) novasRegras = [...novasRegras, ...Array.from(tempFiltrosCheckbox)];

    let copia = {...filtrosGlobais};
    if(novasRegras.length===0) delete copia[coluna];
    else copia[coluna] = novasRegras;
    if(!filtrosControlados) setFiltrosLocais(copia);
    setMenuAtivo(null);
    if(onFilterChange) onFilterChange(copia);
    if(onPageChange) onPageChange(1);
  };

  const limparFiltroColuna = coluna=>{
    let copia = {...filtrosGlobais};
    delete copia[coluna];
    if(!filtrosControlados) setFiltrosLocais(copia);
    setMenuAtivo(null);
    if(onFilterChange) onFilterChange(copia);
    if(onPageChange) onPageChange(1);
  };

  const limparTodosFiltros = ()=>{
    if(!filtrosControlados) setFiltrosLocais({});
    setMenuAtivo(null);
    if(onFilterChange) onFilterChange({});
    if(onPageChange) onPageChange(1);
  };

  const aplicarColunasOcultas = ()=>{
    setColunasOcultas(tempColunasOcultas);
    localStorage.setItem(`${tableId}_ocultas`,JSON.stringify(tempColunasOcultas));
    setMenuAtivo(null);
  };

  const colunasVisiveis = colunasTabela.filter(c=>!colunasOcultas.includes(c));

  const opcoesFiltroAtual = useMemo(()=>{
    let baseOpcoes = [];
    if(opcoesBancoColuna.length>0){
      baseOpcoes = [...opcoesBancoColuna];
    }else{
      const coluna = menuAtivo?.coluna;
      if(!coluna) return [];
      const apelidoCol = colunasApelidos[coluna]||"";
      const vistos = new Set();
      for(const item of data){
        const val = item[coluna];
        const texto = val===null||val===undefined?"":String(val).trim();
        const isNull = texto===""||texto==="-"||texto.toLowerCase()==="null"||texto.toLowerCase()==="undefined";
        
        let chave = isNull ? "##NULL##" : texto;
        if(coluna === "avanco" && !isNull) {
          const num = parseFloat(texto.replace(",", "."));
          if(!isNaN(num)) chave = String(num);
        }

        if(!vistos.has(chave)){
          vistos.add(chave);
          baseOpcoes.push({
            chave,
            exibicao: isNull ? "-" : (coluna === "avanco" ? `${Number(chave).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:2})}%` : formatarDado(val, coluna, apelidoCol))
          });
        }
      }
    }
    baseOpcoes.sort((a,b)=>{
      if(a.chave==="##NULL##") return 1;
      if(b.chave==="##NULL##") return -1;
      const numA = Number(a.chave), numB = Number(b.chave);
      if(!isNaN(numA)&&!isNaN(numB)) return numA - numB;
      const regexData = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const matchA = String(a.exibicao).match(regexData);
      const matchB = String(b.exibicao).match(regexData);
      if(matchA&&matchB){
        const valA = Number(`${matchA[3]}${matchA[2]}${matchA[1]}`);
        const valB = Number(`${matchB[3]}${matchB[2]}${matchB[1]}`);
        return valA-valB;
      }
      return String(a.exibicao).localeCompare(String(b.exibicao),"pt-BR",{numeric:true,sensitivity:"base"});
    });
    if(!termoBuscaFiltro) return baseOpcoes;
    const termoLower = termoBuscaFiltro.toLocaleLowerCase("pt-BR");
    return baseOpcoes.filter(op=>String(op.exibicao).toLocaleLowerCase("pt-BR").includes(termoLower));
  },[opcoesBancoColuna,menuAtivo?.coluna,data,termoBuscaFiltro,colunasApelidos]);

  const colunaAtualEhData = useMemo(()=>menuAtivo?.coluna?colunaEhData(menuAtivo.coluna,data):false,[menuAtivo?.coluna,data]);

  const opcoesDataFiltro = useMemo(()=>{
    if(!colunaAtualEhData) return [];
    const datas = new Set();
    opcoesBancoColuna.forEach(op=>{
      const dataVal = normalizarDataInput(op.chave);
      if(dataVal) datas.add(dataVal);
    });
    data.forEach(row=>{
      const dataVal = normalizarDataInput(row?.[menuAtivo?.coluna]);
      if(dataVal) datas.add(dataVal);
    });
    return Array.from(datas).sort((a,b)=>a.localeCompare(b));
  },[colunaAtualEhData,opcoesBancoColuna,data,menuAtivo?.coluna]);

  const opcoesDataFinal = useMemo(()=>opcoesDataFiltro.filter(dataVal=>!inputMaiorQue||dataVal>=inputMaiorQue),[opcoesDataFiltro,inputMaiorQue]);

  const temFiltroNaColunaAtual = menuAtivo&&menuAtivo.tipo==="excel"&&filtrosGlobais[menuAtivo.coluna]&&filtrosGlobais[menuAtivo.coluna].length>0;
  const temQualquerFiltroAtivo = Object.keys(filtrosGlobais).some(col=>filtrosGlobais[col]&&filtrosGlobais[col].length>0);

  if(colunasTabela.length===0) return null;

  return(
    <div className={`table-card ${telaCheia?"maximized":""}`}>
      <style>{`
        .data-table-loading-dots::after{display:inline-block;content:"";width:18px;text-align:left;animation:dataTableLoadingDots 1.4s infinite steps(4,end)}
        @keyframes dataTableLoadingDots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}
        
        #tabela-cursor-tooltip {
          position: fixed;
          display: ${tooltipInfo.visivel ? "block" : "none"};
          background: #0f172a;
          color: #f8fafc;
          padding: 5px 10px;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: 6px;
          pointer-events: none;
          z-index: 999999;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);
          white-space: nowrap;
          left: ${tooltipInfo.x}px;
          top: ${tooltipInfo.y}px;
        }
      `}</style>

      <div id="tabela-cursor-tooltip">{tooltipInfo.texto}</div>
      
      <div className="table-responsive" style={{position:"relative",overflow:"auto"}}>
        {(loading||dadosProcessados.length===0)&&(
          <div style={{position:"absolute",top:"41px",left:0,width:"100%",minWidth:"100%",minHeight:"calc(100% - 41px)",backgroundColor:"#ffffff",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,color:"#64748b",fontWeight:"600",fontSize:"1rem"}}>
            {loading?(<div>{loadingTexto}<span className="data-table-loading-dots"></span></div>):(<div>Nenhum registro encontrado.</div>)}
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th className="table-col-checkbox-th" style={{display:loading?"none":""}}>
                <button className="excel-filter-btn table-col-checkbox-btn" onClick={abrirMenuColunasGeral} title="Gerenciar Colunas">
                  <Columns3 size={14}/>
                </button>
              </th>
              {colunasVisiveis.map((col,idx)=>{
                if(String(col).toLowerCase() === "descricao") return null;

                const ativo = (filtrosGlobais[col]&&filtrosGlobais[col].length>0)||ordenacao.coluna===col;
                const nomeExibicao = colunasApelidos[col]||col.toUpperCase();
                return(
                  <th key={col} draggable onDragStart={()=>setDraggedColIdx(idx)} onDragOver={e=>e.preventDefault()} onDrop={e=>{
                    e.preventDefault();
                    if(draggedColIdx===null||draggedColIdx===idx) return;
                    const novas = [...colunasTabela];
                    const movida = novas.splice(draggedColIdx,1)[0];
                    novas.splice(idx,0,movida);
                    setColunasTabela(novas);
                    localStorage.setItem(`${tableId}_ordem`,JSON.stringify(novas));
                    setDraggedColIdx(null);
                  }} className="draggable-th">
                    <div className="th-cell-container" onClick={e=>abrirMenuExcel(col,e)}>
                      <span className="th-title-text" title={nomeExibicao}>{nomeExibicao}</span>
                      <div className="th-actions-group">
                        <button id={`btn_col_${col}`} className={`excel-filter-btn ${ativo?"active":""}`}>
                          <ChevronDown size={14}/>
                        </button>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody style={{backgroundColor:(loading||dadosProcessados.length===0)?"#ffffff":"transparent"}}>
            {!loading&&dadosProcessados.length>0&&dadosProcessados.map((row,index)=>{
              const rowId = row.id??`row-${index}`;
              const selecionada = linhasSelecionadas.has(rowId);
              return(
                <tr key={rowId} className={selecionada?"selected":""}>
                  <td className="table-col-checkbox-td" style={{display:loading?"none":""}} onDoubleClick={handleDoubleClickCheckboxCell} title="Dê duplo clique para selecionar/desselecionar todos">
                    <input type="checkbox" checked={selecionada} onChange={()=>toggleSelecionarLinha(rowId)} className="table-col-checkbox-input"/>
                  </td>
                  {colunasVisiveis.map(col=>{
                    const apelidoCol = colunasApelidos[col]||"";
                    
                    if(String(col).toLowerCase() === "descricao") return null;

                    if(String(col).toLowerCase() === "pep"){
                      const textoDescricao = row.descricao ? String(row.descricao) : "Sem descrição";
                      return (
                        <td 
                          key={col}
                          onMouseEnter={()=>{
                            setTooltipInfo({ visivel: true, texto: textoDescricao, x: 0, y: 0 });
                          }}
                          onMouseMove={e=>{
                            setTooltipInfo(prev => ({ ...prev, x: e.clientX + 12, y: e.clientY + 12 }));
                          }}
                          onMouseLeave={()=>{
                            setTooltipInfo({ visivel: false, texto: "", x: 0, y: 0 });
                          }}
                          style={{ cursor: "default" }}
                        >
                          {formatarDado(row[col], col, apelidoCol)}
                        </td>
                      );
                    }

                    return <td key={col}>{formatarDado(row[col],col,apelidoCol)}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <div className="page-controls" style={{fontWeight:"500",color:"#334155"}}>
          {loading?<>Carregando registros<span className="data-table-loading-dots"></span></>:<>Mostrando <strong>{dadosProcessados.length}</strong> de <strong>{totalRegistrosReal}</strong> registros do banco</>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div className="page-controls">
            <span>Mostrar:</span>
            <select value={registrosPorPagina} onChange={e=>{if(onLimitChange) onLimitChange(Number(e.target.value));}}>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
            </select>
          </div>
          <div className="page-controls">
            <span className="page-indicator">Página {paginaAtual} de {totalPaginas}</span>
            <div className="page-buttons-group">
              <button disabled={paginaAtual===1} onClick={()=>onPageChange&&onPageChange(1)} title="Primeira Página">
                <div style={{display:"flex",marginLeft:"-2px"}}><ChevronLeft size={14}/><ChevronLeft size={14} style={{marginLeft:"-6px"}}/></div>
              </button>
              <button disabled={paginaAtual===1} onClick={()=>onPageChange&&onPageChange(paginaAtual-1)} title="Página Anterior">
                <ChevronLeft size={14}/>
              </button>
              <button disabled={paginaAtual===totalPaginas} onClick={()=>onPageChange&&onPageChange(paginaAtual+1)} title="Próxima Página">
                <ChevronRight size={14}/>
              </button>
              <button disabled={paginaAtual===totalPaginas} onClick={()=>onPageChange&&onPageChange(totalPaginas)} title="Última Página">
                <div style={{display:"flex",marginRight:"-2px"}}><ChevronRight size={14}/><ChevronRight size={14} style={{marginLeft:"-6px"}}/></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {menuAtivo&&(
        <div ref={popupRef} className="excel-filter-popup show" style={{top:`${posicaoPopup.top}px`,left:`${posicaoPopup.left}px`}} onClick={e=>e.stopPropagation()}>
          {menuAtivo.tipo==="excel"&&(
            <div className="excel-card-completo">
              <div className="excel-column-title-box">
                {editandoNome?(
                  <div style={{display:"flex",gap:"4px",width:"100%",alignItems:"center"}}>
                    <input type="text" className="excel-filter-input" value={novoApelidoCol} onChange={e=>setNovoApelidoCol(e.target.value)} autoFocus/>
                    <button className="excel-filter-btn active" onClick={()=>salvarApelidoColuna(menuAtivo.coluna)} title="Salvar Nome"><Check size={13}/></button>
                  </div>
                ):(
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%"}}>
                    <span className="excel-column-name-label">Coluna: <strong>{colunasApelidos[menuAtivo.coluna]||menuAtivo.coluna.toUpperCase()}</strong></span>
                    <button className="excel-filter-btn" onClick={()=>setEditandoNome(true)} title="Editar Nome da Coluna"><Edit2 size={12}/></button>
                  </div>
                )}
              </div>
              <div className="menu-opcoes-divider"></div>
              <div className="excel-section">
                {/* Botões ajustados para chamar o onSortChange */}
                <button className={`excel-filter-item menu-opcoes-btn bg-transparent ${ordenacao.coluna===menuAtivo.coluna&&ordenacao.asc?"ordenacao-ativa":""}`} onClick={()=>{
                  const novaOrd = {coluna:menuAtivo.coluna,asc:true};
                  if(!ordenacaoControlada) setOrdenacaoLocal(novaOrd);
                  if(onSortChange) onSortChange(novaOrd);
                  setMenuAtivo(null);
                }}>
                  <ArrowUp size={13}/><span>Ordenar de A a Z</span>
                  {ordenacao.coluna===menuAtivo.coluna&&ordenacao.asc&&<Check size={12} style={{marginLeft:"auto",color:"#005596"}}/>}
                </button>
                <button className={`excel-filter-item menu-opcoes-btn bg-transparent ${ordenacao.coluna===menuAtivo.coluna&&!ordenacao.asc?"ordenacao-ativa":""}`} onClick={()=>{
                  const novaOrd = {coluna:menuAtivo.coluna,asc:false};
                  if(!ordenacaoControlada) setOrdenacaoLocal(novaOrd);
                  if(onSortChange) onSortChange(novaOrd);
                  setMenuAtivo(null);
                }}>
                  <ArrowDown size={13}/><span>Ordenar de Z a A</span>
                  {ordenacao.coluna===menuAtivo.coluna&&!ordenacao.asc&&<Check size={12} style={{marginLeft:"auto",color:"#005596"}}/>}
                </button>
              </div>
              <div className="menu-opcoes-divider"></div>
              <div className="excel-section">
                <span className="excel-filter-header">{colunaAtualEhData?"Filtro por Período":"Filtro Numérico (Condicional)"}</span>
                {colunaAtualEhData?(
                  <div style={{display:"flex",gap:"5px",width:"100%"}}>
                    <div style={{flex:1}}>
                      <label style={{display:"block",fontSize:"0.68rem",color:"#64748b",marginBottom:"2px"}}>Data inicial</label>
                      <input type="date" className="excel-filter-input" value={inputMaiorQue} min={opcoesDataFiltro[0]||undefined} max={opcoesDataFiltro[opcoesDataFiltro.length-1]||undefined} onChange={e=>{
                        const valor = e.target.value;
                        if(valor&&!opcoesDataFiltro.includes(valor)) return;
                        setInputMaiorQue(valor);
                        if(inputMenorQue&&valor&&inputMenorQue<valor) setInputMenorQue("");
                      }} style={{width:"100%"}}/>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{display:"block",fontSize:"0.68rem",color:"#64748b",marginBottom:"2px"}}>Data final</label>
                      <input type="date" className="excel-filter-input" value={inputMenorQue} min={inputMaiorQue||opcoesDataFiltro[0]||undefined} max={opcoesDataFiltro[opcoesDataFiltro.length-1]||undefined} onChange={e=>{
                        const valor = e.target.value;
                        if(valor&&(!opcoesDataFinal.includes(valor)||(inputMaiorQue&&valor<inputMaiorQue))) return;
                        setInputMenorQue(valor);
                      }} style={{width:"100%"}} disabled={!opcoesDataFinal.length}/>
                    </div>
                  </div>
                ):(
                  <div style={{display:"flex",gap:"4px",width:"100%"}}>
                    <input type="text" className="excel-filter-input" placeholder="Maior (>=)" value={inputMaiorQue} onChange={e=>setInputMaiorQue(e.target.value)} style={{flex:1}}/>
                    <input type="text" className="excel-filter-input" placeholder="Menor (<=)" value={inputMenorQue} onChange={e=>setInputMenorQue(e.target.value)} style={{flex:1}}/>
                  </div>
                )}
              </div>
              <div className="menu-opcoes-divider"></div>
              <div className="excel-section">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1px"}}>
                  <span className="excel-filter-header">Filtrar por Valores</span>
                  {temQualquerFiltroAtivo&&(
                    <span className="excel-filter-header-acoes" onClick={limparTodosFiltros} style={{color:"#dc2626",display:"inline-flex",alignItems:"center",gap:"3px",fontSize:"0.72rem"}} title="Limpar todos os filtros da tabela">
                      <RotateCcw size={11}/> Limpar Todos
                    </span>
                  )}
                </div>
                <input type="text" className="excel-filter-input" placeholder="Pesquisar..." value={termoBuscaFiltro} onChange={e=>setTermoBuscaFiltro(e.target.value)}/>
                <div style={{display:"flex",justifyContent:"space-between",margin:"2px 0",fontSize:"0.7rem"}}>
                  <span className="excel-filter-header-acoes" onClick={()=>setTempFiltrosCheckbox(new Set(opcoesFiltroAtual.map(o=>o.chave)))}>Selecionar Todos</span>
                  <span className="excel-filter-header-acoes" onClick={()=>setTempFiltrosCheckbox(new Set())}>Limpar</span>
                </div>
                <div className="excel-filter-list-valores">
                  {loadingOpcoes?(
                    <div style={{padding:"10px",textAlign:"center",fontSize:"0.8rem",color:"#64748b"}}>Carregando valores...</div>
                  ):(
                    opcoesFiltroAtual.map(op=>{
                      const marcado = tempFiltrosCheckbox.has(op.chave);
                      return(
                        <label key={op.chave} className="excel-filter-item">
                          <input type="checkbox" checked={marcado} onChange={e=>{
                            const novo = new Set(tempFiltrosCheckbox);
                            if(e.target.checked) novo.add(op.chave);
                            else novo.delete(op.chave);
                            setTempFiltrosCheckbox(novo);
                          }}/>
                          <span>{op.exibicao}</span>
                        </label>
                      );
                    })
                  )}
                  {!loadingOpcoes&&Array.from({length:Math.max(0,6-opcoesFiltroAtual.length)}).map((_,index)=>(
                    <div key={`vazio-${index}`} className="excel-filter-item-vazio">
                      <div className="excel-vazio-checkbox-mock"></div>
                      <div className="excel-vazio-linha-mock"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="excel-filter-footer">
                {temFiltroNaColunaAtual&&<button className="btn-limpar-filtro" onClick={()=>limparFiltroColuna(menuAtivo.coluna)}>Limpar Filtro</button>}
                <div className="excel-filter-footer-group" style={{marginLeft:temFiltroNaColunaAtual?"auto":"0"}}>
                  <button className="btn-cancelar" onClick={()=>setMenuAtivo(null)}>Cancelar</button>
                  <button className="btn-aplicar-filtro" onClick={()=>aplicarFiltrosCompletos(menuAtivo.coluna)}>Aplicar</button>
                </div>
              </div>
            </div>
          )}

          {menuAtivo.tipo==="colunas"&&(
            <div className="excel-card-completo" onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2px"}}>
                <span className="excel-filter-header" style={{fontSize:"0.8rem",fontWeight:700}}>Gerenciar Colunas</span>
                <button className="btn-action-item" style={{padding:"2px 6px",fontSize:"0.7rem",height:"22px"}} onClick={()=>{setTelaCheia(!telaCheia);setMenuAtivo(null);}}>
                  {telaCheia?<Minimize2 size={12}/>:<Maximize2 size={12}/>}
                  <span>{telaCheia?"Restaurar":"Expandir"}</span>
                </button>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px",fontSize:"0.7rem"}}>
                <span className="excel-filter-header-acoes" onClick={()=>setTempColunasOcultas([])}>Exibir Todas</span>
                <span className="excel-filter-header-acoes" onClick={()=>setTempColunasOcultas([...colunasTabela])}>Ocultar Todas</span>
              </div>
              <div className="excel-filter-list-colunas">
                {colunasTabela.map(col=>{
                  const visivel = !tempColunasOcultas.includes(col);
                  const nomeCol = colunasApelidos[col]||col.toUpperCase();
                  return(
                    <label key={col} className="excel-filter-item">
                      <input type="checkbox" checked={visivel} onChange={()=>{
                        let novas = [...tempColunasOcultas];
                        if(visivel) novas.push(col);
                        else novas = novas.filter(c=>c!==col);
                        setTempColunasOcultas(novas);
                      }}/>
                      <span>{nomeCol}</span>
                    </label>
                  );
                })}
              </div>
              <div className="excel-filter-footer">
                <button className="btn-cancelar" onClick={()=>setMenuAtivo(null)}>Cancelar</button>
                <div className="excel-filter-footer-group">
                  <button className="btn-aplicar-filtro" onClick={aplicarColunasOcultas}>Aplicar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}