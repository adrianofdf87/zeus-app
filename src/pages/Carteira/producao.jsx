import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../services/supabase";
import Swal from "sweetalert2";
import { 
  TrendingUp, Table, X, 
  ArrowUp, ArrowDown, RefreshCw, Search 
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

  const [dropdownColunaAberto, setDropdownColunaAberto] = useState(false);
  const [dropdownValorAberto, setDropdownValorAberto] = useState(false);

  const dropdownColunaRef = useRef(null);
  const dropdownValorRef = useRef(null);

  const [ordenacaoCampo, setOrdenacaoCampo] = useState("soma_valor_proj");
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState("desc");

  const [totaisGerais, setTotaisGerais] = useState({
    qtdOs: 0,
    numOsTotal: 0,
    valorProjTotal: 0,
    valorProdTotal: 0,
    valorFatuTotal: 0
  });

  const [dadosProcessadosTabela, setDadosProcessadosTabela] = useState([]);

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

      processarDados(allData, {});
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
      processarDados(todosDados, novosFiltros);
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
      processarDados(todosDados, novosFiltros);
      return novosFiltros;
    });
  };

  const limparTodosFiltros = () => {
    setFiltrosAtivos({});
    setTipoFiltroAtual("");
    setValoresSelecionadosTemp([]);
    setTermoPesquisaValor("");
    setTermoPesquisaColuna("");
    setDropdownColunaAberto(false);
    setDropdownValorAberto(false);
    processarDados(todosDados, {});
  };

  const processarDados = (dados, filtros) => {
    if (!Array.isArray(dados)) {
      setDadosProcessadosTabela([]);
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
          const temAlgumMesPermitido = valoresPermitidos.some(mes => valItem.hasOwnProperty(mes) && Number(valItem[mes]) > 0);
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
    let somaGeralFatu = 0;
    let qtdOsTotal = 0;
    const numOsGeralSet = new Set();
    const agrupado = {};

    filtrados.forEach((item) => {
      const tipo = item.tipo_os || "Não Definido";
      const numOs = item.num_os || item.ordem_servico || "";
      const valProj = Number(item.valor_proj) || 0;
      const valProd = Number(item.valor_prod) || 0;
      const valFatu = Number(item.valor_fatu) || 0;

      somaGeralProj += valProj;
      somaGeralProd += valProd;
      somaGeralFatu += valFatu;
      qtdOsTotal += 1;
      if (numOs) numOsGeralSet.add(numOs);

      if (!agrupado[tipo]) {
        agrupado[tipo] = {
          tipo_os: tipo,
          qtd_os: 0,
          numOsSet: new Set(),
          soma_valor_proj: 0,
          soma_valor_prod: 0,
          soma_valor_fatu: 0
        };
      }

      agrupado[tipo].qtd_os += 1;
      if (numOs) agrupado[tipo].numOsSet.add(numOs);
      agrupado[tipo].soma_valor_proj += valProj;
      agrupado[tipo].soma_valor_prod += valProd;
      agrupado[tipo].soma_valor_fatu += valFatu;
    });

    setTotaisGerais({
      qtdOs: qtdOsTotal,
      numOsTotal: numOsGeralSet.size,
      valorProjTotal: somaGeralProj,
      valorProdTotal: somaGeralProd,
      valorFatuTotal: somaGeralFatu
    });

    const resultadoFinal = Object.values(agrupado).map((grupo) => {
      const percProj = somaGeralProj > 0 ? (grupo.soma_valor_proj / somaGeralProj) * 100 : 0;
      const percProd = somaGeralProd > 0 ? (grupo.soma_valor_prod / somaGeralProd) * 100 : 0;
      const percFatu = somaGeralFatu > 0 ? (grupo.soma_valor_fatu / somaGeralFatu) * 100 : 0;

      return {
        tipo_os: grupo.tipo_os,
        qtd_os: grupo.qtd_os,
        num_os: grupo.numOsSet.size, // Quantidade de Num OS únicos
        soma_valor_proj: grupo.soma_valor_proj,
        perc_valor_proj: percProj,
        soma_valor_prod: grupo.soma_valor_prod,
        perc_valor_prod: percProd,
        soma_valor_fatu: grupo.soma_valor_fatu,
        perc_valor_fatu: percFatu
      };
    });

    setDadosProcessadosTabela(resultadoFinal);
  };

  const dadosTabelaOrdenados = [...dadosProcessadosTabela].sort((a, b) => {
    let valorA = a[ordenacaoCampo];
    let valorB = b[ordenacaoCampo];

    if (valorA === undefined || valorA === null) valorA = "";
    if (valorB === undefined || valorB === null) valorB = "";

    if (typeof valorA === "string") valorA = valorA.toLowerCase();
    if (typeof valorB === "string") valorB = valorB.toLowerCase();

    if (valorA < valorB) return ordenacaoDirecao === "asc" ? -1 : 1;
    if (valorA > valorB) return ordenacaoDirecao === "asc" ? 1 : -1;
    return 0;
  });

  const alternarOrdenacao = (campo) => {
    if (ordenacaoCampo === campo) {
      setOrdenacaoDirecao(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrdenacaoCampo(campo);
      setOrdenacaoDirecao("asc");
    }
  };

  const formatarMoeda = (valor) => {
    const num = Number(valor) || 0;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const colunasFiltradasPelaBusca = colunasDisponiveis.filter(col => 
    col.toLowerCase().includes(termoPesquisaColuna.toLowerCase())
  );

  const valoresFiltradosPelaBusca = valoresColunaAtual.filter(val => 
    val.toLowerCase().includes(termoPesquisaValor.toLowerCase())
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

  const temFiltroAtivo = Object.keys(filtrosAtivos).length > 0;
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
    <div className="data-apoio-container" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0px", background: "#ffffff", padding: "8px 12px", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
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
      <div className="filter-bar" style={{ padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
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
                <div style={{ position: 'absolute', top: '34px', left: 0, width: '240px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000, padding: '8px' }} onClick={(e) => e.stopPropagation()}>
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
                          onMouseEnter={(e) => { if (tipoFiltroAtual !== col) e.currentTarget.style.background = '#f1f5f9'; }}
                          onMouseLeave={(e) => { if (tipoFiltroAtual !== col) e.currentTarget.style.background = 'transparent'; }}
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
                <div style={{ position: 'absolute', top: '34px', left: 0, width: '280px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000, padding: '8px' }} onClick={(e) => e.stopPropagation()}>
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
                        <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '3px 5px', borderRadius: '4px', cursor: 'pointer', background: valoresSelecionadosTemp.includes(val) ? '#e0f2fe' : 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = valoresSelecionadosTemp.includes(val) ? '#e0f2fe' : 'transparent'}>
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
          <div className="filter-badges-container" style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
            {Object.keys(filtrosAtivos).map(campo => (
              filtrosAtivos[campo].map(valor => (
                <div key={`${campo}-${valor}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 500, border: "1px solid #bae6fd" }}>
                  <span>{campo}: <strong>{valor}</strong></span>
                  <button onClick={() => removerFiltroItem(campo, valor)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#0369a1", display: "flex", alignItems: "center", padding: 0 }}><X size={11} /></button>
                </div>
              ))
            ))}
          </div>
        </div>
      </div>

      {/* CARD 1: COM QTD_OS */}
      <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "5px", background: "#f8fafc" }}>
          <Table size={15} color="#005596" />
          <h3 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Resumo de Produtividade por Tipo de OS (Qtd de Registros / OS)</h3>
        </div>

        {dadosProcessadosTabela.length === 0 ? (
          <div style={{ padding: "18px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tabela-apoio-estilizada" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th onClick={() => alternarOrdenacao("tipo_os")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Tipo de OS</span>
                      {ordenacaoCampo === "tipo_os" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => alternarOrdenacao("qtd_os")} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", justifyContent: "center", width: "100%" }}>
                      <span>Qtd OS</span>
                      {ordenacaoCampo === "qtd_os" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => alternarOrdenacao("soma_valor_proj")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Valor Projetado</span>
                      {ordenacaoCampo === "soma_valor_proj" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "130px" }}>% Part. Proj.</th>
                  <th onClick={() => alternarOrdenacao("soma_valor_prod")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Valor Produzido</span>
                      {ordenacaoCampo === "soma_valor_prod" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "130px" }}>% Part. Prod.</th>
                  <th onClick={() => alternarOrdenacao("soma_valor_fatu")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Valor Faturado</span>
                      {ordenacaoCampo === "soma_valor_fatu" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "130px" }}>% Part. Fatu.</th>
                </tr>
              </thead>
              <tbody>
                {dadosTabelaOrdenados.map((item, index) => (
                  <tr key={index} style={{ transition: "background 0.15s" }}>
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
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#0284c7", minWidth: "32px" }}>
                          {item.perc_valor_proj.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(item.perc_valor_proj, 100)}%`, background: "#0284c7", height: "100%", borderRadius: "2px" }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: "600", color: "#0f172a" }}>
                      {formatarMoeda(item.soma_valor_prod)}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#10b981", minWidth: "32px" }}>
                          {item.perc_valor_prod.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(item.perc_valor_prod, 100)}%`, background: "#10b981", height: "100%", borderRadius: "2px" }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: "600", color: "#0f172a" }}>
                      {formatarMoeda(item.soma_valor_fatu)}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#d97706", minWidth: "32px" }}>
                          {item.perc_valor_fatu.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(item.perc_valor_fatu, 100)}%`, background: "#d97706", height: "100%", borderRadius: "2px" }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
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
                  <td style={{ fontSize: "11px", color: "#64748b" }}>
                    100%
                  </td>
                  <td style={{ fontSize: "12px", color: "#10b981" }}>
                    {formatarMoeda(totaisGerais.valorProdTotal)}
                  </td>
                  <td style={{ fontSize: "11px", color: "#64748b" }}>
                    100%
                  </td>
                  <td style={{ fontSize: "12px", color: "#d97706" }}>
                    {formatarMoeda(totaisGerais.valorFatuTotal)}
                  </td>
                  <td style={{ fontSize: "11px", color: "#64748b" }}>
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* CARD 2: COM NUM_OS (CONTAGEM ÚNICA / DISTINTA DE ORDENS DE SERVIÇO) */}
      <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", overflow: "hidden", marginTop: "6px" }}>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "5px", background: "#f8fafc" }}>
          <Table size={15} color="#005596" />
          <h3 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Resumo de Produtividade por Tipo de OS (Qtd de Ordens de Serviço Únicas - Num OS)</h3>
        </div>

        {dadosProcessadosTabela.length === 0 ? (
          <div style={{ padding: "18px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tabela-apoio-estilizada" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th onClick={() => alternarOrdenacao("tipo_os")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Tipo de OS</span>
                      {ordenacaoCampo === "tipo_os" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => alternarOrdenacao("num_os")} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", justifyContent: "center", width: "100%" }}>
                      <span>Num OS</span>
                      {ordenacaoCampo === "num_os" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => alternarOrdenacao("soma_valor_proj")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Valor Projetado</span>
                      {ordenacaoCampo === "soma_valor_proj" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "130px" }}>% Part. Proj.</th>
                  <th onClick={() => alternarOrdenacao("soma_valor_prod")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Valor Produzido</span>
                      {ordenacaoCampo === "soma_valor_prod" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "130px" }}>% Part. Prod.</th>
                  <th onClick={() => alternarOrdenacao("soma_valor_fatu")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Valor Faturado</span>
                      {ordenacaoCampo === "soma_valor_fatu" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "130px" }}>% Part. Fatu.</th>
                </tr>
              </thead>
              <tbody>
                {dadosTabelaOrdenados.map((item, index) => (
                  <tr key={index} style={{ transition: "background 0.15s" }}>
                    <td style={{ fontWeight: "600", color: "#0f172a" }}>
                      <span style={{ background: "#e0f2fe", color: "#005596", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>
                        {item.tipo_os}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: "600", color: "#334155" }}>
                      {item.num_os.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: "600", color: "#0f172a" }}>
                      {formatarMoeda(item.soma_valor_proj)}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#0284c7", minWidth: "32px" }}>
                          {item.perc_valor_proj.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(item.perc_valor_proj, 100)}%`, background: "#0284c7", height: "100%", borderRadius: "2px" }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: "600", color: "#0f172a" }}>
                      {formatarMoeda(item.soma_valor_prod)}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#10b981", minWidth: "32px" }}>
                          {item.perc_valor_prod.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(item.perc_valor_prod, 100)}%`, background: "#10b981", height: "100%", borderRadius: "2px" }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: "600", color: "#0f172a" }}>
                      {formatarMoeda(item.soma_valor_fatu)}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#d97706", minWidth: "32px" }}>
                          {item.perc_valor_fatu.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: "#e2e8f0", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(item.perc_valor_fatu, 100)}%`, background: "#d97706", height: "100%", borderRadius: "2px" }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1", fontWeight: "700", color: "#0f172a" }}>
                  <td style={{ padding: "8px 12px", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    Total Geral {temFiltroAtivo && <span style={{ color: "#0284c7", fontWeight: "normal" }}>(Filtrado)</span>}
                  </td>
                  <td style={{ textAlign: "center", fontSize: "12px" }}>
                    {totaisGerais.numOsTotal.toLocaleString()}
                  </td>
                  <td style={{ fontSize: "12px", color: "#005596" }}>
                    {formatarMoeda(totaisGerais.valorProjTotal)}
                  </td>
                  <td style={{ fontSize: "11px", color: "#64748b" }}>
                    100%
                  </td>
                  <td style={{ fontSize: "12px", color: "#10b981" }}>
                    {formatarMoeda(totaisGerais.valorProdTotal)}
                  </td>
                  <td style={{ fontSize: "11px", color: "#64748b" }}>
                    100%
                  </td>
                  <td style={{ fontSize: "12px", color: "#d97706" }}>
                    {formatarMoeda(totaisGerais.valorFatuTotal)}
                  </td>
                  <td style={{ fontSize: "11px", color: "#64748b" }}>
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}