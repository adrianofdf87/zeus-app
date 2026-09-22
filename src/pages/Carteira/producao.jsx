import React,{useState,useEffect,useRef}from"react";
import{supabase}from"../../services/supabase";
import Swal from"sweetalert2";
import{TrendingUp,Table,X,ArrowUp,ArrowDown,ArrowUpDown,RefreshCw,Search,Filter}from"lucide-react";
import"../BancoDados/tabelas_internas.css";

export default function Producao(){
  const[loading,setLoading]=useState(true),[todosDados,setTodosDados]=useState([]);
  const[colunasDisponiveis,setColunasDisponiveis]=useState([]),[valoresColunaAtual,setValoresColunaAtual]=useState([]);
  const[termoPesquisaColuna,setTermoPesquisaColuna]=useState(""),[termoPesquisaValor,setTermoPesquisaValor]=useState("");
  const[tipoFiltroAtual,setTipoFiltroAtual]=useState(""),[valoresSelecionadosTemp,setValoresSelecionadosTemp]=useState([]),[filtrosAtivos,setFiltrosAtivos]=useState({});
  const[filtroCruzadoTipoOs,setFiltroCruzadoTipoOs]=useState(null),[filtroCruzadoNumOs,setFiltroCruzadoNumOs]=useState(null);
  const[dropdownColunaAberto,setDropdownColunaAberto]=useState(false),[dropdownValorAberto,setDropdownValorAberto]=useState(false);
  const dropdownColunaRef=useRef(null),dropdownValorRef=useRef(null);
  const[ordenacaoTabela1,setOrdenacaoTabela1]=useState({campo:"soma_valor_proj",direcao:"desc"});
  const[ordenacaoTabela2,setOrdenacaoTabela2]=useState({campo:"num_os",direcao:"asc"});
  const[totaisGerais,setTotaisGerais]=useState({qtdOs:0,numOsTotal:0,valorProjTotal:0,valorProdTotal:0,valorProdTotalGeral:0,valorFatuTotal:0});
  const[dadosProcessadosTabela,setDadosProcessadosTabela]=useState([]),[dadosIndividuaisNumOs,setDadosIndividuaisNumOs]=useState([]);

  const AlertaLimpo=Swal.mixin({
    showCancelButton:false,showConfirmButton:true,confirmButtonText:"OK",
    allowOutsideClick:false,allowEscapeKey:true,buttonsStyling:true,
    customClass:{popup:"swal-feedback",confirmButton:"swal-botao-ok-curto",cancelButton:"swal-esconder-cancelamento"}
  });

  useEffect(()=>{carregarTodosDadosProdutividade()},[]);
  useEffect(()=>{
    const handleClickFora=e=>{
      if(dropdownColunaRef.current&&!dropdownColunaRef.current.contains(e.target))setDropdownColunaAberto(false);
      if(dropdownValorRef.current&&!dropdownValorRef.current.contains(e.target))setDropdownValorAberto(false);
    };
    document.addEventListener("mousedown",handleClickFora);
    return()=>document.removeEventListener("mousedown",handleClickFora);
  },[]);

  useEffect(()=>{
    if(!tipoFiltroAtual||!Array.isArray(todosDados)||!todosDados.length){
      setValoresColunaAtual([]);setValoresSelecionadosTemp([]);setTermoPesquisaValor("");return;
    }
    const valoresSet=new Set();
    todosDados.forEach(item=>{
      if(!item||typeof item!=="object")return;
      const val=item[tipoFiltroAtual];
      if(tipoFiltroAtual==="meses"&&val&&typeof val==="object")
        Object.keys(val).forEach(m=>{if(m)valoresSet.add(m)});
      else if(val!==undefined&&val!==null&&val!=="")
        valoresSet.add(tipoFiltroAtual.includes("data")?String(val).substring(0,7):String(val));
    });
    setValoresColunaAtual(Array.from(valoresSet).filter(v=>!tipoFiltroAtual.includes("data")||v.length===7).sort().reverse());
    setValoresSelecionadosTemp([]);setTermoPesquisaValor("");
  },[tipoFiltroAtual,todosDados]);

  const carregarTodosDadosProdutividade=async()=>{
    try{
      setLoading(true);let allData=[],page=0,fetchMore=true;
      while(fetchMore){
        const{data,error}=await supabase.from("view_dados_produtividade").select("*").range(page*1000,(page+1)*1000-1);
        if(error)throw error;
        if(data?.length){allData=allData.concat(data);data.length<1000?fetchMore=false:page++}
        else fetchMore=false;
      }
      setTodosDados(allData);
      if(allData.length&&allData[0]){
        setColunasDisponiveis(Object.keys(allData[0]).filter(c=>!c.includes("id")&&!["valor_proj","valor_prod","valor_fatu"].includes(c)));
      }
      processarDados(allData,{},null,null);
    }catch(error){
      console.error("Erro ao carregar view_dados_produtividade:",error);
      AlertaLimpo.fire({icon:"error",title:"Erro",text:"Não foi possível carregar os dados: "+(error.message||error)});
    }finally{setLoading(false)}
  };

  const adicionarFiltroDinamico=()=>{
    if(!tipoFiltroAtual||!valoresSelecionadosTemp.length)return;
    setFiltrosAtivos(prev=>{
      const novos={...prev,[tipoFiltroAtual]:[...valoresSelecionadosTemp]};
      processarDados(todosDados,novos,filtroCruzadoTipoOs,filtroCruzadoNumOs);return novos;
    });
    setValoresSelecionadosTemp([]);setDropdownValorAberto(false);
  };

  const removerFiltroItem=(campo,valor)=>{
    setFiltrosAtivos(prev=>{
      const novos={...prev};
      if(novos[campo]){
        novos[campo]=novos[campo].filter(v=>v!==valor);
        if(!novos[campo].length)delete novos[campo];
      }
      processarDados(todosDados,novos,filtroCruzadoTipoOs,filtroCruzadoNumOs);return novos;
    });
  };

  const limparTodosFiltros=()=>{
    setFiltrosAtivos({});setTipoFiltroAtual("");setValoresSelecionadosTemp([]);
    setTermoPesquisaValor("");setTermoPesquisaColuna("");
    setFiltroCruzadoTipoOs(null);setFiltroCruzadoNumOs(null);
    setDropdownColunaAberto(false);setDropdownValorAberto(false);
    processarDados(todosDados,{},null,null);
  };

  const processarDados=(dados,filtros,cruzadoTipo,cruzadoNumOs)=>{
    if(!Array.isArray(dados)){setDadosProcessadosTabela([]);setDadosIndividuaisNumOs([]);return}

    const filtrados=[];
    dados.forEach(item=>{
      if(!item)return;
      let atende=true;
      Object.keys(filtros).forEach(campo=>{
        const permitidos=filtros[campo],val=item[campo];
        if(!permitidos?.length)return;
        if(val===undefined||val===null){atende=false;return}
        if(campo==="meses"&&typeof val==="object"){
          if(!permitidos.some(m=>val.hasOwnProperty(m)&&Number(val[m])>0))atende=false;
        }else if(campo.includes("data")){
          if(!permitidos.some(v=>String(val).startsWith(v)))atende=false;
        }else if(!permitidos.includes(String(val)))atende=false;
      });
      if(cruzadoTipo&&item.tipo_os!==cruzadoTipo)atende=false;
      if(cruzadoNumOs&&(item.num_os!==cruzadoNumOs&&item.ordem_servico!==cruzadoNumOs))atende=false;

      if(atende){
        const proc={...item};
        if(filtros.meses?.length&&item.meses&&typeof item.meses==="object")
          proc.valor_prod=filtros.meses.reduce((s,m)=>s+(Number(item.meses[m])||0),0);
        filtrados.push(proc);
      }
    });

    let somaProj=0,somaProd=0,somaProdTotal=0,somaFatu=0,qtd=0;
    const numSet=new Set(),agrTipo={},agrOs={},somaTotalMesesPorOs={};

    dados.forEach(item=>{
      const os=item.num_os||item.ordem_servico||"N/I";
      if(item.meses&&typeof item.meses==="object")
        somaTotalMesesPorOs[os]=Object.values(item.meses).reduce((s,v)=>s+(Number(v)||0),0);
      else somaTotalMesesPorOs[os]=Number(item.valor_prod)||0;
    });

    filtrados.forEach(item=>{
      const tipo=item.tipo_os||"Não Definido",os=item.num_os||item.ordem_servico||"N/I";
      const proj=Number(item.valor_proj)||0,prod=Number(item.valor_prod)||0;
      const prodTotal=somaTotalMesesPorOs[os]??prod,fatu=Number(item.valor_fatu)||0;

      somaProj+=proj;somaProd+=prod;somaProdTotal+=prodTotal;somaFatu+=fatu;qtd++;if(os)numSet.add(os);

      if(!agrTipo[tipo])agrTipo[tipo]={tipo_os:tipo,qtd_os:0,numOsSet:new Set(),soma_valor_proj:0,soma_valor_prod:0,soma_valor_fatu:0};
      const g=agrTipo[tipo];
      g.qtd_os++;if(os)g.numOsSet.add(os);g.soma_valor_proj+=proj;g.soma_valor_prod+=prod;g.soma_valor_fatu+=fatu;

      if(!agrOs[os])agrOs[os]={
        num_os:os,tipo_os:tipo,pep:item.pep||"N/I",status:item.status||"N/I",
        valor_proj:proj,valor_prod_total:prodTotal,valor_prod:prod,prod_x_proj:0,
        fatu_x_prod:0,fatu_x_proj:0,valor_fatu:fatu
      };
      else{
        agrOs[os].valor_proj+=proj;agrOs[os].valor_prod+=prod;agrOs[os].valor_fatu+=fatu;
      }
    });

    setTotaisGerais({qtdOs:qtd,numOsTotal:numSet.size,valorProjTotal:somaProj,valorProdTotal:somaProd,valorProdTotalGeral:somaProdTotal,valorFatuTotal:somaFatu});

    setDadosProcessadosTabela(Object.values(agrTipo).map(g=>({
      tipo_os:g.tipo_os,qtd_os:g.qtd_os,num_os:g.numOsSet.size,
      soma_valor_proj:g.soma_valor_proj,
      perc_valor_proj:somaProj>0?g.soma_valor_proj/somaProj*100:0,
      soma_valor_prod:g.soma_valor_prod,
      perc_valor_prod:somaProd>0?g.soma_valor_prod/somaProd*100:0,
      soma_valor_fatu:g.soma_valor_fatu,
      perc_valor_fatu:somaFatu>0?g.soma_valor_fatu/somaFatu*100:0
    })));

    setDadosIndividuaisNumOs(Object.values(agrOs).map(item=>({
      ...item,
      prod_x_proj:item.valor_proj>0?item.valor_prod_total/item.valor_proj*100:0,
      fatu_x_prod:item.valor_prod>0?item.valor_fatu/item.valor_prod*100:0,
      fatu_x_proj:item.valor_proj>0?item.valor_fatu/item.valor_proj*100:0
    })));
  };

  const handleLinhaTabela1Click=tipo=>{
    const novo=filtroCruzadoTipoOs===tipo?null:tipo;
    setFiltroCruzadoTipoOs(novo);setFiltroCruzadoNumOs(null);
    processarDados(todosDados,filtrosAtivos,novo,null);
  };

  const handleLinhaTabela2Click=os=>{
    const novo=filtroCruzadoNumOs===os?null:os;
    setFiltroCruzadoNumOs(novo);setFiltroCruzadoTipoOs(null);
    processarDados(todosDados,filtrosAtivos,null,novo);
  };

  const limparFiltroCruzado=()=>{
    setFiltroCruzadoTipoOs(null);setFiltroCruzadoNumOs(null);
    processarDados(todosDados,filtrosAtivos,null,null);
  };

  const ordenarDados=(dados,campo,direcao)=>[...dados].sort((a,b)=>{
    let A=a[campo],B=b[campo];
    if(A==null)A="";if(B==null)B="";
    if(typeof A==="string")A=A.toLowerCase();
    if(typeof B==="string")B=B.toLowerCase();
    return A<B?(direcao==="asc"?-1:1):A>B?(direcao==="asc"?1:-1):0;
  });

  const dadosTabela1Ordenados=ordenarDados(dadosProcessadosTabela,ordenacaoTabela1.campo,ordenacaoTabela1.direcao);
  const dadosTabela2Ordenados=ordenarDados(dadosIndividuaisNumOs,ordenacaoTabela2.campo,ordenacaoTabela2.direcao);

  const alternarOrdenacaoTabela1=campo=>setOrdenacaoTabela1(p=>({campo,direcao:p.campo===campo&&p.direcao==="asc"?"desc":"asc"}));
  const alternarOrdenacaoTabela2=campo=>setOrdenacaoTabela2(p=>({campo,direcao:p.campo===campo&&p.direcao==="asc"?"desc":"asc"}));

  const renderSetaOrdenacao=(atual,alvo,direcao)=>atual!==alvo
    ?<ArrowUpDown size={11} style={{color:"#94a3b8",opacity:.6}}/>
    :direcao==="asc"
      ?<ArrowUp size={11} strokeWidth={2.5} style={{color:"#005596"}}/>
      :<ArrowDown size={11} strokeWidth={2.5} style={{color:"#005596"}}/>;

  const getEstiloCabecalho=(atual,alvo)=>{
    const ativo=atual===alvo;
    return{cursor:"pointer",userSelect:"none",backgroundColor:ativo?"#e0f2fe":"transparent",color:ativo?"#005596":"inherit",transition:"background .15s,color .15s"};
  };

  const formatarMoeda=v=>(Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  const colunasFiltradasPelaBusca=colunasDisponiveis.filter(c=>c&&c.toLowerCase().includes(termoPesquisaColuna.toLowerCase()));
  const valoresFiltradosPelaBusca=valoresColunaAtual.filter(v=>v&&String(v).toLowerCase().includes(termoPesquisaValor.toLowerCase()));

  const toggleValorTemp=val=>setValoresSelecionadosTemp(p=>p.includes(val)?p.filter(v=>v!==val):[...p,val]);

  const selecionarTodosValoresVisiveis=()=>{
    const visiveis=valoresFiltradosPelaBusca,selecionados=visiveis.every(v=>valoresSelecionadosTemp.includes(v));
    if(selecionados)setValoresSelecionadosTemp(p=>p.filter(v=>!visiveis.includes(v)));
    else setValoresSelecionadosTemp(Array.from(new Set([...valoresSelecionadosTemp,...visiveis])));
  };

  const temFiltroAtivo=Object.keys(filtrosAtivos).length>0||filtroCruzadoTipoOs!==null||filtroCruzadoNumOs!==null;
  const alturaUnificadaEstilo={height:"32px",boxSizing:"border-box"};

  /* PERCENTUAL: <100 vermelho | >=100 verde */
  const RenderPercentual=({valor,compact=false})=>{
    const n=Number(valor)||0,ok=n>=100,cor=ok?"#16a34a":"#dc2626";
    return(
      <div style={{display:"flex",alignItems:"center",gap:compact?4:5,width:"100%"}}>
        <span style={{fontSize:compact?10:11,fontWeight:700,color:cor,minWidth:compact?38:40,textAlign:"right"}}>
          {n.toFixed(1)}%
        </span>
        <div style={{flex:1,background:"#e2e8f0",height:compact?5:6,borderRadius:3,overflow:"hidden",minWidth:25}}>
          <div style={{width:`${Math.min(Math.max(n,0),100)}%`,background:cor,height:"100%",borderRadius:3,transition:"width .3s,background .3s"}}/>
        </div>
      </div>
    );
  };

  if(loading)return(
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",minHeight:"60vh"}}>
      <h3 style={{fontSize:16,color:"#005596",fontWeight:600,margin:0,textAlign:"center"}}>
        Carregando dados de produtividade...
      </h3>
    </div>
  );

  return(
    <div style={{width:"100%",height:"100vh",boxSizing:"border-box",display:"flex",flexDirection:"column",overflow:"hidden",background:"#f8fafc"}}>

      {/* CABEÇALHO + FILTROS: FORA DA ÁREA DE ROLAGEM */}
      <div style={{flexShrink:0,position:"relative",zIndex:1000,background:"#f8fafc",paddingBottom:8,paddingTop:4,borderBottom:"1px solid #e2e8f0",boxShadow:"0 2px 4px rgba(0,0,0,.04)"}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,background:"#fff",padding:"8px 12px",borderRadius:8,boxShadow:"0 1px 2px rgba(0,0,0,.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{background:"#0284c7",color:"#fff",width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 4px rgba(0,85,150,.2)"}}>
              <TrendingUp size={15}/>
            </div>
            <div>
              <h2 style={{margin:0,fontSize:".9rem",color:"#0f172a",fontWeight:700,lineHeight:1.2}}>Dashboard de Produtividade</h2>
              <p style={{margin:0,fontSize:".7rem",color:"#64748b"}}>Visão consolidada por Tipo de OS (view_dados_produtividade).</p>
            </div>
          </div>
          <button className="btn-adicionar-card-global" style={{...alturaUnificadaEstilo,position:"relative",top:"auto",right:"auto",padding:"0 12px",fontSize:".8rem"}} onClick={carregarTodosDadosProdutividade}>
            <RefreshCw size={13}/><span>Atualizar Dados</span>
          </button>
        </div>

        <div className="filter-bar" style={{padding:"8px 12px",background:"#fff",borderRadius:8,border:"1px solid #e2e8f0",boxShadow:"0 1px 2px rgba(0,0,0,.04)"}}>
          <div className="filter-controls-wrapper" style={{display:"flex",flexDirection:"column",gap:3}}>
            <div style={{display:"flex",alignItems:"center",gap:3,flexWrap:"wrap"}}>

              {/* COLUNAS */}
              <div ref={dropdownColunaRef} style={{position:"relative",display:"inline-block",minWidth:200}}>
                <div style={{...alturaUnificadaEstilo,background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:6,padding:"0 10px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",fontSize:12,color:tipoFiltroAtual?"#1e293b":"#64748b"}} onClick={()=>setDropdownColunaAberto(p=>!p)}>
                  <span>{tipoFiltroAtual?tipoFiltroAtual.toUpperCase():"Selecionar coluna..."}</span><span style={{fontSize:10,color:"#64748b"}}>▼</span>
                </div>
                {dropdownColunaAberto&&(
                  <div style={{position:"absolute",top:34,left:0,width:240,background:"#fff",border:"1px solid #cbd5e1",borderRadius:8,boxShadow:"0 10px 15px -3px rgba(0,0,0,.1)",zIndex:1000,padding:8}} onClick={e=>e.stopPropagation()}>
                    <div style={{position:"relative",marginBottom:3}}>
                      <Search size={13} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}/>
                      <input type="text" placeholder="Pesquisar coluna..." value={termoPesquisaColuna} onChange={e=>setTermoPesquisaColuna(e.target.value)} style={{width:"100%",height:26,padding:"0 6px 0 26px",fontSize:11,border:"1px solid #cbd5e1",borderRadius:4,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    <div style={{maxHeight:130,overflowY:"auto",border:"1px solid #f1f5f9",borderRadius:4,padding:2,display:"flex",flexDirection:"column",gap:3}}>
                      {!colunasFiltradasPelaBusca.length
                        ?<div style={{padding:6,textAlign:"center",fontSize:11,color:"#64748b"}}>Nenhuma coluna encontrada</div>
                        :colunasFiltradasPelaBusca.map(col=>(
                          <div key={col} onClick={()=>{setTipoFiltroAtual(col);setTermoPesquisaColuna("");setDropdownColunaAberto(false)}} style={{fontSize:11,padding:"4px 6px",borderRadius:4,cursor:"pointer",background:tipoFiltroAtual===col?"#e0f2fe":"transparent",color:tipoFiltroAtual===col?"#0369a1":"#334155",fontWeight:tipoFiltroAtual===col?600:500}}>
                            {col.toUpperCase()}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* VALORES */}
              <div ref={dropdownValorRef} style={{position:"relative",display:"inline-block",minWidth:240}}>
                <div style={{...alturaUnificadaEstilo,background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:6,padding:"0 10px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",fontSize:12,color:"#1e293b"}} onClick={()=>setDropdownValorAberto(p=>!p)}>
                  <span>{!valoresSelecionadosTemp.length?"Selecione os valores...":`${valoresSelecionadosTemp.length} selecionado(s)`}</span>
                  <span style={{fontSize:10,color:"#64748b"}}>▼</span>
                </div>

                {dropdownValorAberto&&(
                  <div style={{position:"absolute",top:34,left:0,width:280,background:"#fff",border:"1px solid #cbd5e1",borderRadius:8,boxShadow:"0 10px 15px -3px rgba(0,0,0,.1)",zIndex:1000,padding:8}} onClick={e=>e.stopPropagation()}>
                    <div style={{position:"relative",marginBottom:3}}>
                      <Search size={13} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}/>
                      <input type="text" placeholder="Pesquisar valor..." value={termoPesquisaValor} onChange={e=>setTermoPesquisaValor(e.target.value)} style={{width:"100%",height:26,padding:"0 6px 0 26px",fontSize:11,border:"1px solid #cbd5e1",borderRadius:4,outline:"none",boxSizing:"border-box"}}/>
                    </div>

                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3,color:"#005596",fontWeight:600,cursor:"pointer"}}>
                      <span onClick={selecionarTodosValoresVisiveis}>Selecionar Visíveis</span>
                      <span onClick={()=>setValoresSelecionadosTemp([])} style={{color:"#ef4444"}}>Limpar</span>
                    </div>

                    <div style={{maxHeight:130,overflowY:"auto",border:"1px solid #f1f5f9",borderRadius:4,padding:2,display:"flex",flexDirection:"column",gap:3}}>
                      {!valoresFiltradosPelaBusca.length
                        ?<div style={{padding:6,textAlign:"center",fontSize:11,color:"#64748b"}}>Nenhum valor encontrado</div>
                        :valoresFiltradosPelaBusca.map(val=>(
                          <label key={val} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"3px 5px",borderRadius:4,cursor:"pointer",background:valoresSelecionadosTemp.includes(val)?"#e0f2fe":"transparent"}}>
                            <input type="checkbox" checked={valoresSelecionadosTemp.includes(val)} onChange={()=>toggleValorTemp(val)} style={{accentColor:"#005596",cursor:"pointer"}}/>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#334155"}}>{val}</span>
                          </label>
                        ))}
                    </div>

                    <button type="button" onClick={adicionarFiltroDinamico} style={{width:"100%",marginTop:5,background:"#005596",color:"#fff",border:"none",borderRadius:4,height:26,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      Aplicar Seleção
                    </button>
                  </div>
                )}
              </div>

              <button type="button" className="filter-btn-aplicar" style={alturaUnificadaEstilo} onClick={adicionarFiltroDinamico}>Adicionar Filtro</button>

              {temFiltroAtivo&&(
                <button type="button" className="filter-btn-limpar-todos" style={alturaUnificadaEstilo} onClick={limparTodosFiltros} title="Limpar todos os filtros">
                  <X size={11}/> Limpar Todos
                </button>
              )}
            </div>

            <div className="filter-badges-container" style={{display:"flex",gap:3,flexWrap:"wrap",alignItems:"center"}}>
              {Object.keys(filtrosAtivos).map(campo=>filtrosAtivos[campo].map(valor=>(
                <div key={`${campo}-${valor}`} style={{display:"inline-flex",alignItems:"center",gap:4,background:"#e0f2fe",color:"#0369a1",padding:"2px 8px",borderRadius:12,fontSize:".72rem",fontWeight:500,border:"1px solid #bae6fd"}}>
                  <span>{campo}: <strong>{valor}</strong></span>
                  <button onClick={()=>removerFiltroItem(campo,valor)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#0369a1",display:"flex",alignItems:"center",padding:0}}><X size={11}/></button>
                </div>
              )))}

              {filtroCruzadoTipoOs&&(
                <div style={{display:"inline-flex",alignItems:"center",gap:4,background:"#d1fae5",color:"#065f46",padding:"2px 8px",borderRadius:12,fontSize:".72rem",fontWeight:600,border:"1px solid #a7f3d0"}}>
                  <Filter size={11}/><span>Tipo OS (Selecionado): <strong>{filtroCruzadoTipoOs}</strong></span>
                  <button onClick={limparFiltroCruzado} style={{background:"transparent",border:"none",cursor:"pointer",color:"#065f46",display:"flex",alignItems:"center",padding:0}}><X size={11}/></button>
                </div>
              )}

              {filtroCruzadoNumOs&&(
                <div style={{display:"inline-flex",alignItems:"center",gap:4,background:"#d1fae5",color:"#065f46",padding:"2px 8px",borderRadius:12,fontSize:".72rem",fontWeight:600,border:"1px solid #a7f3d0"}}>
                  <Filter size={11}/><span>Num OS (Selecionado): <strong>{filtroCruzadoNumOs}</strong></span>
                  <button onClick={limparFiltroCruzado} style={{background:"transparent",border:"none",cursor:"pointer",color:"#065f46",display:"flex",alignItems:"center",padding:0}}><X size={11}/></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SOMENTE ESTA ÁREA POSSUI ROLAGEM */}
      <div style={{flex:1,minHeight:0,overflowY:"auto",overflowX:"hidden",display:"flex",flexDirection:"column",gap:10,padding:"10px 0 40px",boxSizing:"border-box"}}>

        {/* CARD 1 */}
        <div style={{background:"#fff",borderRadius:8,boxShadow:"0 1px 2px rgba(0,0,0,.04)",border:"1px solid #e2e8f0",overflow:"hidden"}}>
          <div style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:5,background:"#f8fafc"}}>
            <Table size={15} color="#005596"/>
            <h3 style={{fontSize:12,fontWeight:700,color:"#0f172a",margin:0}}>
              Resumo de Produtividade por Tipo de OS <span style={{fontWeight:400,fontSize:11,color:"#64748b"}}>(Clique em uma linha para filtrar a tabela abaixo)</span>
            </h3>
          </div>

          {!dadosTabela1Ordenados.length
            ?<div style={{padding:18,textAlign:"center",color:"#64748b",fontSize:12}}>Nenhum registro encontrado para os filtros selecionados.</div>
            :<div style={{overflowX:"auto"}}>
              <table className="tabela-apoio-estilizada" style={{width:"100%"}}>
                <thead><tr>
                  {[
                    ["tipo_os","Tipo de OS"],
                    ["qtd_os","Qtd OS"],
                    ["soma_valor_proj","Valor Projetado"],
                    ["perc_valor_proj","% Part. Proj."],
                    ["soma_valor_prod","Valor Produzido"],
                    ["perc_valor_prod","% Part. Prod."],
                    ["soma_valor_fatu","Valor Faturado"],
                    ["perc_valor_fatu","% Part. Fatu."]
                  ].map(([campo,titulo])=>(
                    <th key={campo} onClick={()=>alternarOrdenacaoTabela1(campo)} style={{...getEstiloCabecalho(ordenacaoTabela1.campo,campo),...(campo.includes("perc_")?{width:130}:{})}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:4,justifyContent:campo==="qtd_os"?"center":"flex-start",width:campo==="qtd_os"?"100%":"auto"}}>
                        <span>{titulo}</span>{renderSetaOrdenacao(ordenacaoTabela1.campo,campo,ordenacaoTabela1.direcao)}
                      </div>
                    </th>
                  ))}
                </tr></thead>

                <tbody>
                  {dadosTabela1Ordenados.map((item,index)=>{
                    const selecionado=filtroCruzadoTipoOs===item.tipo_os;
                    return(
                      <tr key={index} onClick={()=>handleLinhaTabela1Click(item.tipo_os)}
                        style={{cursor:"pointer",backgroundColor:selecionado?"#e0f2fe":"transparent",transition:"background .15s"}}
                        onMouseEnter={e=>{if(!selecionado)e.currentTarget.style.background="#f8fafc"}}
                        onMouseLeave={e=>{if(!selecionado)e.currentTarget.style.background="transparent"}}>
                        <td style={{fontWeight:600,color:"#0f172a"}}>
                          <span style={{background:"#e0f2fe",color:"#005596",padding:"2px 6px",borderRadius:4,fontSize:10,fontWeight:700,textTransform:"uppercase"}}>{item.tipo_os}</span>
                        </td>
                        <td style={{textAlign:"center",fontWeight:600,color:"#334155"}}>{item.qtd_os.toLocaleString()}</td>
                        <td style={{fontWeight:600,color:"#0f172a"}}>{formatarMoeda(item.soma_valor_proj)}</td>
                        <td><RenderPercentual valor={item.perc_valor_proj}/></td>
                        <td style={{fontWeight:600,color:"#0f172a"}}>{formatarMoeda(item.soma_valor_prod)}</td>
                        <td><RenderPercentual valor={item.perc_valor_prod}/></td>
                        <td style={{fontWeight:600,color:"#0f172a"}}>{formatarMoeda(item.soma_valor_fatu)}</td>
                        <td><RenderPercentual valor={item.perc_valor_fatu}/></td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr style={{background:"#f1f5f9",borderTop:"2px solid #cbd5e1",fontWeight:700,color:"#0f172a"}}>
                    <td style={{padding:"8px 12px",textTransform:"uppercase",fontSize:11,letterSpacing:".5px"}}>Total Geral {temFiltroAtivo&&<span style={{color:"#0284c7",fontWeight:"normal"}}>(Filtrado)</span>}</td>
                    <td style={{textAlign:"center",fontSize:12}}>{totaisGerais.qtdOs.toLocaleString()}</td>
                    <td style={{fontSize:12,color:"#005596"}}>{formatarMoeda(totaisGerais.valorProjTotal)}</td>
                    <td style={{fontSize:11,color:"#64748b"}}>100%</td>
                    <td style={{fontSize:12,color:"#10b981"}}>{formatarMoeda(totaisGerais.valorProdTotal)}</td>
                    <td style={{fontSize:11,color:"#64748b"}}>100%</td>
                    <td style={{fontSize:12,color:"#d97706"}}>{formatarMoeda(totaisGerais.valorFatuTotal)}</td>
                    <td style={{fontSize:11,color:"#64748b"}}>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>}
        </div>

        {/* CARD 2 */}
        <div style={{background:"#fff",borderRadius:8,boxShadow:"0 1px 2px rgba(0,0,0,.04)",border:"1px solid #e2e8f0",display:"flex",flexDirection:"column",height:380}}>
          <div style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:5,background:"#f8fafc",flexShrink:0}}>
            <Table size={15} color="#005596"/>
            <h3 style={{fontSize:12,fontWeight:700,color:"#0f172a",margin:0}}>Detalhamento por Ordem de Serviço (Num OS Individuais com Scroll Interno)</h3>
          </div>

          {!dadosTabela2Ordenados.length
            ?<div style={{padding:18,textAlign:"center",color:"#64748b",fontSize:12}}>Nenhum registro encontrado para os filtros selecionados.</div>
            :<div style={{flex:1,overflowY:"auto",position:"relative"}}>
              <table className="tabela-apoio-estilizada" style={{width:"100%",borderCollapse:"separate",borderSpacing:0}}>
                <thead><tr>
                  {[
                    ["num_os","Num OS"],["tipo_os","Tipo OS"],["pep","PEP"],["status","Status"],
                    ["valor_proj","Valor Projetado"],["valor_prod_total","Produzido Total"],
                    ["valor_prod","Valor Produzido (Mês)"],["valor_fatu","Valor Faturado"],
                    ["prod_x_proj","%ProdXProj"],["fatu_x_prod","%FatuXProd"],["fatu_x_proj","%FatuXProj"]
                  ].map(([campo,titulo])=>(
                    <th key={campo} onClick={()=>alternarOrdenacaoTabela2(campo)}
                      style={{...getEstiloCabecalho(ordenacaoTabela2.campo,campo),...(campo.includes("_x_")?{width:100}:{}),position:"sticky",top:0,zIndex:10}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:4}}>
                        <span>{titulo}</span>{renderSetaOrdenacao(ordenacaoTabela2.campo,campo,ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                  ))}
                </tr></thead>

                <tbody>
                  {dadosTabela2Ordenados.map((item,index)=>{
                    const selecionado=filtroCruzadoNumOs===item.num_os;
                    return(
                      <tr key={index} onClick={()=>handleLinhaTabela2Click(item.num_os)}
                        style={{cursor:"pointer",backgroundColor:selecionado?"#e0f2fe":"transparent",transition:"background .15s"}}
                        onMouseEnter={e=>{if(!selecionado)e.currentTarget.style.background="#f8fafc"}}
                        onMouseLeave={e=>{if(!selecionado)e.currentTarget.style.background="transparent"}}>
                        <td style={{fontWeight:700,color:"#005596"}}>{item.num_os}</td>
                        <td><span style={{background:"#e0f2fe",color:"#005596",padding:"2px 6px",borderRadius:4,fontSize:10,fontWeight:700,textTransform:"uppercase"}}>{item.tipo_os}</span></td>
                        <td style={{color:"#334155"}}>{item.pep}</td>
                        <td style={{color:"#334155"}}>{item.status}</td>
                        <td style={{fontWeight:600,color:"#0f172a"}}>{formatarMoeda(item.valor_proj)}</td>
                        <td style={{fontWeight:700,color:"#10b981",background:"#f8fafc"}}>{formatarMoeda(item.valor_prod_total)}</td>
                        <td style={{fontWeight:600,color:"#0f172a"}}>{formatarMoeda(item.valor_prod)}</td>
                        <td style={{fontWeight:600,color:"#0f172a"}}>{formatarMoeda(item.valor_fatu)}</td>
                        <td><RenderPercentual valor={item.prod_x_proj} compact/></td>
                        <td><RenderPercentual valor={item.fatu_x_prod} compact/></td>
                        <td><RenderPercentual valor={item.fatu_x_proj} compact/></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}

          {dadosTabela2Ordenados.length>0&&(
            <div style={{background:"#f1f5f9",borderTop:"2px solid #cbd5e1",fontWeight:700,color:"#0f172a",padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,flexShrink:0}}>
              <div>TOTAL GERAL ({dadosTabela2Ordenados.length} Ordens) {temFiltroAtivo&&<span style={{color:"#0284c7",fontWeight:"normal"}}>(Filtrado)</span>}</div>
              <div style={{display:"flex",gap:16}}>
                <div>Projetado: <span style={{color:"#005596"}}>{formatarMoeda(totaisGerais.valorProjTotal)}</span></div>
                <div>Produzido Total: <span style={{color:"#10b981"}}>{formatarMoeda(totaisGerais.valorProdTotalGeral)}</span></div>
                <div>Produzido (Mês): <span style={{color:"#10b981"}}>{formatarMoeda(totaisGerais.valorProdTotal)}</span></div>
                <div>Faturado: <span style={{color:"#d97706"}}>{formatarMoeda(totaisGerais.valorFatuTotal)}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}