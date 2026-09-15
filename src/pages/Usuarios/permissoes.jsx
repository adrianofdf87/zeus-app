import React, { useState, useEffect } from "react";
import { Save, ChevronDown } from "lucide-react";
import { supabase } from "../../services/supabase";
import Swal from "sweetalert2";

const BOTOES_ESPECIFICOS_POR_TELA = {
    "Usuários": [
        { chave: "usuarios.btnNovo", nome: "Botão Novo" },
        { chave: "usuarios.btn_editar", nome: "Botão Editar" },
        { chave: "usuarios.btnExcluir", nome: "Botão Excluir" },
        { chave: "usuarios.btnBloquear", nome: "Botão Bloquear" },
        { chave: "usuarios.coluna_checkbox", nome: "Ocultar Checkbox / Seleção" }
    ]
};

function gerarSlug(texto) {
    if (!texto) return "";
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_");
}

function obterModulosDoSistema() {
    const doc = (window.parent && window.parent.document.getElementById('sidebar')) ? window.parent.document : document;
    const sidebar = doc.getElementById('sidebar');
    const estruturaMenu = [];

    if (!sidebar) {
        return [
            {
                tipo: "grupo",
                modulo: "Configurações",
                chaveVisibilidade: "configuracoes.visivel",
                submenus: [],
                botoesEspecificos: BOTOES_ESPECIFICOS_POR_TELA["Usuários"] || []
            }
        ];
    }

    const linksDiretos = sidebar.querySelectorAll(':scope > .menu > a');
    linksDiretos.forEach(a => {
        const span = a.querySelector('span');
        if (span) {
            const nomeModulo = span.textContent.trim();
            if (nomeModulo) {
                const slug = gerarSlug(nomeModulo);
                estruturaMenu.push({
                    tipo: "grupo",
                    modulo: nomeModulo,
                    chaveVisibilidade: `${slug}.visivel`,
                    submenus: [],
                    botoesEspecificos: BOTOES_ESPECIFICOS_POR_TELA[nomeModulo] || []
                });
            }
        }
    });

    const menuItems = sidebar.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const linkPrincipal = item.querySelector('.menu-link span');
        const nomeGrupo = linkPrincipal ? linkPrincipal.textContent.trim() : 'Menu';

        const subLinks = item.querySelectorAll('.submenu a');
        const submenusLista = [];

        subLinks.forEach(subA => {
            const subSpan = subA.querySelector('span');
            if (subSpan) {
                const nomeSub = subSpan.textContent.trim();
                const slugSub = gerarSlug(nomeSub);
                submenusLista.push({
                    nome: nomeSub,
                    chaveVisibilidade: `${slugSub}.visivel`,
                    botoesEspecificos: BOTOES_ESPECIFICOS_POR_TELA[nomeSub] || []
                });
            }
        });

        const slugGrupo = gerarSlug(nomeGrupo);
        estruturaMenu.push({
            tipo: "grupo_com_sub",
            modulo: nomeGrupo,
            chaveVisibilidade: `${slugGrupo}.visivel`,
            submenus: submenusLista,
            botoesEspecificos: BOTOES_ESPECIFICOS_POR_TELA[nomeGrupo] || []
        });
    });

    return estruturaMenu;
}

