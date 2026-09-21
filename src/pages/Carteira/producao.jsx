import React, { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import Swal from "sweetalert2";
import { 
  TrendingUp, Table, X, 
  ArrowUp, ArrowDown, RefreshCw 
} from "lucide-react";
import "./tabelas_internas.css";

export default function Producao() {
  const [loading, setLoading] = useState(true);
  const [todosDados, setTodosDados] = useState([]);
  
  const [colunasDisponiveis, setColunasDisponiveis] = useState([]);
  const [valoresColunaAtual, setValoresColunaAtual] = useState([]);

  const [tipoFiltroAtual, setTipoFiltroAtual] = useState("");
  const [valorFiltroSelect, setValorFiltroSelect] = useState("TODOS");
  const [filtrosAtivos, setFiltrosAtivos] = useState({});

  const [ordenacaoCampo, setOrdenacaoCampo] = useState("soma_valor_proj");
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState("desc");

  const [totaisGerais, setTotaisGerais] = useState({
    qtdOs: 0,
    valorProjTotal: 0,
    valorProdTotal: 0
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
    if (!tipoFiltroAtual || !Array.isArray(todosDados) || todosDados.length === 0) {
      setValoresColunaAtual([]);
      return;
    }

    const valoresSet = new Set();
    todosDados.forEach(item => {
      if (item && typeof item === 'object') {
        const val = item[tipoFiltroAtual];
        if (val !== undefined && val !== null && val !== "") {
          if (tipoFiltroAtual === "mes" || tipoFiltroAtual.includes("data")) {
            const str = String(val).substring(0, 7);
            if (str.length === 7) valoresSet.add(str);
          } else {
            valoresSet.add(String(val));
          }
        }
      }
    });

    const listaValores = Array.from(valoresSet).sort();
    setValoresColunaAtual(listaValores);
    setValorFiltroSelect("TODOS");
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
        const cols = Object.keys(sample).filter(c => !c.includes("id") && c !== "valor_proj" && c !== "valor_prod");
        setColunasDisponiveis(cols);
        if (cols.length > 0 && cols[0]) {
          setTipoFiltroAtual(cols[0]);
        }
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
    if (!tipoFiltroAtual || valorFiltroSelect === "TODOS") return;

    setFiltrosAtivos(prev => {
      const novosFiltros = { ...prev, [tipoFiltroAtual]: valorFiltroSelect };
      processarDados(todosDados, novosFiltros);
      return novosFiltros;
    });
  };

  const removerFiltro = (campo) => {
    setFiltrosAtivos(prev => {
      const novosFiltros = { ...prev };
      delete novosFiltros[campo];
      processarDados(todosDados, novosFiltros);
      return novosFiltros;
    });
  };

  const limparTodosFiltros = () => {
    setFiltrosAtivos({});
    setValorFiltroSelect("TODOS");
    processarDados(todosDados, {});
  };

  const processarDados = (dados, filtros) => {
    if (!Array.isArray(dados)) {
      setDadosProcessadosTabela([]);
      return;
    }

    let filtrados = [...dados];

    Object.keys(filtros).forEach(campo => {
      const valorFiltro = filtros[campo];
      filtrados = filtrados.filter(item => {
        if (!item) return false;
        const valItem = item[campo];
        if (valItem === undefined || valItem === null) return false;
        if (campo === "mes" || campo.includes("data")) {
          return String(valItem).startsWith(valorFiltro);
        }
        return String(valItem) === valorFiltro;
      });
    });

    let somaGeralProj = 0;
    let somaGeralProd = 0;
    let qtdOsTotal = 0;
    const agrupado = {};

    filtrados.forEach((item) => {
      if (!item) return;
      const tipo = item.tipo_os || "Não Definido";
      const valProj = Number(item.valor_proj) || 0;
      const valProd = Number(item.valor_prod) || 0;

      somaGeralProj += valProj;
      somaGeralProd += valProd;
      qtdOsTotal += 1;

      if (!agrupado[tipo]) {
        agrupado[tipo] = {
          tipo_os: tipo,
          qtd_os: 0,
          soma_valor_proj: 0,
          soma_valor_prod: 0
        };
      }

      agrupado[tipo].qtd_os += 1;
      agrupado[tipo].soma_valor_proj += valProj;
      agrupado[tipo].soma_valor_prod += valProd;
    });

    setTotaisGerais({
      qtdOs: qtdOsTotal,
      valorProjTotal: somaGeralProj,
      valorProdTotal: somaGeralProd
    });

    const resultadoFinal = Object.values(agrupado).map((grupo) => {
      const percProj = somaGeralProj > 0 ? (grupo.soma_valor_proj / somaGeralProj) * 100 : 0;
      const percProd = somaGeralProd > 0 ? (grupo.soma_valor_prod / somaGeralProd) * 100 : 0;

      return {
        ...grupo,
        perc_valor_proj: percProj,
        perc_valor_prod: percProd
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
    <div className="data-apoio-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", background: "#ffffff", padding: "10px 16px", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ backgroundColor: "#0284c7", color: "#fff", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,85,150,0.2)" }}>
            <TrendingUp size={16} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a", fontWeight: "700", lineHeight: "1.2" }}>Dashboard de Produtividade</h2>
            <p style={{ margin: "1px 0 0 0", fontSize: "0.72rem", color: "#64748b" }}>Visão consolidada por Tipo de OS (view_dados_produtividade).</p>
          </div>
        </div>

        <button 
          className="btn-adicionar-card-global" 
          style={{ ...alturaUnificadaEstilo, position: "relative", top: "auto", right: "auto", padding: "0 14px", fontSize: "0.85rem" }} 
          onClick={carregarTodosDadosProdutividade}
        >
          <RefreshCw size={14} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-controls-wrapper">
          <div className="filter-select-group" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <select className="filter-control-field" style={alturaUnificadaEstilo} value={tipoFiltroAtual} onChange={(e) => setTipoFiltroAtual(e.target.value)}>
              {colunasDisponiveis.map(col => (
                <option key={col} value={col}>Coluna: {col.toUpperCase()}</option>
              ))}
            </select>

            <select className="filter-control-field" style={alturaUnificadaEstilo} value={valorFiltroSelect} onChange={(e) => setValorFiltroSelect(e.target.value)}>
              <option value="TODOS">TODOS OS VALORES</option>
              {valoresColunaAtual.map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>

            <button type="button" className="filter-btn-aplicar" style={alturaUnificadaEstilo} onClick={adicionarFiltroDinamico}>
              Adicionar Filtro
            </button>

            {temFiltroAtivo && (
              <button type="button" className="filter-btn-limpar-todos" style={alturaUnificadaEstilo} onClick={limparTodosFiltros} title="Limpar todos os filtros">
                <X size={11} /> Limpar Todos
              </button>
            )}
          </div>

          <div className="filter-badges-container" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
            {Object.keys(filtrosAtivos).map(campo => (
              <div key={campo} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#e0f2fe", color: "#0369a1", padding: "3px 10px", borderRadius: "16px", fontSize: "0.78rem", fontWeight: 500, border: "1px solid #bae6fd" }}>
                <span>{campo}: <strong>{filtrosAtivos[campo]}</strong></span>
                <button onClick={() => removerFiltro(campo)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#0369a1", display: "flex", alignItems: "center", padding: 0 }}><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 2px 4px -1px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", overflow: "hidden", marginTop: "12px" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc" }}>
          <Table size={16} color="#005596" />
          <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Resumo de Produtividade por Tipo de OS</h3>
        </div>

        {dadosProcessadosTabela.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
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
                  <th style={{ width: "160px" }}>% Part. Proj.</th>
                  <th onClick={() => alternarOrdenacao("soma_valor_prod")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Valor Produzido</span>
                      {ordenacaoCampo === "soma_valor_prod" && (
                        ordenacaoDirecao === "asc" ? <ArrowUp size={11} strokeWidth={2.5} style={{ color: "#005596" }} /> : <ArrowDown size={11} strokeWidth={2.5} style={{ color: "#005596" }} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "160px" }}>% Part. Prod.</th>
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
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#0284c7", minWidth: "36px" }}>
                          {item.perc_valor_proj.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: "#e2e8f0", height: "5px", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(item.perc_valor_proj, 100)}%`, background: "#0284c7", height: "100%", borderRadius: "3px" }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: "600", color: "#0f172a" }}>
                      {formatarMoeda(item.soma_valor_prod)}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#10b981", minWidth: "36px" }}>
                          {item.perc_valor_prod.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: "#e2e8f0", height: "5px", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(item.perc_valor_prod, 100)}%`, background: "#10b981", height: "100%", borderRadius: "3px" }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1", fontWeight: "700", color: "#0f172a" }}>
                  <td style={{ padding: "11px 16px", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                    Total Geral {temFiltroAtivo && <span style={{ color: "#0284c7", fontWeight: "normal" }}>(Filtrado)</span>}
                  </td>
                  <td style={{ textAlign: "center", fontSize: "13px" }}>
                    {totaisGerais.qtdOs.toLocaleString()}
                  </td>
                  <td style={{ fontSize: "13px", color: "#005596" }}>
                    {formatarMoeda(totaisGerais.valorProjTotal)}
                  </td>
                  <td style={{ fontSize: "11px", color: "#64748b" }}>
                    100%
                  </td>
                  <td style={{ fontSize: "13px", color: "#10b981" }}>
                    {formatarMoeda(totaisGerais.valorProdTotal)}
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