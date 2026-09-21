import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import { TrendingUp, DollarSign, FileText, Table } from "lucide-react";

export default function Producao() {
  const [loading, setLoading] = useState(true);
  const [dadosProcessados, setDadosProcessados] = useState([]);
  const [totaisGerais, setTotaisGerais] = useState({
    qtdOs: 0,
    valorProjTotal: 0,
    valorProdTotal: 0
  });

  useEffect(() => {
    carregarTodosDadosProdutividade();
  }, []);

  // Função para buscar TODOS os registros da view contornando o limite de 1000 linhas do Supabase
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
            fetchMore = false; // Acabaram os registros
          } else {
            page++;
          }
        } else {
          fetchMore = false;
        }
      }

      processarDados(allData);
    } catch (error) {
      console.error("Erro ao carregar dados de produtividade:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const processarDados = (dados) => {
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
    setDadosProcessados(resultadoFinal);
  };

  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
        <h3 style={{ fontSize: '18px', color: '#005596', fontWeight: '600', margin: 0, textAlign: 'center' }}>
          Carregando e consolidando todos os dados...
        </h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Cabeçalho */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
            Dashboard de Produtividade
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Visão consolidada por Tipo de OS com base na view <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0284c7' }}>view_dados_produtividade</code>
          </p>
        </div>
        <button 
          onClick={carregarTodosDadosProdutividade}
          style={{ background: '#005596', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#0284c7'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#005596'}
        >
          Atualizar Dados
        </button>
      </div>

      {/* Cards de KPIs no Topo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #005596', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '10px', color: '#005596', display: 'flex' }}>
            <FileText size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total de Ordens (OS)</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '4px 0 0 0' }}>{totaisGerais.qtdOs.toLocaleString()}</h3>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #0284c7', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '10px', color: '#0284c7', display: 'flex' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Valor Projetado Total</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '4px 0 0 0' }}>{formatarMoeda(totaisGerais.valorProjTotal)}</h3>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#d1fae5', padding: '12px', borderRadius: '10px', color: '#10b981', display: 'flex' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Valor Produzido Total</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '4px 0 0 0' }}>{formatarMoeda(totaisGerais.valorProdTotal)}</h3>
          </div>
        </div>

      </div>

      {/* Card em Formato de Tabela Moderna */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        
        {/* Cabeçalho do Card/Tabela */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}>
          <Table size={18} color="#005596" />
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Resumo de Produtividade por Tipo de OS</h3>
        </div>

        {dadosProcessados.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Nenhum registro encontrado.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                  <th style={{ padding: '12px 20px' }}>Tipo de OS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Qtd OS</th>
                  <th style={{ padding: '12px 16px' }}>Valor Projetado</th>
                  <th style={{ padding: '12px 16px', width: '180px' }}>% Part. Proj.</th>
                  <th style={{ padding: '12px 16px' }}>Valor Produzido</th>
                  <th style={{ padding: '12px 20px', width: '180px' }}>% Part. Prod.</th>
                </tr>
              </thead>
              <tbody>
                {dadosProcessados.map((item, index) => (
                  <tr 
                    key={index} 
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: '600', color: '#0f172a' }}>
                      <span style={{ background: '#e0f2fe', color: '#005596', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                        {item.tipo_os}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#334155' }}>
                      {item.qtd_os.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>
                      {formatarMoeda(item.soma_valor_proj)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7', minWidth: '40px' }}>
                          {item.perc_valor_proj.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(item.perc_valor_proj, 100)}%`, background: '#0284c7', height: '100%', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>
                      {formatarMoeda(item.soma_valor_prod)}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#10b981', minWidth: '40px' }}>
                          {item.perc_valor_prod.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(item.perc_valor_prod, 100)}%`, background: '#10b981', height: '100%', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}