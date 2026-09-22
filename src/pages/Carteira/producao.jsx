import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";
import DataTable from "../../models/DataTable";
import Swal from "sweetalert2";
import { TrendingUp, RefreshCw } from "lucide-react";
import "../BancoDados/tabelas_internas.css";

export default function Producao() {
  const [loading, setLoading] = useState(true);
  const [todosDados, setTodosDados] = useState([]);
  const [filtrosGlobais, setFiltrosGlobais] = useState({});
  const [registrosPorPagina, setRegistrosPorPagina] = useState(100);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const [totaisGerais, setTotaisGerais] = useState({
    qtdOs: 0,
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
    processarDados(todosDados, filtrosGlobais);
  }, [todosDados, filtrosGlobais]);

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
      processarDados(allData, filtrosGlobais);
    } catch (error) {
      console.error("Erro ao carregar view_dados_produtividade:", error);
      AlertaLimpo.fire({ icon: "error", title: "Erro", text: "Não foi possível carregar os dados: " + (error.message || error) });
    } finally {
      setLoading(false);
    }
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
        const regras = filtros[campo];
        if (!regras || regras.length === 0) return;

        let valItem = item[campo];
        let valStr = valItem === null || valItem === undefined || String(valItem).trim() === "" ? "##NULL##" : String(valItem);
        let valNum = parseFloat(valItem);

        const numFilters = regras.filter(f => f.startsWith(">=|") || f.startsWith("<=|"));
        const exactFilters = regras.filter(f => !f.startsWith(">=|") && !f.startsWith("<=|"));

        let passaNum = true;
        if (numFilters.length > 0) {
          if (isNaN(valNum)) {
            passaNum = false;
          } else {
            for (let nf of numFilters) {
              if (nf.startsWith(">=|") && valNum < parseFloat(nf.split(">=|")[1])) passaNum = false;
              if (nf.startsWith("<=|") && valNum > parseFloat(nf.split("<=|")[1])) passaNum = false;
            }
          }
        }

        let passaExact = true;
        if (exactFilters.length > 0) {
          passaExact = exactFilters.includes(valStr);
        }

        if (numFilters.length > 0 && exactFilters.length > 0) {
          if (!passaNum && !passaExact) atendeTodos = false;
        } else if (numFilters.length > 0 && !passaNum) {
          atendeTodos = false;
        } else if (exactFilters.length > 0 && !passaExact) {
          atendeTodos = false;
        }
      });

      if (atendeTodos) {
        let itemProcessado = { ...item };
        if (filtros.meses && item.meses && typeof item.meses === 'object') {
          const mesesAtivos = filtros.meses.filter(f => !f.startsWith(">=|") && !f.startsWith("<=|"));
          if (mesesAtivos.length === 1) {
            const mesSelecionado = mesesAtivos[0];
            if (item.meses[mesSelecionado] !== undefined) {
              itemProcessado.valor_prod = Number(item.meses[mesSelecionado]) || 0;
            }
          }
        }
        filtrados.push(itemProcessado);
      }
    });

    let somaGeralProj = 0;
    let somaGeralProd = 0;
    let somaGeralFatu = 0;
    let qtdOsTotal = 0;
    const agrupado = {};

    filtrados.forEach((item) => {
      const tipo = item.tipo_os || "Não Definido";
      const valProj = Number(item.valor_proj) || 0;
      const valProd = Number(item.valor_prod) || 0;
      const valFatu = Number(item.valor_fatu) || 0;

      somaGeralProj += valProj;
      somaGeralProd += valProd;
      somaGeralFatu += valFatu;
      qtdOsTotal += 1;

      if (!agrupado[tipo]) {
        agrupado[tipo] = {
          tipo_os: tipo,
          qtd_os: 0,
          soma_valor_proj: 0,
          soma_valor_prod: 0,
          soma_valor_fatu: 0
        };
      }

      agrupado[tipo].qtd_os += 1;
      agrupado[tipo].soma_valor_proj += valProj;
      agrupado[tipo].soma_valor_prod += valProd;
      agrupado[tipo].soma_valor_fatu += valFatu;
    });

    setTotaisGerais({
      qtdOs: qtdOsTotal,
      valorProjTotal: somaGeralProj,
      valorProdTotal: somaGeralProd,
      valorFatuTotal: somaGeralFatu
    });

    const resultadoFinal = Object.values(agrupado).map((grupo, idx) => {
      const percProj = somaGeralProj > 0 ? (grupo.soma_valor_proj / somaGeralProj) * 100 : 0;
      const percProd = somaGeralProd > 0 ? (grupo.soma_valor_prod / somaGeralProd) * 100 : 0;
      const percFatu = somaGeralFatu > 0 ? (grupo.soma_valor_fatu / somaGeralFatu) * 100 : 0;

      return {
        id: idx + 1,
        tipo_os: grupo.tipo_os,
        qtd_os: grupo.qtd_os,
        soma_valor_proj: grupo.soma_valor_proj,
        perc_valor_proj: `${percProj.toFixed(1)}%`,
        soma_valor_prod: grupo.soma_valor_prod,
        perc_valor_prod: `${percProd.toFixed(1)}%`,
        soma_valor_fatu: grupo.soma_valor_fatu,
        perc_valor_fatu: `${percFatu.toFixed(1)}%`
      };
    });

    setDadosProcessadosTabela(resultadoFinal);
  };

  const handleFetchColumnOptions = useCallback(async (coluna, filtrosAtuais) => {
    const valoresSet = new Set();
    todosDados.forEach(item => {
      if (item && typeof item === 'object') {
        const val = item[coluna];
        if (coluna === "meses" && val && typeof val === 'object') {
          Object.keys(val).forEach(mesChave => {
            if (mesChave) valoresSet.add(mesChave);
          });
        } else if (val !== undefined && val !== null && String(val).trim() !== "") {
          valoresSet.add(String(val));
        }
      }
    });

    return Array.from(valoresSet).sort().map(val => ({
      chave: val,
      exibicao: val
    }));
  }, [todosDados]);

  const formatarMoeda = (valor) => {
    const num = Number(valor) || 0;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

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

  const temFiltroAtivo = Object.keys(filtrosGlobais).length > 0;

  return (
    <div className="data-apoio-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      {/* HEADER PADRONIZADO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", background: "#ffffff", padding: "10px 16px", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", flexShrink: 0 }}>
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

      {/* COMPONENTE DATATABLE COM FILTROS ESTILO EXCEL NAS COLUNAS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <DataTable 
          data={dadosProcessadosTabela}
          tableId="tabela_produtividade_resumo"
          filtrosExternos={filtrosGlobais}
          onFilterChange={(novosFiltros) => setFiltrosGlobais(novosFiltros)}
          totalBanco={dadosProcessadosTabela.length}
          paginaAtual={paginaAtual}
          registrosPorPagina={registrosPorPagina}
          onPageChange={(p) => setPaginaAtual(p)}
          onLimitChange={(l) => setRegistrosPorPagina(l)}
          onFetchColumnOptions={handleFetchColumnOptions}
        />
      </div>

      {/* RODAPÉ FIXO DE TOTAIS GERAIS */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderTop: "2px solid #cbd5e1", borderRadius: "0 0 8px 8px", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", fontWeight: "700", color: "#0f172a", flexShrink: 0 }}>
        <div>
          TOTAL GERAL {temFiltroAtivo && <span style={{ color: "#0284c7", fontWeight: "normal" }}>(Filtrado)</span>}
        </div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <div>Qtd OS: <span style={{ color: "#334155" }}>{totaisGerais.qtdOs.toLocaleString()}</span></div>
          <div>Projetado: <span style={{ color: "#005596" }}>{formatarMoeda(totaisGerais.valorProjTotal)}</span></div>
          <div>Produzido: <span style={{ color: "#10b981" }}>{formatarMoeda(totaisGerais.valorProdTotal)}</span></div>
          <div>Faturado: <span style={{ color: "#d97706" }}>{formatarMoeda(totaisGerais.valorFatuTotal)}</span></div>
        </div>
      </div>
    </div>
  );
}