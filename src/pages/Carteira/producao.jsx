import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
import { TrendingUp, Layers, DollarSign, FileText, PieChart } from "lucide-react";

export default function Producao() {
  const [loading, setLoading] = useState(true);
  const [dadosProcessados, setDadosProcessados] = useState([]);
  const [totaisGerais, setTotaisGerais] = useState({
    qtdOs: 0,
    valorProjTotal: 0,
    valorProdTotal: 0
  });

  useEffect(() => {
    carregarDadosProdutividade();
  }, []);

  const carregarDadosProdutividade = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("view_dados_produtividade")
        .select("*");

      if (error) throw error;

      if (data && data.length > 0) {
        processarDados(data);
      } else {
        setDadosProcessados([]);
      }
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

    // Mapa para agrupar por tipo_os
    const agrupado = {};

    dados.forEach((item) => {
      const tipo = item.tipo_os || "Não Definido";
      const valProj = Number(item.valor_proj) || 0;
      const valProd = Number(item.valor_prod) || 0;

      somaGeralProj += valProj;
      somaGeralProd += valProd;
      qtdOsTotal += 1; // Cada registro conta como 1 OS (ou ajuste caso num_os seja identificador único)

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

    // Calcula os percentuais com base nos totais gerais
    const resultadoFinal = Object.values(agrupado).map((grupo) => {
      const percProj = somaGeralProj > 0 ? (grupo.soma_valor_proj / somaGeralProj) * 100 : 0;
      const percProd = somaGeralProd > 0 ? (grupo.soma_valor_prod / somaGeralProd) * 100 : 0;

      return {
        ...grupo,
        perc_valor_proj: percProj,
        perc_valor_prod: percProd
      };
    });

    // Ordena por maior valor projetado
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
          Carregando dados de produtividade...
        </h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Cabeçalho da Página */}
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
          onClick={carregarDadosProdutividade}
          style={{ background: '#005596', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#0284c7'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#005596'}
        >
          Atualizar Dados
        </button>
      </div>

      {/* Cards de Indicadores Gerais (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', borderLeft: '4px solid #005596', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '10px', color: '#005596', display: 'flex' }}>
            <FileText size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Ordens (OS)</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '4px 0 0 0' }}>{totaisGerais.qtdOs.toLocaleString()}</h3>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', borderLeft: '4px solid #0284c7', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '10px', color: '#0284c7', display: 'flex' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Projetado Total</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '4px 0 0 0' }}>{formatarMoeda(totaisGerais.valorProjTotal)}</h3>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', borderLeft: '4px solid #10b981', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#d1fae5', padding: '12px', borderRadius: '10px', color: '#10b981', display: 'flex' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Produzido Total</span>
            <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '4px 0 0 0' }}>{formatarMoeda(totaisGerais.valorProdTotal)}</h3>
          </div>
        </div>

      </div>

      {/* Seção de Cards Modernos por Tipo de OS */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Layers size={18} color="#005596" />
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Detalhamento por Tipo de OS</h3>
      </div>

      {dadosProcessados.length === 0 ? (
        <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#64748b', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          Nenhum registro encontrado na view de produtividade.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {dadosProcessados.map((item, index) => (
            <div 
              key={index} 
              style={{ 
                background: '#fff', 
                borderRadius: '12px', 
                padding: '20px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', 
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
              }}
            >
              {/* Topo do Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#005596', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                    Tipo de OS
                  </span>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '6px 0 0 0' }}>
                    {item.tipo_os}
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Qtd OS</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{item.qtd_os}</span>
                </div>
              </div>

              {/* Corpo do Card: Valores e Percentuais */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                
                {/* Bloco Valor Projetado */}
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Valor Projetado</span>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                    {formatarMoeda(item.soma_valor_proj)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                    <span>Part. Proj.</span>
                    <span style={{ fontWeight: '600', color: '#0284c7' }}>{item.perc_valor_proj.toFixed(1)}%</span>
                  </div>
                  {/* Barra de Progresso Projetado */}
                  <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(item.perc_valor_proj, 100)}%`, background: '#0284c7', height: '100%', borderRadius: '3px' }}></div>
                  </div>
                </div>

                {/* Bloco Valor Produzido */}
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Valor Produzido</span>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                    {formatarMoeda(item.soma_valor_prod)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                    <span>Part. Prod.</span>
                    <span style={{ fontWeight: '600', color: '#10b981' }}>{item.perc_valor_prod.toFixed(1)}%</span>
                  </div>
                  {/* Barra de Progresso Produzido */}
                  <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(item.perc_valor_prod, 100)}%`, background: '#10b981', height: '100%', borderRadius: '3px' }}></div>
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}