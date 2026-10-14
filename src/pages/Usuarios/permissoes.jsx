import React, { useEffect, useMemo, useState } from "react";
import { Save, ChevronDown, ChevronRight, Monitor, Folder, CornerDownRight, Settings, SquareMenu, Check, Minus, Link2 } from "lucide-react";
import { supabase } from "../../services/supabase";
import Swal from "sweetalert2";

export default function PermissoesTab({ usuario }) {
  const [mapa, setMapa] = useState([]);
  const [ativas, setAtivas] = useState(new Set());
  const [abertos, setAbertos] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Correção aplicada aqui para ler corretamente as chaves em maiúsculas vindas do componente pai
  const usuarioId = usuario?.id || usuario?.ID || usuario?.ID_USUARIO;
  const nome = usuario?.nome || usuario?.Nome || usuario?.NOME || usuario?.nome_usuario || "Usuário";
  const perfil = usuario?.Perfil || usuario?.PERFIL || usuario?.perfil || usuario?.perfil_nome || "Não definido";
  const dev = String(perfil).trim().toLowerCase() === "desenvolvedor";

  useEffect(() => {
    let vivo = true;
    
    async function carregar() {
      if (!usuarioId) {
        setMapa([]);
        setAtivas(new Set());
        setCarregando(false);
        return;
      }
      setCarregando(true);
      try {
        const { data: md, error: me } = await supabase
          .from("tabi_sistema_mapa_permissoes")
          .select("chave,grupo,tela,nome,tipo,rota,chave_pai,ordem,ativo")
          .eq("ativo", true)
          .order("ordem", { ascending: true });

        if (me) throw me;

        const mapaFiltrado = (md || []).filter(item => {
          const nomeItem = String(item.nome || "").toLowerCase();
          const chaveItem = String(item.chave || "").toLowerCase();
          const ehSair = nomeItem.includes("sair") || nomeItem.includes("logout") || chaveItem.includes("sair") || chaveItem.includes("logout");
          const ehSenha = nomeItem.includes("alterar senha") || nomeItem.includes("trocar senha") || chaveItem.includes("senha");
          return !ehSair && !ehSenha;
        });

        let permissoes = [];
        if (!dev) {
          const { data, error } = await supabase
            .from("tabi_cad_usuarios_permissoes")
            .select("chave_acao")
            .eq("usuario_id", String(usuarioId));

          if (error) throw error;
          permissoes = (data || []).map(x => String(x.chave_acao || "")).filter(Boolean);
        }

        if (!vivo) return;
        setMapa(mapaFiltrado);
        setAtivas(new Set(permissoes));
      } catch (e) {
        console.error("Erro ao carregar permissões:", e);
        if (vivo) {
          setMapa([]);
          setAtivas(new Set());
          Swal.fire("Erro", e?.message || "Não foi possível carregar as permissões.", "error");
        }
      } finally {
        if (vivo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      vivo = false;
    };
  }, [usuarioId, dev]);

  const normalizarRota = v => {
    let s = String(v || "").trim();
    if (!s) return "";
    try {
      if (s.startsWith("#")) s = s.slice(1);
      const u = new URL(s, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      s = u.pathname || "/";
    } catch {}
    return s.replace(/\/+$/, "").toLowerCase() || "/";
  };

  const estrutura = useMemo(() => {
    const itens = [...mapa];
    const estruturais = itens.filter(x => ["menu", "submenu", "link"].includes(String(x.tipo || "").toLowerCase()));
    const porChave = new Map(itens.map(x => [x.chave, x]));
    const filhosExplicitos = new Map();

    estruturais.forEach(item => {
      const pai = item.chave_pai;
      if (!pai) return;
      if (!filhosExplicitos.has(pai)) filhosExplicitos.set(pai, []);
      filhosExplicitos.get(pai).push(item);
    });

    const porRota = new Map();
    estruturais.forEach(item => {
      const rota = normalizarRota(item.rota);
      if (!rota) return;
      if (!porRota.has(rota)) porRota.set(rota, []);
      porRota.get(rota).push(item);
    });

    const adicionados = new Set();

    function filhosEstruturais(pai) {
      return (filhosExplicitos.get(pai) || [])
        .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
        .map(x => {
          adicionados.add(x.chave);
          return { ...x, filhos: [] };
        });
    }

    const montarNo = (item, visitados = new Set()) => {
      if (visitados.has(item.chave)) return { ...item, filhos: [] };
      const novosVisitados = new Set(visitados);
      novosVisitados.add(item.chave);
      const filhos = [];

      const filhosMenu = filhosEstruturais(item.chave);
      filhosMenu.forEach(filho => {
        filhos.push(montarNo(filho, novosVisitados));
      });

      const rota = normalizarRota(item.rota);
      if (rota) {
        const relacionados = itens.filter(x => {
          if (!x?.chave || adicionados.has(x.chave)) return false;
          if (["menu", "submenu", "link"].includes(String(x.tipo || "").toLowerCase())) return false;
          if (x.chave_pai && porChave.has(x.chave_pai)) return false;
          return normalizarRota(x.rota) === rota;
        }).sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

        relacionados.forEach(x => {
          adicionados.add(x.chave);
          filhos.push({ ...x, filhos: [] });
        });
      }
      return { ...item, filhos };
    };

    const raizes = estruturais.filter(item => !item.chave_pai || !porChave.has(item.chave_pai)).sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
    const arvore = raizes.map(item => {
      adicionados.add(item.chave);
      return montarNo(item);
    });

    const sobras = itens.filter(x => x?.chave && !adicionados.has(x.chave)).sort((a, b) =>
      String(a.grupo || "").localeCompare(String(b.grupo || "")) ||
      String(a.tela || "").localeCompare(String(b.tela || "")) ||
      Number(a.ordem || 0) - Number(b.ordem || 0)
    );

    const grupos = {};
    sobras.forEach(x => {
      const g = x.grupo || "Sistema";
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push({ ...x, filhos: [] });
    });

    return { arvore, sobrasGrupos: grupos };
  }, [mapa]);

  const chavesDoNo = no => [no.chave, ...(no.filhos || []).flatMap(chavesDoNo)].filter(Boolean);

  const alternarNo = no => {
    if (dev) return;
    const chaves = [...new Set(chavesDoNo(no))];
    setAtivas(atual => {
      const novo = new Set(atual);
      const marcar = chaves.some(x => !novo.has(x));
      chaves.forEach(x => (marcar ? novo.add(x) : novo.delete(x)));
      return novo;
    });
  };

  const alternarChaves = chaves => {
    if (dev) return;
    const lista = [...new Set(chaves.filter(Boolean))];
    setAtivas(atual => {
      const novo = new Set(atual);
      const marcar = lista.some(x => !novo.has(x));
      lista.forEach(x => (marcar ? novo.add(x) : novo.delete(x)));
      return novo;
    });
  };

  const alternarAberto = chave => setAbertos(atual => ({ ...atual, [chave]: atual[chave] === false ? true : false }));

  const salvar = async () => {
    if (dev || !usuarioId || salvando) return;
    setSalvando(true);
    try {
      Swal.fire({
        title: "Salvando...",
        text: "Atualizando permissões do usuário.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      const { error: ed } = await supabase.from("tabi_cad_usuarios_permissoes").delete().eq("usuario_id", String(usuarioId));
      if (ed) throw ed;

      const payload = [...ativas].filter(Boolean).map(chave_acao => ({
        usuario_id: String(usuarioId),
        chave_acao: String(chave_acao)
      }));

      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase.from("tabi_cad_usuarios_permissoes").insert(payload.slice(i, i + 500));
        if (error) throw error;
      }

      await Swal.fire({ icon: "success", title: "Salvo!", text: "As permissões foram atualizadas.", timer: 1600, showConfirmButton: false });
    } catch (e) {
      console.error("Erro ao salvar permissões:", e);
      Swal.fire("Erro", "Não foi possível salvar: " + (e?.message || "erro desconhecido"), "error");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Carregando permissões...</div>;

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 15, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <ShieldIcon />
            <h3 style={{ margin: 0, fontSize: "1.08rem", color: "#172033" }}>Mapa de Permissões</h3>
          </div>
          <div style={{ marginTop: 5, fontSize: ".78rem", color: "#64748b" }}>
            Usuário: <b style={{ color: "#334155" }}>{nome}</b> {" · "} Perfil: <b style={{ color: "#005596" }}>{perfil}</b>
          </div>
        </div>
        <button type="button" disabled={dev || salvando} onClick={salvar} style={{ border: 0, borderRadius: 7, padding: "9px 15px", background: dev || salvando ? "#94a3b8" : "#005596", color: "#fff", display: "flex", alignItems: "center", gap: 7, cursor: dev || salvando ? "not-allowed" : "pointer", fontWeight: 600 }}>
          <Save size={16} />{salvando ? "Salvando..." : "Salvar Permissões"}
        </button>
      </div>

      {dev && <div style={{ margin: "12px 16px 0", padding: "9px 12px", borderRadius: 7, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a", fontSize: ".78rem" }}>⚠️ <b>Desenvolvedor:</b> acesso total liberado automaticamente.</div>}

      <div style={{ overflowY: "auto", padding: "4px 16px 18px", flex: 1, minHeight: 0 }}>
        {estrutura.arvore.map(no => <No key={no.chave} no={no} nivel={0} dev={dev} ativas={ativas} abertos={abertos} alternarNo={alternarNo} alternarAberto={alternarAberto} chavesDoNo={chavesDoNo} />)}

        {Object.entries(estrutura.sobrasGrupos).map(([grupo, itens]) => {
          const chaveGrupo = `sobra:${grupo}`;
          const total = [...new Set(itens.flatMap(chavesDoNo))];
          const marcadas = dev ? total.length : total.filter(x => ativas.has(x)).length;
          const est = { total: total.length, marcadas, completo: total.length > 0 && marcadas === total.length, parcial: marcadas > 0 && marcadas < total.length };
          return (
            <section key={chaveGrupo} style={{ marginTop: 10, background: "#fff", border: "1px solid #dbe3ec", borderRadius: 9, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#eef3f8" }}>
                <BulkBox estado={est} disabled={dev} onClick={() => alternarChaves(total)} />
                <Folder size={16} /><b>{grupo}</b>
                <span style={countStyle}>{est.marcadas}/{est.total}</span>
              </div>
              <div style={{ padding: "5px 10px 12px" }}>
                {itens.map(no => <No key={no.chave} no={no} nivel={0} dev={dev} ativas={ativas} abertos={abertos} alternarNo={alternarNo} alternarAberto={alternarAberto} chavesDoNo={chavesDoNo} />)}
              </div>
            </section>
          );
        })}

        {!estrutura.arvore.length && !Object.keys(estrutura.sobrasGrupos).length && <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Nenhum item mapeado.</div>}
      </div>
    </div>
  );
}

function No({ no, nivel, dev, ativas, abertos, alternarNo, alternarAberto, chavesDoNo }) {
  const filhos = no.filhos || [];
  const temFilhos = filhos.length > 0;
  const aberto = abertos[no.chave] !== false;
  const chaves = chavesDoNo(no);
  const marcadas = dev ? chaves.length : chaves.filter(x => ativas.has(x)).length;
  const estado = { total: chaves.length, marcadas, completo: chaves.length > 0 && marcadas === chaves.length, parcial: marcadas > 0 && marcadas < chaves.length };
  const tipo = String(no.tipo || "botao").toLowerCase();

  return (
    <div style={{ marginTop: 6, marginLeft: nivel * 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 33, padding: "5px 8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 7 }}>
        {temFilhos ? <button type="button" onClick={() => alternarAberto(no.chave)} style={iconButton}>{aberto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button> : <span style={{ width: 19 }} />}
        <BulkBox estado={estado} disabled={dev} onClick={() => alternarNo(no)} />
        <IconeTipo tipo={tipo} />
        <div title={no.rota ? `Rota: ${no.rota}` : no.chave} style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: tipo === "menu" ? ".82rem" : ".76rem", fontWeight: tipo === "menu" ? 700 : tipo === "submenu" ? 600 : 500, color: tipo === "menu" ? "#334155" : "#64748b" }}>
          {no.nome || no.chave}
        </div>
        <span style={{ fontSize: ".60rem", color: "#94a3b8", textTransform: "uppercase", flexShrink: 0 }}>{tipo}</span>
      </div>
      {temFilhos && aberto && <div style={{ marginLeft: 12, paddingLeft: 10, borderLeft: "2px solid #e2e8f0" }}>{filhos.map(filho => <No key={filho.chave} no={filho} nivel={nivel + 1} dev={dev} ativas={ativas} abertos={abertos} alternarNo={alternarNo} alternarAberto={alternarAberto} chavesDoNo={chavesDoNo} />)}</div>}
    </div>
  );
}

function IconeTipo({ tipo }) {
  if (tipo === "menu") return <Folder size={14} color="#475569" />;
  if (tipo === "submenu") return <CornerDownRight size={14} color="#64748b" />;
  if (tipo === "link") return <Link2 size={14} color="#64748b" />;
  if (tipo === "tela") return <Monitor size={14} color="#005596" />;
  if (tipo === "aba") return <SquareMenu size={14} color="#64748b" />;
  return <Settings size={14} color="#94a3b8" />;
}

function BulkBox({ estado, onClick, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{ width: 18, height: 18, padding: 0, border: `1px solid ${estado.completo || estado.parcial ? "#005596" : "#94a3b8"}`, borderRadius: 4, background: estado.completo ? "#005596" : estado.parcial ? "#e0effa" : "#fff", color: estado.completo ? "#fff" : "#005596", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", flexShrink: 0 }}>
      {estado.completo ? <Check size={12} strokeWidth={3} /> : estado.parcial ? <Minus size={12} strokeWidth={3} /> : null}
    </button>
  );
}

function ShieldIcon() {
  return <div style={{ width: 30, height: 30, borderRadius: 7, background: "#e8f1f8", display: "grid", placeItems: "center", color: "#005596", fontSize: 15 }}>✓</div>;
}

const iconButton = { border: 0, background: "transparent", padding: 2, cursor: "pointer", display: "flex", alignItems: "center", color: "#64748b" };
const countStyle = { marginLeft: "auto", fontSize: ".67rem", fontWeight: 650, color: "#64748b", background: "#fff", border: "1px solid #dbe3ec", borderRadius: 20, padding: "3px 8px" };