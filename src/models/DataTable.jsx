import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, 
  Columns3, Maximize2, Minimize2, Edit2, Check, Filter, RotateCcw 
} from "lucide-react";
import Swal from "sweetalert2";
import "./DataTable.css";

const formatarDado = (valor, coluna) => {
  if (valor === null || valor === undefined || valor === "") return "-";
  const colLower = String(coluna).toLowerCase();
  
  if (colLower === "id") return String(valor);
  
  if (colLower.includes("valor") || colLower.includes("total") || colLower.includes("custo") || colLower.includes("pago") || colLower.includes("serviço")) {
    const num = parseFloat(valor);
    if (!isNaN(num)) return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  }
  
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    const d = new Date(valor);
    if (!isNaN(d.getTime())) {
      d.setUTCDate(d.getUTCDate());
      return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
    }
  }
  return String(valor);
};

export default function DataTable({ data = [], tableId = "tabela_geral", onSelectionChange }) {
  const [colunasTabela, setColunasTabela] = useState([]);
  const [colunasOcultas, setColunasOcultas] = useState([]);
  const [tempColunasOcultas, setTempColunasOcultas] = useState([]);
  const [colunasApelidos, setColunasApelidos] = useState({});
  const [filtrosGlobais, setFiltrosGlobais] = useState({});
  const [ordenacao, setOrdenacao] = useState({ coluna: null, asc: true });
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(100);
  const [linhasSelecionadas, setLinhasSelecionadas] = useState(new Set());
  const [telaCheia, setTelaCheia] = useState(false);
  
  const [menuAtivo, setMenuAtivo] = useState(null); 
  const [posicaoPopup, setPosicaoPopup] = useState({ top: 0, left: 0 });
  const [termoBuscaFiltro, setTermoBuscaFiltro] = useState("");
  const [tempFiltrosCheckbox, setTempFiltrosCheckbox] = useState(new Set());
  const [inputMaiorQue, setInputMaiorQue] = useState("");
  const [inputMenorQue, setInputMenorQue] = useState("");
  
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoApelidoCol, setNovoApelidoCol] = useState("");

  const [draggedColIdx, setDraggedColIdx] = useState(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (data.length > 0) {
      const colunasIniciais = Object.keys(data[0]).filter(c => c !== "id");
      const ocultasSalvas = JSON.parse(localStorage.getItem(`${tableId}_ocultas`)) || [];
      const ordemSalva = JSON.parse(localStorage.getItem(`${tableId}_ordem`)) || [];
      const apelidosSalvos = JSON.parse(localStorage.getItem(`${tableId}_apelidos`)) || {};

      setColunasOcultas(ocultasSalvas);
      setColunasApelidos(apelidosSalvos);

      let colunasAtivas = ordemSalva.length > 0 
        ? ordemSalva.filter(c => colunasIniciais.includes(c))
        : colunasIniciais;
        
      colunasIniciais.forEach(c => { if (!colunasAtivas.includes(c)) colunasAtivas.push(c); });
      setColunasTabela(colunasAtivas);
    }
  }, [data, tableId]);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) && !e.target.closest('.th-cell-container') && !e.target.closest('.table-col-checkbox-btn')) {
        setMenuAtivo(null);
        setEditandoNome(false);
      }
    };
    document.addEventListener("click", handleClickFora);
    return () => document.removeEventListener("click", handleClickFora);
  }, []);

  const dadosProcessados = useMemo(() => {
    let processados = [...data];

    if (Object.keys(filtrosGlobais).length > 0) {
      processados = processados.filter(item => {
        for (let col in filtrosGlobais) {
          const regras = filtrosGlobais[col];
          if (!regras || regras.length === 0) continue;

          let valBruto = item[col];
          let valNum = parseFloat(valBruto);
          let valStr = valBruto === null || valBruto === undefined || String(valBruto).trim() === "" ? "##NULL##" : String(valBruto);

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
            if (!passaNum && !passaExact) return false;
          } else if (numFilters.length > 0 && !passaNum) {
            return false;
          } else if (exactFilters.length > 0 && !passaExact) {
            return false;
          }
        }
        return true;
      });
    }

    if (ordenacao.coluna) {
      processados.sort((a, b) => {
        let valA = a[ordenacao.coluna] ?? "";
        let valB = b[ordenacao.coluna] ?? "";
        let numA = parseFloat(valA), numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) return ordenacao.asc ? numA - numB : numB - numA;
        let strA = String(valA).toLowerCase(), strB = String(valB).toLowerCase();
        if (strA < strB) return ordenacao.asc ? -1 : 1;
        if (strA > strB) return ordenacao.asc ? 1 : -1;
        return 0;
      });
    }

    return processados;
  }, [data, filtrosGlobais, ordenacao]);

  const totalPaginas = Math.ceil(dadosProcessados.length / registrosPorPagina) || 1;
  const dadosPagina = dadosProcessados.slice((paginaAtual - 1) * registrosPorPagina, paginaAtual * registrosPorPagina);

  const toggleSelecionarLinha = (id) => {
    const novas = new Set(linhasSelecionadas);
    if (novas.has(id)) novas.delete(id);
    else novas.add(id);
    setLinhasSelecionadas(novas);
    if (onSelectionChange) onSelectionChange(Array.from(novas));
  };

  const abrirMenuExcel = (coluna, e) => {
    e.stopPropagation();
    const cellContainer = e.currentTarget.closest('.th-cell-container') || e.currentTarget;
    const rect = cellContainer.getBoundingClientRect();
    
    const popupWidth = 270;
    const popupHeight = 360;

    let leftPos = rect.left;
    if (leftPos + popupWidth > window.innerWidth) {
      leftPos = window.innerWidth - popupWidth - 10;
    }

    let topPos = rect.bottom + 4;
    if (topPos + popupHeight > window.innerHeight) {
      topPos = rect.top - popupHeight - 4; 
    }

    setPosicaoPopup({ top: topPos, left: Math.max(10, leftPos) });

    const filtrosAtivos = filtrosGlobais[coluna] || [];
    const exatos = filtrosAtivos.filter(f => !f.startsWith(">=|") && !f.startsWith("<=|"));
    const gte = filtrosAtivos.find(f => f.startsWith(">=|"))?.split(">=|")[1] || "";
    const lte = filtrosAtivos.find(f => f.startsWith("<=|"))?.split("<=|")[1] || "";

    setTempFiltrosCheckbox(new Set(exatos));
    setInputMaiorQue(gte);
    setInputMenorQue(lte);
    setTermoBuscaFiltro("");
    setEditandoNome(false);
    setNovoApelidoCol(colunasApelidos[coluna] || coluna.toUpperCase());
    setMenuAtivo({ tipo: 'excel', coluna });
  };

  const abrirMenuColunasGeral = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPosicaoPopup({ top: rect.bottom + 4, left: rect.left });
    setTempColunasOcultas([...colunasOcultas]);
    setMenuAtivo({ tipo: 'colunas' });
  };

  const salvarApelidoColuna = (coluna) => {
    const novosApelidos = { ...colunasApelidos, [coluna]: novoApelidoCol };
    setColunasApelidos(novosApelidos);
    localStorage.setItem(`${tableId}_apelidos`, JSON.stringify(novosApelidos));
    setEditandoNome(false);
  };

  const aplicarFiltrosCompletos = (coluna) => {
    let novasRegras = [];
    if (tempFiltrosCheckbox.size > 0) novasRegras = [...Array.from(tempFiltrosCheckbox)];
    if (inputMaiorQue.trim() !== "") novasRegras.push(`>=|${inputMaiorQue}`);
    if (inputMenorQue.trim() !== "") novasRegras.push(`<=|${inputMenorQue}`);

    if (novasRegras.length === 0) {
      const copia = { ...filtrosGlobais };
      delete copia[coluna];
      setFiltrosGlobais(copia);
    } else {
      setFiltrosGlobais(prev => ({ ...prev, [coluna]: novasRegras }));
    }

    setMenuAtivo(null);
    setPaginaAtual(1);
  };

  const limparFiltroColuna = (coluna) => {
    const copia = { ...filtrosGlobais };
    delete copia[coluna];
    setFiltrosGlobais(copia);
    setMenuAtivo(null);
    setPaginaAtual(1);
  };

  const limparTodosFiltros = () => {
    setFiltrosGlobais({});
    setMenuAtivo(null);
    setPaginaAtual(1);
  };

  const aplicarColunasOcultas = () => {
    setColunasOcultas(tempColunasOcultas);
    localStorage.setItem(`${tableId}_ocultas`, JSON.stringify(tempColunasOcultas));
    setMenuAtivo(null);
  };

  const colunasVisiveis = colunasTabela.filter(c => !colunasOcultas.includes(c));

  const opcoesFiltroAtual = useMemo(() => {
    if (!menuAtivo || menuAtivo.tipo !== 'excel') return [];
    const coluna = menuAtivo.coluna;
    const vistos = new Set();
    const lista = [];

    data.forEach(item => {
      let val = item[coluna];
      let isNull = (val === null || val === undefined || String(val).trim() === "");
      let chave = isNull ? "##NULL##" : String(val);
      let exibicao = isNull ? "-" : formatarDado(val, coluna);

      if (!vistos.has(chave)) {
        if (termoBuscaFiltro === "" || exibicao.toLowerCase().includes(termoBuscaFiltro.toLowerCase())) {
          vistos.add(chave);
          lista.push({ chave, exibicao });
        }
      }
    });
    return lista.sort((a, b) => a.exibicao.localeCompare(b.exibicao));
  }, [menuAtivo, data, termoBuscaFiltro]);

  const temFiltroNaColunaAtual = menuAtivo && menuAtivo.tipo === 'excel' && filtrosGlobais[menuAtivo.coluna] && filtrosGlobais[menuAtivo.coluna].length > 0;
  const temQualquerFiltroAtivo = Object.keys(filtrosGlobais).some(col => filtrosGlobais[col] && filtrosGlobais[col].length > 0);

  return (
    <div className={`table-card ${telaCheia ? "maximized" : ""}`}>
      
      {/* TABELA RESPONSIVA */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th className="table-col-checkbox-th">
                <button className="excel-filter-btn table-col-checkbox-btn" onClick={abrirMenuColunasGeral} title="Gerenciar Colunas">
                  <Columns3 size={14} />
                </button>
              </th>

              {colunasVisiveis.map((col, idx) => {
                const ativo = filtrosGlobais[col] && filtrosGlobais[col].length > 0 || ordenacao.coluna === col;
                const nomeExibicao = colunasApelidos[col] || col.toUpperCase();
                return (
                  <th 
                    key={col} 
                    draggable 
                    onDragStart={(e) => setDraggedColIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedColIdx === null || draggedColIdx === idx) return;
                      const novas = [...colunasTabela];
                      const movida = novas.splice(draggedColIdx, 1)[0];
                      novas.splice(idx, 0, movida);
                      setColunasTabela(novas);
                      localStorage.setItem(`${tableId}_ordem`, JSON.stringify(novas));
                      setDraggedColIdx(null);
                    }}
                    className="draggable-th"
                  >
                    <div className="th-cell-container" onClick={(e) => abrirMenuExcel(col, e)}>
                      <span className="th-title-text" title={nomeExibicao}>
                        {nomeExibicao}
                      </span>
                      <div className="th-actions-group">
                        <button 
                          id={`btn_col_${col}`}
                          className={`excel-filter-btn ${ativo ? 'active' : ''}`}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {dadosPagina.length === 0 ? (
              <tr>
                <td colSpan={colunasVisiveis.length + 1} style={{ textAlign: 'center', padding: '20px', color: '#6b7280', backgroundColor: '#fff' }}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              dadosPagina.map(row => (
                <tr key={row.id || Math.random()} className={linhasSelecionadas.has(row.id) ? "selected" : ""}>
                  <td className="table-col-checkbox-td">
                    <input 
                      type="checkbox" 
                      checked={linhasSelecionadas.has(row.id)} 
                      onChange={() => toggleSelecionarLinha(row.id)} 
                      className="table-col-checkbox-input"
                    />
                  </td>
                  {colunasVisiveis.map(col => (
                    <td key={col}>{formatarDado(row[col], col)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RODAPÉ E PAGINAÇÃO COMPACTO */}
      <div className="pagination-bar">
        <div className="page-controls" style={{ fontWeight: '500', color: '#334155' }}>
          Mostrando <strong>{dadosProcessados.length}</strong> de <strong>{data.length}</strong> registros
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="page-controls">
            <span>Mostrar:</span>
            <select value={registrosPorPagina} onChange={e => { setRegistrosPorPagina(Number(e.target.value)); setPaginaAtual(1); }}>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="500">500</option>
            </select>
          </div>

          <div className="page-controls">
            <span className="page-indicator">Página {paginaAtual} de {totalPaginas}</span>
            <div className="page-buttons-group">
              <button disabled={paginaAtual === 1} onClick={() => setPaginaAtual(1)}><ChevronLeft size={14}/><ChevronLeft size={14}/></button>
              <button disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)}><ChevronLeft size={14}/></button>
              <button disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)}><ChevronRight size={14}/></button>
              <button disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(totalPaginas)}><ChevronRight size={14}/><ChevronRight size={14}/></button>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================================
         CARDS FLUTUANTES (EXCEL E GERENCIAR COLUNAS)
         ========================================================================== */}
      {menuAtivo && (
        <div 
          ref={popupRef} 
          className="excel-filter-popup show" 
          style={{ top: `${posicaoPopup.top}px`, left: `${posicaoPopup.left}px` }}
          onClick={e => e.stopPropagation()}
        >
          {menuAtivo.tipo === 'excel' && (
            <div className="excel-card-completo">
              
              {/* NOME DA COLUNA E EDIÇÃO */}
              <div className="excel-column-title-box">
                {editandoNome ? (
                  <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      className="excel-filter-input" 
                      value={novoApelidoCol}
                      onChange={e => setNovoApelidoCol(e.target.value)}
                      autoFocus
                    />
                    <button className="excel-filter-btn active" onClick={() => salvarApelidoColuna(menuAtivo.coluna)} title="Salvar Nome">
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="excel-column-name-label">Coluna: <strong>{colunasApelidos[menuAtivo.coluna] || menuAtivo.coluna.toUpperCase()}</strong></span>
                    <button className="excel-filter-btn" onClick={() => setEditandoNome(true)} title="Editar Nome da Coluna">
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className="menu-opcoes-divider"></div>

              {/* ORDENAÇÃO */}
              <div className="excel-section">
                <button 
                  className={`excel-filter-item menu-opcoes-btn bg-transparent ${ordenacao.coluna === menuAtivo.coluna && ordenacao.asc ? 'ordenacao-ativa' : ''}`} 
                  onClick={() => { setOrdenacao({ coluna: menuAtivo.coluna, asc: true }); setMenuAtivo(null); }}
                >
                  <ArrowUp size={13} /> <span>Ordenar de A a Z</span>
                  {ordenacao.coluna === menuAtivo.coluna && ordenacao.asc && <Check size={12} style={{ marginLeft: 'auto', color: '#005596' }} />}
                </button>
                <button 
                  className={`excel-filter-item menu-opcoes-btn bg-transparent ${ordenacao.coluna === menuAtivo.coluna && !ordenacao.asc ? 'ordenacao-ativa' : ''}`} 
                  onClick={() => { setOrdenacao({ coluna: menuAtivo.coluna, asc: false }); setMenuAtivo(null); }}
                >
                  <ArrowDown size={13} /> <span>Ordenar de Z a A</span>
                  {ordenacao.coluna === menuAtivo.coluna && !ordenacao.asc && <Check size={12} style={{ marginLeft: 'auto', color: '#005596' }} />}
                </button>
              </div>

              <div className="menu-opcoes-divider"></div>

              {/* FILTROS NUMÉRICOS EM UMA SÓ LINHA */}
              <div className="excel-section">
                <span className="excel-filter-header">Filtro Numérico (Condicional)</span>
                <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                  <input 
                    type="number" 
                    className="excel-filter-input" 
                    placeholder="Maior (&gt;=)" 
                    value={inputMaiorQue}
                    onChange={e => setInputMaiorQue(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input 
                    type="number" 
                    className="excel-filter-input" 
                    placeholder="Menor (&lt;=)" 
                    value={inputMenorQue}
                    onChange={e => setInputMenorQue(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div className="menu-opcoes-divider"></div>

              {/* FILTRO POR VALORES (FIXO PARA 6 LINHAS + FANTOMAS CINZAS) */}
              <div className="excel-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
                  <span className="excel-filter-header">Filtrar por Valores</span>
                  {temQualquerFiltroAtivo && (
                    <span 
                      className="excel-filter-header-acoes" 
                      onClick={limparTodosFiltros} 
                      style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem' }}
                      title="Limpar todos os filtros da tabela"
                    >
                      <RotateCcw size={11} /> Limpar Todos
                    </span>
                  )}
                </div>
                <input 
                  type="text" 
                  className="excel-filter-input" 
                  placeholder="Pesquisar..." 
                  value={termoBuscaFiltro}
                  onChange={e => setTermoBuscaFiltro(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '0.7rem' }}>
                  <span className="excel-filter-header-acoes" onClick={() => setTempFiltrosCheckbox(new Set(opcoesFiltroAtual.map(o => o.chave)))}>Selecionar Todos</span>
                  <span className="excel-filter-header-acoes" onClick={() => setTempFiltrosCheckbox(new Set())}>Limpar</span>
                </div>
                
                <div className="excel-filter-list-valores">
                  {opcoesFiltroAtual.map(op => {
                    const marcado = tempFiltrosCheckbox.has(op.chave);
                    return (
                      <label key={op.chave} className="excel-filter-item">
                        <input 
                          type="checkbox" 
                          checked={marcado} 
                          onChange={(e) => {
                            const novo = new Set(tempFiltrosCheckbox);
                            if (e.target.checked) novo.add(op.chave);
                            else novo.delete(op.chave);
                            setTempFiltrosCheckbox(novo);
                          }} 
                        />
                        <span>{op.exibicao}</span>
                      </label>
                    );
                  })}

                  {Array.from({ length: Math.max(0, 6 - opcoesFiltroAtual.length) }).map((_, index) => (
                    <div key={`vazio-${index}`} className="excel-filter-item-vazio">
                      <div className="excel-vazio-checkbox-mock"></div>
                      <div className="excel-vazio-linha-mock"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RODAPÉ DO CARD */}
              <div className="excel-filter-footer">
                {temFiltroNaColunaAtual && (
                  <button className="btn-limpar-filtro" onClick={() => limparFiltroColuna(menuAtivo.coluna)}>Limpar Filtro</button>
                )}
                <div className="excel-filter-footer-group" style={{ marginLeft: temFiltroNaColunaAtual ? 'auto' : '0' }}>
                  <button className="btn-cancelar" onClick={() => setMenuAtivo(null)}>Cancelar</button>
                  <button className="btn-aplicar-filtro" onClick={() => aplicarFiltrosCompletos(menuAtivo.coluna)}>Aplicar</button>
                </div>
              </div>

            </div>
          )}

          {/* GERENCIAR COLUNAS */}
          {menuAtivo.tipo === 'colunas' && (
            <div className="excel-card-completo" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span className="excel-filter-header" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Gerenciar Colunas</span>
                <button 
                  className="btn-action-item" 
                  style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px' }} 
                  onClick={() => setTelaCheia(!telaCheia)}
                >
                  {telaCheia ? <Minimize2 size={12} /> : <Maximize2 size={12} />} 
                  <span>{telaCheia ? "Restaurar" : "Expandir"}</span>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.7rem' }}>
                <span className="excel-filter-header-acoes" onClick={() => setTempColunasOcultas([])}>Exibir Todas</span>
                <span className="excel-filter-header-acoes" onClick={() => setTempColunasOcultas([...colunasTabela])}>Ocultar Todas</span>
              </div>

              <div className="excel-filter-list-colunas">
                {colunasTabela.map(col => {
                  const visivel = !tempColunasOcultas.includes(col);
                  const nomeCol = colunasApelidos[col] || col.toUpperCase();
                  return (
                    <label key={col} className="excel-filter-item">
                      <input 
                        type="checkbox" 
                        checked={visivel} 
                        onChange={() => {
                          let novas = [...tempColunasOcultas];
                          if (visivel) novas.push(col);
                          else novas = novas.filter(c => c !== col);
                          setTempColunasOcultas(novas);
                        }} 
                      />
                      <span>{nomeCol}</span>
                    </label>
                  );
                })}
              </div>

              {/* RODAPÉ DO CARD DE COLUNAS */}
              <div className="excel-filter-footer">
                <button className="btn-cancelar" onClick={() => setMenuAtivo(null)}>Cancelar</button>
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