export default function PermissoesTab({ usuario }) {
    const [menus, setMenus] = useState([]);
    const [permissoesAtivas, setPermissoesAtivas] = useState(new Set());
    const [carregando, setCarregando] = useState(true);
    const [submenusAbertos, setSubmenusAbertos] = useState({});

    const nomeUsuario = usuario?.nome || usuario?.Nome || 'Usuário';
    const usuarioId = usuario?.id || usuario?.ID;
    const perfilUsuario = String(usuario?.Perfil || usuario?.perfil || "").trim().toLowerCase();
    const isDesenvolvedor = perfilUsuario === "desenvolvedor";

    useEffect(() => {
        const carregarPermissoes = async () => {
            if (!usuarioId) return;
            try {
                setCarregando(true);
                const estrutura = obterModulosDoSistema();
                setMenus(estrutura);

                let chaves = new Set();
                if (isDesenvolvedor) {
                    estrutura.forEach(grupo => {
                        chaves.add(grupo.chaveVisibilidade);
                        grupo.botoesEspecificos?.forEach(b => chaves.add(b.chave));
                        grupo.submenus?.forEach(sub => {
                            chaves.add(sub.chaveVisibilidade);
                            sub.botoesEspecificos?.forEach(b => chaves.add(b.chave));
                        });
                    });
                } else {
                    const { data, error } = await supabase
                        .from("tabi_cad_usuarios_permissoes")
                        .select("chave_acao")
                        .eq("usuario_id", usuarioId);

                    if (error) throw error;
                    (data || []).forEach(p => chaves.add(p.chave_acao));
                }
                setPermissoesAtivas(chaves);
            } catch (err) {
                console.error("Erro ao carregar permissões:", err);
            } finally {
                setCarregando(false);
            }
        };

        carregarPermissoes();
    }, [usuarioId]);

    const toggleCheckbox = (chave) => {
        if (isDesenvolvedor) return;
        setPermissoesAtivas(prev => {
            const novo = new Set(prev);
            if (novo.has(chave)) novo.delete(chave);
            else novo.add(chave);
            return novo;
        });
    };

    const toggleSelecionarTudo = (marcar) => {
        if (isDesenvolvedor) return;
        if (!marcar) {
            setPermissoesAtivas(new Set());
            return;
        }
        const novo = new Set();
        menus.forEach(grupo => {
            novo.add(grupo.chaveVisibilidade);
            grupo.botoesEspecificos?.forEach(b => novo.add(b.chave));
            grupo.submenus?.forEach(sub => {
                novo.add(sub.chaveVisibilidade);
                sub.botoesEspecificos?.forEach(b => novo.add(b.chave));
            });
        });
        setPermissoesAtivas(novo);
    };

    const toggleArvore = (index) => {
        setSubmenusAbertos(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const salvarPermissoes = async () => {
        if (isDesenvolvedor || !usuarioId) return;
        try {
            Swal.fire({ title: "Salvando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            // 1. Remove antigas permissões do usuário específico
            const { error: errDel } = await supabase
                .from("tabi_cad_usuarios_permissoes")
                .delete()
                .eq("usuario_id", usuarioId);

            if (errDel) throw errDel;

            // 2. Insere as novas permissões ativas
            const payload = Array.from(permissoesAtivas).map(chave => ({
                usuario_id: String(usuarioId),
                chave_acao: chave
            }));

            if (payload.length > 0) {
                const { error: errIns } = await supabase
                    .from("tabi_cad_usuarios_permissoes")
                    .insert(payload);

                if (errIns) throw errIns;
            }

            Swal.fire({ icon: "success", title: "Salvo com sucesso!", text: "As permissões foram atualizadas.", timer: 2000, showConfirmButton: false });
        } catch (err) {
            Swal.fire("Erro", "Não foi possível salvar as permissões: " + err.message, "error");
        }
    };

    if (carregando) {
        return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Carregando matriz de permissões...</div>;
    }

    return (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0, gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem' }}>Permissões do Usuário: <span style={{ color: '#005596' }}>{nomeUsuario}</span></h3>
                    <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                        <span style={{ color: '#d97706', fontWeight: 600 }}>Perfil: {usuario?.Perfil || usuario?.perfil || 'Não definido'}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.82rem', color: '#1e293b', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', userSelect: 'none' }}>
                        <input type="checkbox" disabled={isDesenvolvedor} onChange={(e) => toggleSelecionarTudo(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: '#005596', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer' }} /> Selecionar Tudo
                    </label>
                    <button 
                        disabled={isDesenvolvedor} 
                        onClick={salvarPermissoes} 
                        style={{ background: isDesenvolvedor ? '#94a3b8' : '#005596', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                        <Save size={16} /> Salvar Permissões
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', paddingRight: '6px' }}>
                {menus.map((grupo, idx) => {
                    const isOpen = !!submenusAbertos[idx];
                    const isGrupoChecked = permissoesAtivas.has(grupo.chaveVisibilidade);

                    return (
                        <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#1e293b', fontSize: '0.95rem', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer', userSelect: 'none', flex: 1 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={isGrupoChecked} 
                                        disabled={isDesenvolvedor} 
                                        onChange={() => toggleCheckbox(grupo.chaveVisibilidade)} 
                                        style={{ width: '16px', height: '16px', accentColor: '#005596', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer' }} 
                                    />
                                    <span>📂 {grupo.modulo}</span>
                                </label>
                                <ChevronDown 
                                    size={18} 
                                    onClick={() => toggleArvore(idx)} 
                                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#64748b', cursor: 'pointer' }} 
                                />
                            </div>

                            {isOpen && (
                                <div style={{ padding: '14px 16px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {grupo.submenus && grupo.submenus.map((sub, sIdx) => {
                                        const isSubChecked = permissoesAtivas.has(sub.chaveVisibilidade);
                                        return (
                                            <div key={sIdx} style={{ marginLeft: '12px', borderLeft: '2px solid #cbd5e1', paddingLeft: '12px', marginBottom: '8px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '0.88rem', color: '#475569', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSubChecked} 
                                                        disabled={isDesenvolvedor} 
                                                        onChange={() => toggleCheckbox(sub.chaveVisibilidade)} 
                                                        style={{ width: '14px', height: '14px', accentColor: '#005596', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer' }} 
                                                    />
                                                    <span>🔹 {sub.nome} (Exibir Submenu)</span>
                                                </label>

                                                {sub.botoesEspecificos && sub.botoesEspecificos.length > 0 && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginTop: '6px', marginLeft: '20px' }}>
                                                        {sub.botoesEspecificos.map((btn, bIdx) => {
                                                            const isBtnChecked = permissoesAtivas.has(btn.chave);
                                                            return (
                                                                <label key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#334151', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer', background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isBtnChecked} 
                                                                        disabled={isDesenvolvedor} 
                                                                        onChange={() => toggleCheckbox(btn.chave)} 
                                                                        style={{ width: '13px', height: '13px', accentColor: '#005596', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer' }} 
                                                                    />
                                                                    <span>⚙️ {btn.nome}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {grupo.botoesEspecificos && grupo.botoesEspecificos.length > 0 && (
                                        <>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginTop: '4px' }}>Botões Específicos:</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                                                {grupo.botoesEspecificos.map((btn, bIdx) => {
                                                    const isBtnChecked = permissoesAtivas.has(btn.chave);
                                                    return (
                                                        <label key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#334151', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer', background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isBtnChecked} 
                                                                disabled={isDesenvolvedor} 
                                                                onChange={() => toggleCheckbox(btn.chave)} 
                                                                style={{ width: '13px', height: '13px', accentColor: '#005596', cursor: isDesenvolvedor ? 'not-allowed' : 'pointer' }} 
                                                            />
                                                            <span>⚙️ {btn.nome}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}