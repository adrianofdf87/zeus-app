import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import { Table, Filter, RotateCcw } from "lucide-react";

export default function Producao() {
  const [loading, setLoading] = useState(true);
  const [todosDados, setTodosDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  
  // Opções e estados dos filtros
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  const [tiposDisponiveis, setTiposDisponiveis] = useState([]);
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const [totaisGerais, setTotaisGerais] = useState({
    qtdOs: 0,
    valorProjTotal: 0,
    valorProdTotal: 0
  });
  const [dadosProcessadosTabela, setDadosProcessadosTabela] = useState([]);

  useEffect(() => {
    carregarTodosDadosProdutividade();
  }, []);

  useEffect(() => {
    aplicarFiltrosEProcessar();
  }, [todosDados, filtroMes, filtroTipo]);

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

        if (data && data.length > 0) {
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
      extrairOpcoesFiltros(allData);
    } catch (error) {
      console.error("Erro ao carregar dados de produtividade:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const extrairOpcoesFiltros = (dados) => {
    const mesesSet = new Set();
    const tiposSet = new Set();

    dados.forEach((item) => {
      if (item.tipo_os) tiposSet.add(item.tipo_os);

      const campoData = item.data || item.data_criacao || item.data_programacao || item.mes || item.data_execucao;
      if (campoData) {
        const dataStr = String(campoData).substring(0, 7);
        if (dataStr.length === 7) mesesSet.add(dataStr);
      }
    });

    setTiposDisponiveis(Array.from(tiposSet).sort());
    
    const mesesOrdenados = Array.from(mesesSet).sort().map((m) => {
      const [ano, mes] = m.split("-");
      const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const label = `${nomeMeses[parseInt(mes, 10) - 1]} / ${ano}`;
      return { valor: m, label };
    });

    setMesesDisponiveis(mesesOrdenados);
  };

  const aplicarFiltrosEProcessar = () => {
    let filtrados = [...todosDados];

    if (filtroTipo) {
      filtrados = filtrados.filter(item => item.tipo_os === filtroTipo);
    }

    if (filtroMes) {
      filtrados = filtrados.filter(item => {
        const campoData = item.data || item.data_criacao || item.data_programacao || item.mes || item.data_execucao;
        if (!campoData) return false;
        return String(campoData).startsWith(filtroMes);
      });
    }

    setDadosFiltrados(filtrados);
    processarDadosTabela(filtrados);
  };

  const processarDadosTabela = (dados) => {
    let somaGeralProj = 0;
    let somaGeralProd = 0;
    let qtdOsTotal = 0;

    const agrupado = {};

    dados.forEach((item) => {
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

    resultadoFinal.sort((a, b) => b.soma_valor_proj - a.soma_valor_proj);
    setDadosProcessadosTabela(resultadoFinal);
  };

  const limparFiltros = () => {
    setFiltroMes("");
    setFiltroTipo("");
  };

  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
        <h3 style={{ fontSize: '16px', color: '#005596', fontWeight: '600', margin: 0, textAlign: 'center' }}>
          Carregando dados de produtividade...
        </h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Cabeçalho Compacto */}
      <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 2px 0' }}>
            Dashboard de Produtividade
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Visão consolidada por Tipo de OS (<code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px', color: '#0284c7' }}>view_dados_produtividade</code>)
          </p>
        </div>
        <button 
          onClick={carregarTodosDadosProdutividade}
          style={{ background: '#005596', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'background 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#0284c7'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#005596'}
        >
          Atualizar Dados
        </button>
      </div>

      {/* Div de Filtros */}
      <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontSize: '13px', fontWeight: '700' }}>
          <Filter size={15} color="#005596" />
          <span>Filtros:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Mês:</span>
          <select 
            value={filtroMes} 
            onChange={(e) => setFiltroMes(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a', background: '#f8fafc', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Todos os Meses</option>
            {mesesDisponiveis.map((m, idx) => (
              <option key={idx} value={m.valor}>{m.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Tipo de OS:</span>
          <select 
            value={filtroTipo} 
            onChange={(e) => setFiltroTipo(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a', background: '#f8fafc', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">Todos os Tipos</option>
            {tiposDisponiveis.map((tipo, idx) => (
              <option key={idx} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        {(filtroMes || filtroTipo) && (
          <button 
            onClick={limparFiltros}
            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <RotateCcw size={13} /> Limpar Filtros
          </button>
        )}
      </div>

      {/* Tabela Compacta com Totais Integrados na Última Linha */}
      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc' }}>
          <Table size={16} color="#005596" />
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Resumo de Produtividade por Tipo de OS</h3>
        </div>

        {dadosProcessadosTabela.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                  <th style={{ padding: '9px 16px' }}>Tipo de OS</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Qtd OS</th>
                  <th style={{ padding: '9px 12px' }}>Valor Projetado</th>
                  <th style={{ padding: '9px 12px', width: '160px' }}>% Part. Proj.</th>
                  <th style={{ padding: '9px 12px' }}>Valor Produzido</th>
                  <th style={{ padding: '9px 16px', width: '160px' }}>% Part. Prod.</th>
                </tr>
              </thead>
              <tbody>
                {dadosProcessadosTabela.map((item, index) => (
                  <tr 
                    key={index} 
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '9px 16px', fontWeight: '600', color: '#0f172a' }}>
                      <span style={{ background: '#e0f2fe', color: '#005596', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                        {item.tipo_os}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: '600', color: '#334155' }}>
                      {item.qtd_os.toLocaleString()}
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: '600', color: '#0f172a' }}>
                      {formatarMoeda(item.soma_valor_proj)}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#0284c7', minWidth: '36px' }}>
                          {item.perc_valor_proj.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: '#e2e8f0', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(item.perc_valor_proj, 100)}%`, background: '#0284c7', height: '100%', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: '600', color: '#0f172a' }}>
                      {formatarMoeda(item.soma_valor_prod)}
                    </td>
                    <td style={{ padding: '9px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', minWidth: '36px' }}>
                          {item.perc_valor_prod.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: '#e2e8f0', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(item.perc_valor_prod, 100)}%`, background: '#10b981', height: '100%', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Linha de Total Geral Fixa no Rodapé da Tabela */}
              <tfoot>
                <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: '700', color: '#0f172a' }}>
                  <td style={{ padding: '11px 16px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Total Geral {(filtroMes || filtroTipo) && <span style={{ color: '#0284c7', fontWeight: 'normal' }}>(Filtrado)</span>}
                  </td>
                  <td style={{ padding: '11px 12px', textAlign: 'center', fontSize: '13px' }}>
                    {totaisGerais.qtdOs.toLocaleString()}
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: '13px', color: '#005596' }}>
                    {formatarMoeda(totaisGerais.valorProjTotal)}
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: '11px', color: '#64748b' }}>
                    100%
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: '13px', color: '#10b981' }}>
                    {formatarMoeda(totaisGerais.valorProdTotal)}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '11px', color: '#64748b' }}>
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