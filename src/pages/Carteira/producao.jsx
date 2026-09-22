import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../services/supabase";
import Swal from "sweetalert2";
import { 
  TrendingUp, Table, X, 
  ArrowUp, ArrowDown, ArrowUpDown, RefreshCw, Search, Filter 
} from "lucide-react";
import "../BancoDados/tabelas_internas.css";

export default function Producao() {
  const [loading, setLoading] = useState(true);
  const [todosDados, setTodosDados] = useState([]);
  
  const [colunasDisponiveis, setColunasDisponiveis] = useState([]);
  const [valoresColunaAtual, setValoresColunaAtual] = useState([]);
  
  const [termoPesquisaColuna, setTermoPesquisaColuna] = useState("");
  const [termoPesquisaValor, setTermoPesquisaValor] = useState("");

  const [tipoFiltroAtual, setTipoFiltroAtual] = useState("");
  const [valoresSelecionadosTemp, setValoresSelecionadosTemp] = useState([]);
  const [filtrosAtivos, setFiltrosAtivos] = useState({});

  const [filtroCruzadoTipoOs, setFiltroCruzadoTipoOs] = useState(null);
  const [filtroCruzadoNumOs, setFiltroCruzadoNumOs] = useState(null);

  const [dropdownColunaAberto, setDropdownColunaAberto] = useState(false);
  const [dropdownValorAberto, setDropdownValorAberto] = useState(false);

  const dropdownColunaRef = useRef(null);
  const dropdownValorRef = useRef(null);

  const [ordenacaoTabela1, setOrdenacaoTabela1] = useState({ campo: "soma_valor_proj", direcao: "desc" });
  const [ordenacaoTabela2, setOrdenacaoTabela2] = useState({ campo: "num_os", direcao: "asc" });

  const [totaisGerais, setTotaisGerais] = useState({
    qtdOs: 0,
    numOsTotal: 0,
    valorProjTotal: 0,
    valorProdTotal: 0,
    valorProdTotalGeral: 0,
    valorFatuTotal: 0
  });

  const [dadosProcessadosTabela, setDadosProcessadosTabela] = useState([]);
  const [dadosIndividuaisNumOs, setDadosIndividuaisNumOs] = useState([]);

  const AlertaLimpo = Swal.mixin({
    showCancelButton: false,
    showConfirmButton: true,
    confirmButtonText: "OK",
    allowOutsideClick: false,
    allowEscapeKey: true,
    buttonsStyling: true,
    customClass: {
      popup: "swal-feedback",
      confirmButton: "swal-botao-ok-curto",
      cancelButton: "swal-esconder-cancelamento"
    }
  });

  useEffect(() => {
    carregarTodosDadosProdutividade();
  }, []);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (dropdownColunaRef.current && !dropdownColunaRef.current.contains(e.target)) {
        setDropdownColunaAberto(false);
      }
      if (dropdownValorRef.current && !dropdownValorRef.current.contains(e.target)) {
        setDropdownValorAberto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  useEffect(() => {
    if (!tipoFiltroAtual || !Array.isArray(todosDados) || todosDados.length === 0) {
      setValoresColunaAtual([]);
      setValoresSelecionadosTemp([]);
      setTermoPesquisaValor("");
      return;
    }

    const valoresSet = new Set();
    todosDados.forEach(item => {
      if (item && typeof item === 'object') {
        const val = item[tipoFiltroAtual];

        if (tipoFiltroAtual === "meses" && val && typeof val === 'object') {
          Object.keys(val).forEach(mesChave => {
            if (mesChave) valoresSet.add(mesChave);
          });
        } else if (val !== undefined && val !== null && val !== "") {
          if (tipoFiltroAtual.includes("data")) {
            const str = String(val).substring(0, 7);
            if (str.length === 7) valoresSet.add(str);
          } else {
            valoresSet.add(String(val));
          }
        }
      }
    });

    const listaValores = Array.from(valoresSet).sort().reverse();
    setValoresColunaAtual(listaValores);
    setValoresSelecionadosTemp([]);
    setTermoPesquisaValor("");
  }, [tipoFiltroAtual, todosDados]);

  const carregarTodosDadosProdutividade = async () => {
    try {
      setLoading(true);
      let allData = [];
      let page = 0;
      const pageSize = 1000;
      let fetchMore = true;

      while (fetchMore) {
        const from = page * pageSize;
        const to = (page + 1) * pageSize - 1;

        const { data, error } = await supabase
          .from("view_dados_produtividade")
          .select("*")
          .range(from, to);

        if (error) throw error;

        if (data && Array.isArray(data) && data.length > 0) {
          allData = allData.concat(data);
          if (data.length < pageSize) {
            fetchMore = false;
          } else {
            page++;
          }
        } else {
          fetchMore = false;
        }
      }

      setTodosDados(allData);

      if (allData.length > 0 && allData[0]) {
        const sample = allData[0];
        const cols = Object.keys(sample).filter(c => !c.includes("id") && c !== "valor_proj" && c !== "valor_prod" && c !== "valor_fatu");
        setColunasDisponiveis(cols);
      }

      processarDados(allData, {}, null, null);
    } catch (error) {
      console.error("Erro ao carregar view_dados_produtividade:", error);
      AlertaLimpo.fire({ icon: "error", title: "Erro", text: "Não foi possível carregar os dados: " + (error.message || error) });
    } finally {
      setLoading(false);
    }
  };

  const adicionarFiltroDinamico = () => {
    if (!tipoFiltroAtual || valoresSelecionadosTemp.length === 0) return;

    setFiltrosAtivos(prev => {
      const novosFiltros = { ...prev, [tipoFiltroAtual]: [...valoresSelecionadosTemp] };
      processarDados(todosDados, novosFiltros, filtroCruzadoTipoOs, filtroCruzadoNumOs);
      return novosFiltros;
    });
    setValoresSelecionadosTemp([]);
    setDropdownValorAberto(false);
  };

  const removerFiltroItem = (campo, valorParaRemover) => {
    setFiltrosAtivos(prev => {
      const novosFiltros = { ...prev };
      if (novosFiltros[campo]) {
        novosFiltros[campo] = novosFiltros[campo].filter(v => v !== valorParaRemover);
        if (novosFiltros[campo].length === 0) {
          delete novosFiltros[campo];
        }
      }
      processarDados(todosDados, novosFiltros, filtroCruzadoTipoOs, filtroCruzadoNumOs);
      return novosFiltros;
    });
  };

  const limparTodosFiltros = () => {
    setFiltrosAtivos({});
    setTipoFiltroAtual("");
    setValoresSelecionadosTemp([]);
    setTermoPesquisaValor("");
    setTermoPesquisaColuna("");
    setFiltroCruzadoTipoOs(null);
    setFiltroCruzadoNumOs(null);
    setDropdownColunaAberto(false);
    setDropdownValorAberto(false);
    processarDados(todosDados, {}, null, null);
  };

  const processarDados = (dados, filtros, cruzadoTipo, cruzadoNumOs) => {
    if (!Array.isArray(dados)) {
      setDadosProcessadosTabela([]);
      setDadosIndividuaisNumOs([]);
      return;
    }

    let filtrados = [];

    dados.forEach(item => {
      if (!item) return;
      let atendeTodos = true;

      Object.keys(filtros).forEach(campo => {
        const valoresPermitidos = filtros[campo];
        if (!valoresPermitidos || valoresPermitidos.length === 0) return;

        const valItem = item[campo];

        if (valItem === undefined || valItem === null) {
          atendeTodos = false;
          return;
        }

        if (campo === "meses" && typeof valItem === 'object') {
          const temAlgumMesPermitido = valoresPermitidos.some(mes => valItem && valItem.hasOwnProperty(mes) && Number(valItem[mes]) > 0);
          if (!temAlgumMesPermitido) {
            atendeTodos = false;
          }
        } else if (campo.includes("data")) {
          const atendeData = valoresPermitidos.some(v => String(valItem).startsWith(v));
          if (!atendeData) {
            atendeTodos = false;
          }
        } else {
          if (!valoresPermitidos.includes(String(valItem))) {
            atendeTodos = false;
          }
        }
      });

      if (cruzadoTipo && item.tipo_os !== cruzadoTipo) {
        atendeTodos = false;
      }
      if (cruzadoNumOs && (item.num_os !== cruzadoNumOs && item.ordem_servico !== cruzadoNumOs)) {
        atendeTodos = false;
      }

      if (atendeTodos) {
        let itemProcessado = { ...item };
        if (filtros.meses && Array.isArray(filtros.meses) && filtros.meses.length > 0 && item.meses && typeof item.meses === 'object') {
          let somaProdMesesFiltrados = 0;
          filtros.meses.forEach(mes => {
            if (item.meses[mes] !== undefined) {
              somaProdMesesFiltrados += Number(item.meses[mes]) || 0;
            }
          });
          itemProcessado.valor_prod = somaProdMesesFiltrados;
        }
        filtrados.push(itemProcessado);
      }
    });

    let somaGeralProj = 0;
    let somaGeralProd = 0;
    let somaGeralProdTotal = 0;
    let somaGeralFatu = 0;
    let qtdOsTotal = 0;
    const numOsGeralSet = new Set();
    const agrupadoTipo = {};
    const agrupadoNumOs = {};

    const somaTotalMesesPorOs = {};
    dados.forEach(item => {
      const numOs = item.num_os || item.ordem_servico || "N/I";
      if (item.meses && typeof item.meses === 'object') {
        let totalOs = 0;
        Object.values(item.meses).forEach(valMes => {
          totalOs += Number(valMes) || 0;
        });
        somaTotalMesesPorOs[numOs] = totalOs;
      } else {
        somaTotalMesesPorOs[numOs] = Number(item.valor_prod) || 0;
      }
    });

    filtrados.forEach((item) => {
      const tipo = item.tipo_os || "Não Definido";
      const numOs = item.num_os || item.ordem_servico || "N/I";
      const valProj = Number(item.valor_proj) || 0;
      const valProd = Number(item.valor_prod) || 0;
      const valProdTotalGeral = somaTotalMesesPorOs[numOs] !== undefined ? somaTotalMesesPorOs[numOs] : valProd;
      const valFatu = Number(item.valor_fatu) || 0;

      somaGeralProj += valProj;
      somaGeralProd += valProd;
      somaGeralProdTotal += valProdTotalGeral;
      somaGeralFatu += valFatu;
      qtdOsTotal += 1;
      if (numOs) numOsGeralSet.add(numOs);

      if (!agrupadoTipo[tipo]) {
        agrupadoTipo[tipo] = {
          tipo_os: tipo,
          qtd_os: 0,
          numOsSet: new Set(),
          soma_valor_proj: 0,
          soma_valor_prod: 0,
          soma_valor_fatu: 0
        };
      }
      agrupadoTipo[tipo].qtd_os += 1;
      if (numOs) agrupadoTipo[tipo].numOsSet.add(numOs);
      agrupadoTipo[tipo].soma_valor_proj += valProj;
      agrupadoTipo[tipo].soma_valor_prod += valProd;
      agrupadoTipo[tipo].soma_valor_fatu += valFatu;

      if (!agrupadoNumOs[numOs]) {
        agrupadoNumOs[numOs] = {
          num_os: numOs,
          tipo_os: tipo,
          pep: item.pep || "N/I",
          status: item.status || "N/I",
          valor_proj: valProj,
          valor_prod_total: valProdTotalGeral,
          valor_prod: valProd,
          prod_x_proj: 0,
          fatu_x_prod: 0,
          fatu_x_proj: 0,
          valor_fatu: valFatu
        };
      } else {
        agrupadoNumOs[numOs].valor_proj += valProj;
        agrupadoNumOs[numOs].valor_prod += valProd;
        agrupadoNumOs[numOs].valor_fatu += valFatu;
      }
    });

    setTotaisGerais({
      qtdOs: qtdOsTotal,
      numOsTotal: numOsGeralSet.size,
      valorProjTotal: somaGeralProj,
      valorProdTotal: somaGeralProd,
      valorProdTotalGeral: somaGeralProdTotal,
      valorFatuTotal: somaGeralFatu
    });

    const resultadoTabela1 = Object.values(agrupadoTipo).map((grupo) => {
      const percProj = somaGeralProj > 0 ? (grupo.soma_valor_proj / somaGeralProj) * 100 : 0;
      const percProd = somaGeralProd > 0 ? (grupo.soma_valor_prod / somaGeralProd) * 100 : 0;
      const percFatu = somaGeralFatu > 0 ? (grupo.soma_valor_fatu / somaGeralFatu) * 100 : 0;

      return {
        tipo_os: grupo.tipo_os,
        qtd_os: grupo.qtd_os,
        num_os: grupo.numOsSet.size,
        soma_valor_proj: grupo.soma_valor_proj,
        perc_valor_proj: percProj,
        soma_valor_prod: grupo.soma_valor_prod,
        perc_valor_prod: percProd,
        soma_valor_fatu: grupo.soma_valor_fatu,
        perc_valor_fatu: percFatu
      };
    });

    const resultadoTabela2 = Object.values(agrupadoNumOs).map((item) => {
      const prodXproj = item.valor_proj > 0 ? (item.valor_prod_total / item.valor_proj) * 100 : 0;
      const fatuXprod = item.valor_prod > 0 ? (item.valor_fatu / item.valor_prod) * 100 : 0;
      const fatuXproj = item.valor_proj > 0 ? (item.valor_fatu / item.valor_proj) * 100 : 0;

      return {
        ...item,
        prod_x_proj: prodXproj,
        fatu_x_prod: fatuXprod,
        fatu_x_proj: fatuXproj
      };
    });

    setDadosProcessadosTabela(resultadoTabela1);
    setDadosIndividuaisNumOs(resultadoTabela2);
  };

  const handleLinhaTabela1Click = (tipoOs) => {
    const novoFiltro = filtroCruzadoTipoOs === tipoOs ? null : tipoOs;
    setFiltroCruzadoTipoOs(novoFiltro);
    setFiltroCruzadoNumOs(null);
    processarDados(todosDados, filtrosAtivos, novoFiltro, null);
  };

  const handleLinhaTabela2Click = (numOs) => {
    const novoFiltro = filtroCruzadoNumOs === numOs ? null : numOs;
    setFiltroCruzadoNumOs(novoFiltro);
    setFiltroCruzadoTipoOs(null);
    processarDados(todosDados, filtrosAtivos, null, novoFiltro);
  };

  const limparFiltroCruzado = () => {
    setFiltroCruzadoTipoOs(null);
    setFiltroCruzadoNumOs(null);
    processarDados(todosDados, filtrosAtivos, null, null);
  };

  const ordenarDados = (dados, campo, direcao) => {
    return [...dados].sort((a, b) => {
      let valorA = a[campo];
      let valorB = b[campo];

      if (valorA === undefined || valorA === null) valorA = "";
      if (valorB === undefined || valorB === null) valorB = "";

      if (typeof valorA === "string") valorA = valorA.toLowerCase();
      if (typeof valorB === "string") valorB = valorB.toLowerCase();

      if (valorA < valorB) return direcao === "asc" ? -1 : 1;
      if (valorA > valorB) return direcao === "asc" ? 1 : -1;
      return 0;
    });
  };

  const dadosTabela1Ordenados = ordenarDados(dadosProcessadosTabela, ordenacaoTabela1.campo, ordenacaoTabela1.direcao);
  const dadosTabela2Ordenados = ordenarDados(dadosIndividuaisNumOs, ordenacaoTabela2.campo, ordenacaoTabela2.direcao);

  const alternarOrdenacaoTabela1 = (campo) => {
    setOrdenacaoTabela1(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "asc" ? "desc" : "asc"
    }));
  };

  const alternarOrdenacaoTabela2 = (campo) => {
    setOrdenacaoTabela2(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "asc" ? "desc" : "asc"
    }));
  };

  const renderSetaOrdenacao = (campoAtual, campoAlvo, direcao) => {
    if (campoAtual !== campoAlvo) {
      return <ArrowUpDown size={11} style={{ color: "#94a3b8", opacity: 0.6 }} />;
    }
    return direcao === "asc" ? (
      <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
    ) : (
      <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
    );
  };

  const getEstiloCabecalho = (campoAtual, campoAlvo) => {
    const ativo = campoAtual === campoAlvo;
    return {
      cursor: "pointer",
      userSelect: "none",
      backgroundColor: ativo ? "#e0f2fe" : "#ffffff",
      color: ativo ? "#005596" : "inherit",
      transition: "background 0.15s, color 0.15s",
      zIndex: 10
    };
  };

  const formatarMoeda = (valor) => {
    const num = Number(valor) || 0;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Regra exata: vermelho se < 100%, verde se >= 100%
  const getCorPercentual = (valor) => {
    const num = Number(valor) || 0;
    return num < 100 ? "#ef4444" : "#10b981";
  };

  const colunasFiltradasPelaBusca = colunasDisponiveis.filter(col => 
    col && col.toLowerCase().includes(termoPesquisaColuna.toLowerCase())
  );

  const valoresFiltradosPelaBusca = valoresColunaAtual.filter(val => 
    val && String(val).toLowerCase().includes(termoPesquisaValor.toLowerCase())
  );

  const toggleValorTemp = (val) => {
    setValoresSelecionadosTemp(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const selecionarTodosValoresVisiveis = () => {
    const todosVisiveis = valoresFiltradosPelaBusca;
    const todosJaEstaoSelecionados = todosVisiveis.every(v => valoresSelecionadosTemp.includes(v));
    if (todosJaEstaoSelecionados) {
      setValoresSelecionadosTemp(prev => prev.filter(v => !todosVisiveis.includes(v)));
    } else {
      const combinados = new Set([...valoresSelecionadosTemp, ...todosVisiveis]);
      setValoresSelecionadosTemp(Array.from(combinados));
    }
  };

  const temFiltroAtivo = Object.keys(filtrosAtivos).length > 0 || filtroCruzadoTipoOs !== null || filtroCruzadoNumOs !== null;
  const alturaUnificadaEstilo = { height: "32px", boxSizing: "border-box" };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: "60vh" }}>
        <h3 style={{ fontSize: "16px", color: "#005596", fontWeight: "600", margin: 0, textAlign: "center" }}>
          Carregando dados de produtividade...
        </h3>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100%', boxSizing: 'border-box', paddingBottom: '40px' }}>
      
      {/* CABEÇALHO E FILTROS FIXOS NO TOPO COM FUNDO TOTALMENTE SÓLIDO E BOX-SHADOW FORTE */}
      <div style={{ position: 'sticky', top: 0, zIndex: 9999, background: '#ffffff', paddingBottom: '8px', paddingTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", background: "#ffffff", padding: "8px 12px", borderRadius: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ backgroundColor: "#0284c7", color: "#fff", width: "28px", height: "28px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,85,150,0.2)" }}>
              <TrendingUp size={15} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "0.9rem", color: "#0f172a", fontWeight: "700", lineHeight: "1.2" }}>Dashboard de Produtividade</h2>
              <p style={{ margin: "0px", fontSize: "0.7rem", color: "#64748b" }}>Visão consolidada por Tipo de OS (view_dados_produtividade).</p>
            </div>
          </div>

          <button 
            className="btn-adicionar-card-global" 
            style={{ ...alturaUnificadaEstilo, position: "relative", top: "auto", right: "auto", padding: "0 12px", fontSize: "0.8rem" }} 
            onClick={carregarTodosDadosProdutividade}
          >
            <RefreshCw size={13} />
            <span>Atualizar Dados</span>
          </button>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="filter-bar" style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div className="filter-controls-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            
            <div style={{ display: "flex", alignItems: "center", gap: "3px", flexWrap: "wrap" }}>
              
              {/* SELECT 1: COLUNAS */}
              <div ref={dropdownColunaRef} style={{ position: 'relative', display: 'inline-block', minWidth: '200px' }}>
                <div 
                  style={{ ...alturaUnificadaEstilo, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '12px', color: tipoFiltroAtual ? '#1e293b' : '#64748b' }}
                  onClick={() => setDropdownColunaAberto(prev => !prev)}
                >
                  <span>{tipoFiltroAtual ? tipoFiltroAtual.toUpperCase() : "Selecionar coluna..."}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>▼</span>
                </div>

                {dropdownColunaAberto && (
                  <div style={{ position: 'absolute', top: '34px', left: 0, width: '240px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10000, padding: '8px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ position: 'relative', marginBottom: '3px' }}>
                      <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input 
                        type="text" 
                        placeholder="Pesquisar coluna..." 
                        value={termoPesquisaColuna}
                        onChange={(e) => setTermoPesquisaColuna(e.target.value)}
                        style={{ width: '100%', height: '26px', padding: '0 6px 0 26px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ maxHeight: '130px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '4px', padding: '2px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {colunasFiltradasPelaBusca.length === 0 ? (
                        <div style={{ padding: '6px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>Nenhuma coluna encontrada</div>
                      ) : (
                        colunasFiltradasPelaBusca.map(col => (
                          <div 
                            key={col} 
                            onClick={() => {
                              setTipoFiltroAtual(col);
                              setTermoPesquisaColuna("");
                              setDropdownColunaAberto(false);
                            }}
                            style={{ fontSize: '11px', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', background: tipoFiltroAtual === col ? '#e0f2fe' : 'transparent', color: tipoFiltroAtual === col ? '#0369a1' : '#334155', fontWeight: tipoFiltroAtual === col ? '600' : '500' }}
                          >
                            {col.toUpperCase()}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SELECT 2: VALORES */}
              <div ref={dropdownValorRef} style={{ position: 'relative', display: 'inline-block', minWidth: '240px' }}>
                <div 
                  style={{ ...alturaUnificadaEstilo, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '12px', color: '#1e293b' }}
                  onClick={() => setDropdownValorAberto(prev => !prev)}
                >
                  <span>
                    {valoresSelecionadosTemp.length === 0 
                      ? "Selecione os valores..." 
                      : `${valoresSelecionadosTemp.length} selecionado(s)`}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>▼</span>
                </div>

                {dropdownValorAberto && (
                  <div style={{ position: 'absolute', top: '34px', left: 0, width: '280px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10000, padding: '8px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ position: 'relative', marginBottom: '3px' }}>
                      <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input 
                        type="text" 
                        placeholder="Pesquisar valor..." 
                        value={termoPesquisaValor}
                        onChange={(e) => setTermoPesquisaValor(e.target.value)}
                        style={{ width: '100%', height: '26px', padding: '0 6px 0 26px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '3px', color: '#005596', fontWeight: '600', cursor: 'pointer' }}>
                      <span onClick={selecionarTodosValoresVisiveis}>Selecionar Visíveis</span>
                      <span onClick={() => setValoresSelecionadosTemp([])} style={{ color: '#ef4444' }}>Limpar</span>
                    </div>

                    <div style={{ maxHeight: '130px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '4px', padding: '2px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {valoresFiltradosPelaBusca.length === 0 ? (
                        <div style={{ padding: '6px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>Nenhum valor encontrado</div>
                      ) : (
                        valoresFiltradosPelaBusca.map(val => (
                          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', background: valoresSelecionadosTemp.includes(val) ? '#e0f2fe' : 'transparent' }}>
                            <input 
                              type="checkbox" 
                              checked={valoresSelecionadosTemp.includes(val)}
                              onChange={() => toggleValorTemp(val)}
                              style={{ accentColor: '#005596', cursor: 'pointer' }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>{val}</span>
                          </label>
                        ))
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={adicionarFiltroDinamico}
                      style={{ width: '100%', marginTop: '5px', background: '#005596', color: '#fff', border: 'none', borderRadius: '4px', height: '26px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Aplicar Seleção
                    </button>
                  </div>
                )}
              </div>

              <button type="button" className="filter-btn-aplicar" style={alturaUnificadaEstilo} onClick={adicionarFiltroDinamico}>
                Adicionar Filtro
              </button>

              {temFiltroAtivo && (
                <button type="button" className="filter-btn-limpar-todos" style={alturaUnificadaEstilo} onClick={limparTodosFiltros} title="Limpar todos os filtros">
                  <X size={11} /> Limpar Todos
                </button>
              )}
            </div>

            {/* CHIPS */}
            <div className="filter-badges-container" style={{ display: "flex", gap: "3px", flexWrap: "wrap", alignItems: "center" }}>
              {Object.keys(filtrosAtivos).map(campo => (
                filtrosAtivos[campo].map(valor => (
                  <div key={`${campo}-${valor}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 500, border: "1px solid #bae6fd" }}>
                    <span>{campo}: <strong>{valor}</strong></span>
                    <button onClick={() => removerFiltroItem(campo, valor)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#0369a1", display: "flex", alignItems: "center", padding: 0 }}><X size={11} /></button>
                  </div>
                ))
              ))}

              {filtroCruzadoTipoOs && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 600, border: "1px solid #a7f3d0" }}>
                  <Filter size={11} />
                  <span>Tipo OS (Selecionado): <strong>{filtroCruzadoTipoOs}</strong></span>
                  <button onClick={limparFiltroCruzado} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#065f46", display: "flex", alignItems: "center", padding: 0 }}><X size={11} /></button>
                </div>
              )}
              {filtroCruzadoNumOs && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 600, border: "1px solid #a7f3d0" }}>
                  <Filter size={11} />
                  <span>Num OS (Selecionado): <strong>{filtroCruzadoNumOs}</strong></span>
                  <button onClick={limparFiltroCruzado} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#065f46", display: "flex", alignItems: "center", padding: 0 }}><X size={11} /></button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* CONTAINER COM CONTEÚDO */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>

        {/* CARD 1: RESUMO POR TIPO DE OS */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "5px", background: "#f8fafc" }}>
            <Table size={15} color="#005596" />
            <h3 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Resumo de Produtividade por Tipo de OS <span style={{ fontWeight: '400', fontSize: '11px', color: '#64748b' }}>(Clique em uma linha para filtrar a tabela abaixo)</span></h3>
          </div>

          {dadosTabela1Ordenados.length === 0 ? (
            <div style={{ padding: "18px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
              Nenhum registro encontrado para os filtros selecionados.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="tabela-apoio-estilizada" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th onClick={() => alternarOrdenacaoTabela1("tipo_os")} style={getEstiloCabecalho(ordenacaoTabela1.campo, "tipo_os")}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Tipo de OS</span>
                        {renderSetaOrdenacao(ordenacaoTabela1.campo, "tipo_os", ordenacaoTabela1.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela1("qtd_os")} style={{ ...getEstiloCabecalho(ordenacaoTabela1.campo, "qtd_os"), textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", justifyContent: "center", width: "100%" }}>
                        <span>Qtd OS</span>
                        {renderSetaOrdenacao(ordenacaoTabela1.campo, "qtd_os", ordenacaoTabela1.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela1("soma_valor_proj")} style={getEstiloCabecalho(ordenacaoTabela1.campo, "soma_valor_proj")}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Valor Projetado</span>
                        {renderSetaOrdenacao(ordenacaoTabela1.campo, "soma_valor_proj", ordenacaoTabela1.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela1("perc_valor_proj")} style={{ ...getEstiloCabecalho(ordenacaoTabela1.campo, "perc_valor_proj"), width: "130px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>% Part. Proj.</span>
                        {renderSetaOrdenacao(ordenacaoTabela1.campo, "perc_valor_proj", ordenacaoTabela1.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela1("soma_valor_prod")} style={getEstiloCabecalho(ordenacaoTabela1.campo, "soma_valor_prod")}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Valor Produzido</span>
                        {renderSetaOrdenacao(ordenacaoTabela1.campo, "soma_valor_prod", ordenacaoTabela1.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela1("perc_valor_prod")} style={{ ...getEstiloCabecalho(ordenacaoTabela1.campo, "perc_valor_prod"), width: "130px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>% Part. Prod.</span>
                        {renderSetaOrdenacao(ordenacaoTabela1.campo, "perc_valor_prod", ordenacaoTabela1.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela1("soma_valor_fatu")} style={getEstiloCabecalho(ordenacaoTabela1.campo, "soma_valor_fatu")}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Valor Faturado</span>
                        {renderSetaOrdenacao(ordenacaoTabela1.campo, "soma_valor_fatu", ordenacaoTabela1.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela1("perc_valor_fatu")} style={{ ...getEstiloCabecalho(ordenacaoTabela1.campo, "perc_valor_fatu"), width: "130px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>% Part. Fatu.</span>
                        {renderSetaOrdenacao(ordenacaoTabela1.campo, "perc_valor_fatu", ordenacaoTabela1.direcao)}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dadosTabela1Ordenados.map((item, index) => {
                    const selecionado = filtroCruzadoTipoOs === item.tipo_os;
                    return (
                      <tr 
                        key={index} 
                        onClick={() => handleLinhaTabela1Click(item.tipo_os)}
                        style={{ 
                          cursor: "pointer", 
                          backgroundColor: selecionado ? "#e0f2fe" : "transparent",
                          transition: "background 0.15s" 
                        }}
                      >
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>
                          <span style={{ background: "#e0f2fe", color: "#005596", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>
                            {item.tipo_os}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", fontWeight: "600", color: "#334155" }}>
                          {item.qtd_os.toLocaleString()}
                        </td>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>
                          {formatarMoeda(item.soma_valor_proj)}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: getCorPercentual(item.perc_valor_proj), minWidth: "32px" }}>
                              {Number(item.perc_valor_proj || 0).toFixed(1)}%
                            </span>
                            <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(Number(item.perc_valor_proj || 0), 100)}%`, background: getCorPercentual(item.perc_valor_proj), height: "100%", borderRadius: "2px" }}></div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>
                          {formatarMoeda(item.soma_valor_prod)}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: getCorPercentual(item.perc_valor_prod), minWidth: "32px" }}>
                              {Number(item.perc_valor_prod || 0).toFixed(1)}%
                            </span>
                            <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(Number(item.perc_valor_prod || 0), 100)}%`, background: getCorPercentual(item.perc_valor_prod), height: "100%", borderRadius: "2px" }}></div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>
                          {formatarMoeda(item.soma_valor_fatu)}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: getCorPercentual(item.perc_valor_fatu), minWidth: "32px" }}>
                              {Number(item.perc_valor_fatu || 0).toFixed(1)}%
                            </span>
                            <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(Number(item.perc_valor_fatu || 0), 100)}%`, background: getCorPercentual(item.perc_valor_fatu), height: "100%", borderRadius: "2px" }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1", fontWeight: "700", color: "#0f172a" }}>
                    <td style={{ padding: "8px 12px", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                      Total Geral {temFiltroAtivo && <span style={{ color: "#0284c7", fontWeight: "normal" }}>(Filtrado)</span>}
                    </td>
                    <td style={{ textAlign: "center", fontSize: "12px" }}>
                      {totaisGerais.qtdOs.toLocaleString()}
                    </td>
                    <td style={{ fontSize: "12px", color: "#005596" }}>
                      {formatarMoeda(totaisGerais.valorProjTotal)}
                    </td>
                    <td style={{ fontSize: "11px", color: "#64748b" }}>100%</td>
                    <td style={{ fontSize: "12px", color: "#10b981" }}>
                      {formatarMoeda(totaisGerais.valorProdTotal)}
                    </td>
                    <td style={{ fontSize: "11px", color: "#64748b" }}>100%</td>
                    <td style={{ fontSize: "12px", color: "#d97706" }}>
                      {formatarMoeda(totaisGerais.valorFatuTotal)}
                    </td>
                    <td style={{ fontSize: "11px", color: "#64748b" }}>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* CARD 2: DETALHAMENTO INDIVIDUAL POR ORDEM DE SERVIÇO */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", height: "380px" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "5px", background: "#f8fafc", flexShrink: 0 }}>
            <Table size={15} color="#005596" />
            <h3 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Detalhamento por Ordem de Serviço (Num OS Individuais com Scroll Interno)</h3>
          </div>

          {dadosTabela2Ordenados.length === 0 ? (
            <div style={{ padding: "18px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
              Nenhum registro encontrado para os filtros selecionados.
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
              <table className="tabela-apoio-estilizada" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th onClick={() => alternarOrdenacaoTabela2("num_os")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "num_os"), position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Num OS</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "num_os", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("tipo_os")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "tipo_os"), position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Tipo OS</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "tipo_os", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("pep")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "pep"), position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>PEP</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "pep", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("status")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "status"), position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Status</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "status", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("valor_proj")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "valor_proj"), position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Valor Projetado</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "valor_proj", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("valor_prod_total")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "valor_prod_total"), position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Produzido Total</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "valor_prod_total", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("valor_prod")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "valor_prod"), position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Valor Produzido (Mês)</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "valor_prod", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("valor_fatu")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "valor_fatu"), position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>Valor Faturado</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "valor_fatu", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("prod_x_proj")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "prod_x_proj"), width: "100px", position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>%ProdXProj</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "prod_x_proj", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("fatu_x_prod")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "fatu_x_prod"), width: "100px", position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>%FatuXProd</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "fatu_x_prod", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                    <th onClick={() => alternarOrdenacaoTabela2("fatu_x_proj")} style={{ ...getEstiloCabecalho(ordenacaoTabela2.campo, "fatu_x_proj"), width: "100px", position: "sticky", top: 0, zIndex: 100 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>%FatuXProj</span>
                        {renderSetaOrdenacao(ordenacaoTabela2.campo, "fatu_x_proj", ordenacaoTabela2.direcao)}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dadosTabela2Ordenados.map((item, index) => {
                    const selecionado = filtroCruzadoNumOs === item.num_os;
                    return (
                      <tr 
                        key={index} 
                        onClick={() => handleLinhaTabela2Click(item.num_os)}
                        style={{ 
                          cursor: "pointer", 
                          backgroundColor: selecionado ? "#e0f2fe" : "transparent",
                          transition: "background 0.15s" 
                        }}
                      >
                        <td style={{ fontWeight: "700", color: "#005596" }}>
                          {item.num_os}
                        </td>
                        <td>
                          <span style={{ background: "#e0f2fe", color: "#005596", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>
                            {item.tipo_os}
                          </span>
                        </td>
                        <td style={{ color: "#334155" }}>{item.pep}</td>
                        <td style={{ color: "#334155" }}>{item.status}</td>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>
                          {formatarMoeda(item.valor_proj)}
                        </td>
                        <td style={{ fontWeight: "700", color: "#10b981", background: "#f8fafc" }}>
                          {formatarMoeda(item.valor_prod_total)}
                        </td>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>
                          {formatarMoeda(item.valor_prod)}
                        </td>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>
                          {formatarMoeda(item.valor_fatu)}
                        </td>
                        {/* %ProdXProj com cores dinâmicas */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "10px", fontWeight: "600", color: getCorPercentual(item.prod_x_proj) }}>
                              {Number(item.prod_x_proj || 0).toFixed(1)}%
                            </span>
                            <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(Number(item.prod_x_proj || 0), 100)}%`, background: getCorPercentual(item.prod_x_proj), height: "100%", borderRadius: "2px" }}></div>
                            </div>
                          </div>
                        </td>
                        {/* %FatuXProd com cores dinâmicas */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "10px", fontWeight: "600", color: getCorPercentual(item.fatu_x_prod) }}>
                              {Number(item.fatu_x_prod || 0).toFixed(1)}%
                            </span>
                            <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(Number(item.fatu_x_prod || 0), 100)}%`, background: getCorPercentual(item.fatu_x_prod), height: "100%", borderRadius: "2px" }}></div>
                            </div>
                          </div>
                        </td>
                        {/* %FatuXProj com cores dinâmicas */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "10px", fontWeight: "600", color: getCorPercentual(item.fatu_x_proj) }}>
                              {Number(item.fatu_x_proj || 0).toFixed(1)}%
                            </span>
                            <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(Number(item.fatu_x_proj || 0), 100)}%`, background: getCorPercentual(item.fatu_x_proj), height: "100%", borderRadius: "2px" }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* RODAPÉ DA TABELA 2 FIXO */}
          {dadosTabela2Ordenados.length > 0 && (
            <div style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1", fontWeight: "700", color: "#0f172a", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", flexShrink: 0 }}>
              <div>
                TOTAL GERAL ({dadosTabela2Ordenados.length} Ordens) {temFiltroAtivo && <span style={{ color: "#0284c7", fontWeight: "normal" }}>(Filtrado)</span>}
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div>Projetado: <span style={{ color: "#005596" }}>{formatarMoeda(totaisGerais.valorProjTotal)}</span></div>
                <div>Produzido Total: <span style={{ color: "#10b981" }}>{formatarMoeda(totaisGerais.valorProdTotalGeral)}</span></div>
                <div>Produzido (Mês): <span style={{ color: "#10b981" }}>{formatarMoeda(totaisGerais.valorProdTotal)}</span></div>
                <div>Faturado: <span style={{ color: "#d97706" }}>{formatarMoeda(totaisGerais.valorFatuTotal)}</span></div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}