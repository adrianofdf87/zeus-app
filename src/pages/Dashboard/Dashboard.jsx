// src/pages/Dashboard/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet, Link } from "react-router-dom";
import { ChevronLeft, User, Home, ChevronDown, Users, Zap, Wallet, CalendarRange, TrendingUp, Database, Settings, Lock, Menu, LogOut, Camera, Trash2, Upload, Bell, Server, Globe, FileText } from "lucide-react";
import bcrypt from "bcryptjs";
import Swal from "sweetalert2";
import { supabase } from "../../services/supabase";
import { registrarAutoMapa } from "../../services/autoMapper";
import "./Dashboard.css";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const [openSubMenu, setOpenSubMenu] = useState(""); // Controla a 2ª camada (Dados Externos / Internos)
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
  const [userData, setUserData] = useState({ nome: "Carregando...", id_sessao: "...", perfil: "", foto: null });
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock("landscape").catch((err) => { console.log("Orientação landscape travada ou restrita:", err); });
    }
    let tempoInat;
    let intervaloVerificacao;
    const eventos = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"];
    const resetTimer = () => {
      clearTimeout(tempoInat);
      tempoInat = setTimeout(() => encerrarSessao("Sessão encerrada por inatividade (30 min).", false), 1800000);
    };
    const verificarSeSessaoCaiu = async () => {
      try {
        const dadosL = localStorage.getItem("usuario_logado");
        const idL = localStorage.getItem("id_sessao");
        if (!dadosL || !idL) return;
        const userObj = JSON.parse(dadosL);
        const { data: usr, error } = await supabase.from("tabi_cad_usuarios").select("id_sessao, situacao").eq("id", userObj.id).single();
        if (error || !usr) return;
        if (String(usr.situacao || "").toUpperCase() !== "ATIVO" || !usr.id_sessao || usr.id_sessao !== idL) {
          clearInterval(intervaloVerificacao);
          encerrarSessao("Sessão inválida ou substituída por outro acesso!", true);
        }
      } catch (e) {}
    };
    const validarSessao = async () => {
      try {
        const dadosL = localStorage.getItem("usuario_logado");
        const idL = localStorage.getItem("id_sessao");
        if (!dadosL || !idL) { navigate("/", { replace: true }); return; }
        const userObj = JSON.parse(dadosL);
        const { data: usr, error } = await supabase.from("tabi_cad_usuarios").select('id_sessao, situacao, nome, "Perfil"').eq("id", userObj.id).single();
        if (error || !usr) throw new Error("Usuário não encontrado.");
        if (String(usr.situacao || "").toUpperCase() !== "ATIVO") throw new Error("Conta inativa.");
        if (!usr.id_sessao || usr.id_sessao !== idL) throw new Error("Atenção|Sessão inválida, acesso inativado por outro acesso!");
        const perfil = usr.Perfil || usr.perfil || "Usuário";
        setUserData({ nome: usr.nome, id_sessao: usr.id_sessao, perfil, foto: localStorage.getItem(`foto_perfil_${userObj.id}`) });
        
        const ehDesenvolvedor = String(perfil).trim().toLowerCase() === "desenvolvedor";
        if (ehDesenvolvedor) {
          registrarAutoMapa(true, "Sistema", "Dashboard", [
            { nome: "Início", chave: "dashboard.inicio", tipo: "link", rota: "/dashboard", ordem: 1 },
            { nome: "Operação", chave: "dashboard.menu.operacao", tipo: "menu", rota: "/dashboard", ordem: 2 },
            { nome: "Carteira", chave: "dashboard.menu.operacao.carteira", tipo: "submenu", rota: "/dashboard/carteira", chave_pai: "dashboard.menu.operacao", ordem: 3 },
            { nome: "Programação", chave: "dashboard.menu.operacao.programacao", tipo: "submenu", rota: "/dashboard/programacao", chave_pai: "dashboard.menu.operacao", ordem: 4 },
            { nome: "Produção", chave: "dashboard.menu.operacao.producao", tipo: "submenu", rota: "/dashboard/producao", chave_pai: "dashboard.menu.operacao", ordem: 5 },
            { nome: "Database", chave: "dashboard.menu.database", tipo: "menu", rota: "/dashboard", ordem: 6 },
            { nome: "Dados Externos", chave: "dashboard.menu.database.externos", tipo: "submenu", rota: "/dashboard", chave_pai: "dashboard.menu.database", ordem: 7 },
            { nome: "SAP - CN43N", chave: "dashboard.menu.database.externos.cn43n", tipo: "sub-submenu", rota: "/dashboard/sap-cn43n", chave_pai: "dashboard.menu.database.externos", ordem: 8 },
            { nome: "SAP - CJI3", chave: "dashboard.menu.database.externos.cji3", tipo: "sub-submenu", rota: "/dashboard/sap-cji3", chave_pai: "dashboard.menu.database.externos", ordem: 9 },
            { nome: "Dados Internos", chave: "dashboard.menu.database.internos", tipo: "submenu", rota: "/dashboard", chave_pai: "dashboard.menu.database", ordem: 10 },
            { nome: "Alimentadores", chave: "dashboard.menu.database.internos.alimentadores", tipo: "sub-submenu", rota: "/dashboard/alimentadores", chave_pai: "dashboard.menu.database.internos", ordem: 11 },
            { nome: "Contratos", chave: "dashboard.menu.database.internos.contratos", tipo: "sub-submenu", rota: "/dashboard/contratos", chave_pai: "dashboard.menu.database.internos", ordem: 12 },
            { nome: "Configurações", chave: "dashboard.menu.config", tipo: "menu", rota: "/dashboard", ordem: 13 },
            { nome: "Usuários", chave: "dashboard.menu.config.usuarios", tipo: "submenu", rota: "/dashboard/usuarios", chave_pai: "dashboard.menu.config", ordem: 14 },
            { nome: "Alterar Senha", chave: "dashboard.menu.config.senha", tipo: "submenu", rota: "/dashboard", chave_pai: "dashboard.menu.config", ordem: 15 },
            { nome: "Sair", chave: "dashboard.sair", tipo: "botao", rota: "/", ordem: 16 }
          ]).catch((err) => console.warn("AutoMapper Dashboard:", err));
        }
        intervaloVerificacao = setInterval(verificarSeSessaoCaiu, 4000);
      } catch (e) {
        const errParts = String(e?.message || "").split("|");
        if (errParts.length > 1) encerrarSessao(errParts[1], true);
        else encerrarSessao(`Falha: ${e?.message || "Erro desconhecido"}`, false);
      }
    };
    const clickFora = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuPerfilAberto(false); };
    validarSessao();
    eventos.forEach((evento) => document.addEventListener(evento, resetTimer));
    document.addEventListener("mousedown", clickFora);
    resetTimer();
    return () => {
      clearTimeout(tempoInat);
      clearInterval(intervaloVerificacao);
      eventos.forEach((evento) => document.removeEventListener(evento, resetTimer));
      document.removeEventListener("mousedown", clickFora);
    };
  }, [navigate]);

  const deslogar = async (perguntar = false, limparBanco = true) => {
    if (perguntar) {
      const r = await Swal.fire({ title: "Deseja sair?", icon: "question", showCancelButton: true, confirmButtonText: "Sair", cancelButtonText: "Cancelar", confirmButtonColor: "#d93025" });
      if (!r.isConfirmed) return;
    }
    try {
      const userL = JSON.parse(localStorage.getItem("usuario_logado") || "null");
      if (userL && limparBanco) {
        await supabase.from("tabi_cad_usuarios").update({ id_sessao: null, data_sessao: null }).eq("id", userL.id);
      }
    } catch (e) { console.warn("Erro ao finalizar sessão:", e); }
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const encerrarSessao = async (msg, porOutroAcesso = false) => {
    if (Swal.isVisible()) return;
    await Swal.fire({ icon: "warning", title: "Atenção", text: msg, confirmButtonColor: "#005596", allowOutsideClick: false, allowEscapeKey: false });
    deslogar(false, !porOutroAcesso);
  };

  const atualizarFoto = (novaFoto, msg) => {
    const usr = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
    setMenuPerfilAberto(false);
    const ldr = document.getElementById("global-loader");
    if (ldr) ldr.classList.add("active");
    setTimeout(() => {
      if (usr.id) {
        if (novaFoto) localStorage.setItem(`foto_perfil_${usr.id}`, novaFoto);
        else localStorage.removeItem(`foto_perfil_${usr.id}`);
        setUserData((p) => ({ ...p, foto: novaFoto }));
        Swal.fire({ icon: "success", title: msg, timer: 1200, showConfirmButton: false });
      }
      if (ldr) ldr.classList.remove("active");
    }, 300);
  };

  const handleTrocarFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2e6) { Swal.fire("Erro", "Escolha uma imagem de até 2MB.", "error"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onloadend = () => atualizarFoto(reader.result, "Foto atualizada!");
    reader.readAsDataURL(file);
  };

  const abrirModalAlterarSenha = async () => {
    const usrL = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
    const { data } = await supabase.from("tabi_cad_usuarios").select("senha").eq("id", usrL.id).single();
    if (!data) return;
    const icLk = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    const icUnlk = icLk.replace("#94a3b8", "#005596").replace("10 0v4", "9.9-1");
    const inputHtml = (id, ph) => `<div style="position:relative;margin-bottom:10px;"><input type="password" id="${id}" class="swal2-input" placeholder="${ph}" style="width:100%;margin:0;padding-right:40px;box-sizing:border-box;"><button type="button" id="btn-${id}" style="position:absolute;right:5px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;">${icLk}</button></div>`;
    
    const { value: form } = await Swal.fire({
      title: "Alterar Senha",
      html: `<div style="text-align:left;font-size:14px;color:#555;margin-bottom:20px;">Por segurança, digite sua senha atual e escolha uma nova.<br><br><strong style="color:#005596;">Requisitos mínimos:</strong><br>• Mín. 8 chars<br>• Letras (Maiús. e Minús.)<br>• 1 Número<br>• 1 Char especial (&amp;#@$)</div>${inputHtml("s-atual", "Senha Atual")}${inputHtml("s-nova", "Nova Senha")}${inputHtml("s-conf", "Confirme a Nova Senha")}`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Salvar",
      cancelButtonText: "Cancelar",
      didOpen: () => {
        ["s-atual", "s-nova", "s-conf"].forEach((id) => {
          const input = document.getElementById(id);
          const button = document.getElementById(`btn-${id}`);
          if (!input || !button) return;
          button.onclick = () => {
            input.type = input.type === "password" ? "text" : "password";
            button.innerHTML = input.type === "password" ? icLk : icUnlk;
          };
        });
      },
      preConfirm: () => {
        const [atual, nova, confirmacao] = ["s-atual", "s-nova", "s-conf"].map((id) => document.getElementById(id)?.value || "");
        if (!atual || !nova || !confirmacao) { Swal.showValidationMessage("Preencha tudo."); return false; }
        if (!bcrypt.compareSync(atual, data.senha)) { Swal.showValidationMessage("Senha atual incorreta."); return false; }
        if (nova !== confirmacao) { Swal.showValidationMessage("Senhas não coincidem."); return false; }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&#@$])[A-Za-z\d&#@$]{8,}$/.test(nova)) { Swal.showValidationMessage("A nova senha deve possuir no mínimo 8 caracteres, letras maiúsculas e minúsculas, número e caractere especial."); return false; }
        if (bcrypt.compareSync(nova, data.senha)) { Swal.showValidationMessage("Senha igual à atual."); return false; }
        return nova;
      },
    });

    if (form) {
      const { error } = await supabase.from("tabi_cad_usuarios").update({ senha: bcrypt.hashSync(form, 10) }).eq("id", usrL.id);
      if (error) { Swal.fire("Erro", error.message, "error"); return; }
      Swal.fire("Sucesso!", "Senha atualizada.", "success");
    }
  };

  const getSaudacao = () => {
    const h = new Date().getHours();
    return h >= 5 && h < 12 ? "Bom dia," : h < 18 ? "Boa tarde," : "Boa noite,";
  };

  const itemMenuClass = { justifyContent: sidebarOpen ? "flex-start" : "center", padding: sidebarOpen ? "10px 12px" : "10px 0" };

  return (
    <div className="dashboard" data-auto-grupo="Sistema" data-auto-tela="Dashboard">
      <aside className="sidebar" id="sidebar" style={{ width: sidebarOpen ? "250px" : "50px", transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div className="sidebar-header" style={{ padding: sidebarOpen ? "0 14px" : "0", justifyContent: sidebarOpen ? "flex-start" : "center", display: "flex", alignItems: "center" }}>
          {!sidebarOpen ? (
            <button type="button" onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "60px" }} aria-label="Abrir menu">
              <Menu size={22} />
            </button>
          ) : (
            <>
              <button type="button" className="close-btn" onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none" }} aria-label="Fechar menu">
                <ChevronLeft />
              </button>
              <div className="user-avatar-wrapper" ref={menuRef} style={{ margin: "0" }}>
                <div className="user-avatar-container" onClick={() => { if (userData.foto) { setMenuPerfilAberto((p) => !p); } else { fileInputRef.current?.click(); } }} title="Gerenciar foto">
                  {userData.foto ? <img src={userData.foto} alt="Perfil" className="user-avatar-img" /> : <div className="user-avatar"><User /></div>}
                  <div className="avatar-overlay"><Camera size={12} color="#fff" /></div>
                </div>
                {menuPerfilAberto && (
                  <div className="avatar-dropdown-menu">
                    <button type="button" onClick={() => { setMenuPerfilAberto(false); fileInputRef.current?.click(); }}><Upload size={13} /> Nova Foto</button>
                    <button type="button" onClick={() => atualizarFoto(null, "Foto removida!")} className="danger-option"><Trash2 size={13} /> Remover Foto</button>
                  </div>
                )}
              </div>
              <div className="user-info" style={{ display: "flex", flexDirection: "column", gap: "2px", justifyContent: "center" }}>
                <span style={{ fontSize: "11px", color: "#fff", fontWeight: "500", textTransform: "none", lineHeight: "1.1" }}>{getSaudacao()}</span>
                <span style={{ fontSize: "11px", color: "#fff", fontWeight: "500", textTransform: "none", lineHeight: "1.1" }}>{userData.nome}</span>
              </div>
            </>
          )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleTrocarFoto} accept="image/*" style={{ display: "none" }} />
        <div className="menu">
          <Link to="/dashboard" data-auto-mapa="dashboard.inicio" data-permissao="dashboard.inicio" style={itemMenuClass} title={!sidebarOpen ? "Início" : ""} onClick={() => setSidebarOpen(false)}>
            <Home />
            {sidebarOpen && <span>Início</span>}
          </Link>

          <div className={`menu-item ${openMenu === "operacao" && sidebarOpen ? "open" : ""}`}>
            <div className="menu-link" data-auto-menu data-auto-mapa="dashboard.menu.operacao" data-permissao="dashboard.menu.operacao" style={itemMenuClass} title={!sidebarOpen ? "Operação" : ""} onClick={() => { setSidebarOpen(true); setOpenMenu((p) => p === "operacao" ? "" : "operacao"); }}>
              <Zap />
              {sidebarOpen && <span>Operação</span>}
              {sidebarOpen && <ChevronDown className="arrow" />}
            </div>
            {sidebarOpen && (
              <div className="submenu">
                <Link to="/dashboard/carteira" data-auto-submenu data-auto-mapa="dashboard.menu.operacao.carteira" data-permissao="dashboard.menu.operacao.carteira" onClick={() => setSidebarOpen(false)}><Wallet /><span>Carteira</span></Link>
                <Link to="/dashboard/programacao" data-auto-submenu data-auto-mapa="dashboard.menu.operacao.programacao" data-permissao="dashboard.menu.operacao.programacao" onClick={() => setSidebarOpen(false)}><CalendarRange /><span>Programação</span></Link>
                <Link to="/dashboard/producao" data-auto-submenu data-auto-mapa="dashboard.menu.operacao.producao" data-permissao="dashboard.menu.operacao.producao" onClick={() => setSidebarOpen(false)}><TrendingUp /><span>Produção</span></Link>
              </div>
            )}
          </div>

          {/* DATABASE COM 3ª CAMADA USANDO FILETEXT PARA TODOS OS SUBITENS */}
          <div className={`menu-item ${openMenu === "database" && sidebarOpen ? "open" : ""}`}>
            <div className="menu-link" data-auto-menu data-auto-mapa="dashboard.menu.database" data-permissao="dashboard.menu.database" style={itemMenuClass} title={!sidebarOpen ? "Database" : ""} onClick={() => { setSidebarOpen(true); setOpenMenu((p) => p === "database" ? "" : "database"); }}>
              <Database />
              {sidebarOpen && <span>Database</span>}
              {sidebarOpen && <ChevronDown className="arrow" />}
            </div>
            {sidebarOpen && openMenu === "database" && (
              <div className="submenu" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                
                {/* Dados Externos */}
                <div>
                  <div 
                    onClick={() => setOpenSubMenu((p) => p === "externos" ? "" : "externos")} 
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", cursor: "pointer", color: "#cbd5e1", borderRadius: "6px" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                      <Globe size={15} /><span>Dados Externos</span>
                    </span>
                    <ChevronDown size={14} style={{ transform: openSubMenu === "externos" ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                  </div>
                  {openSubMenu === "externos" && (
                    <div style={{ display: "flex", flexDirection: "column", paddingLeft: "15px", marginTop: "2px", gap: "2px" }}>
                      <Link to="/dashboard/sap-cn43n" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.cn43n" data-permissao="dashboard.menu.database.externos.cn43n" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>SAP - CN43N</span>
                      </Link>
                      <Link to="/dashboard/sap-cji3" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.cji3" data-permissao="dashboard.menu.database.externos.cji3" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>SAP - CJI3</span>
                      </Link>
                      <Link to="/dashboard/sap-cn52n" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.cn52n" data-permissao="dashboard.menu.database.externos.cn52n" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>SAP - CN52N</span>
                      </Link>
                      <Link to="/dashboard/sap-mb52" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.mb52" data-permissao="dashboard.menu.database.externos.mb52" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>SAP - MB52</span>
                      </Link>
                      <Link to="/dashboard/sap-me33k" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.me33k" data-permissao="dashboard.menu.database.externos.me33k" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>SAP - ME33K</span>
                      </Link>
                      <Link to="/dashboard/proj-ltg" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.ltg" data-permissao="dashboard.menu.database.externos.ltg" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>PROJ - LISTA GERAL</span>
                      </Link>
                      <Link to="/dashboard/proj-lto" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.lto" data-permissao="dashboard.menu.database.externos.lto" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>PROJ - LISTA OBRA</span>
                      </Link>
                      <Link to="/dashboard/proj-medicao" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.medicao" data-permissao="dashboard.menu.database.externos.medicao" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>PROJ - MEDIÇÃO</span>
                      </Link>
                      <Link to="/dashboard/proj-localizacao" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.localizacao" data-permissao="dashboard.menu.database.externos.localizacao" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>PROJ - LOCALIZAÇÃO</span>
                      </Link>
                      <Link to="/dashboard/jupiter-equipes" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.equipes" data-permissao="dashboard.menu.database.externos.equipes" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>JUPITER - EQUIPES</span>
                      </Link>
                      <Link to="/dashboard/jupiter-producao" data-auto-submenu data-auto-mapa="dashboard.menu.database.externos.producao" data-permissao="dashboard.menu.database.externos.producao" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>JUPITER - PRODUÇÃO</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Dados Internos */}
                <div>
                  <div 
                    onClick={() => setOpenSubMenu((p) => p === "internos" ? "" : "internos")} 
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", cursor: "pointer", color: "#cbd5e1", borderRadius: "6px" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                      <Server size={15} /><span>Dados Internos</span>
                    </span>
                    <ChevronDown size={14} style={{ transform: openSubMenu === "internos" ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                  </div>
                  {openSubMenu === "internos" && (
                    <div style={{ display: "flex", flexDirection: "column", paddingLeft: "15px", marginTop: "2px", gap: "2px" }}>
                      <Link to="/dashboard/alimentadores" data-auto-submenu data-auto-mapa="dashboard.menu.database.internos.alimentadores" data-permissao="dashboard.menu.database.internos.alimentadores" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>Alimentadores</span>
                      </Link>
                      <Link to="/dashboard/contratos" data-auto-submenu data-auto-mapa="dashboard.menu.database.internos.contratos" data-permissao="dashboard.menu.database.internos.contratos" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>Contratos</span>
                      </Link>
                      <Link to="/dashboard/etapas" data-auto-submenu data-auto-mapa="dashboard.menu.database.internos.etapas" data-permissao="dashboard.menu.database.internos.etapas" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>Etapas Obras</span>
                      </Link>
                      <Link to="/dashboard/responsaveis" data-auto-submenu data-auto-mapa="dashboard.menu.database.internos.responsaveis" data-permissao="dashboard.menu.database.internos.responsaveis" onClick={() => setSidebarOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                        <FileText size={13} /><span>Responsaveis</span>
                      </Link>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          <div className={`menu-item ${openMenu === "config" && sidebarOpen ? "open" : ""}`}>
            <div className="menu-link" data-auto-menu data-auto-mapa="dashboard.menu.config" data-permissao="dashboard.menu.config" style={itemMenuClass} title={!sidebarOpen ? "Configurações" : ""} onClick={() => { setSidebarOpen(true); setOpenMenu((p) => p === "config" ? "" : "config"); }}>
              <Settings />
              {sidebarOpen && <span>Configurações</span>}
              {sidebarOpen && <ChevronDown className="arrow" />}
            </div>
            {sidebarOpen && (
              <div className="submenu">
                <Link to="/dashboard/usuarios" data-auto-submenu data-auto-mapa="dashboard.menu.config.usuarios" data-permissao="dashboard.menu.config.usuarios" onClick={() => setSidebarOpen(false)}><Users /><span>Usuários</span></Link>
                <a href="#" data-auto-submenu data-auto-mapa="dashboard.menu.config.senha" data-permissao="dashboard.menu.config.senha" onClick={(e) => { e.preventDefault(); setSidebarOpen(false); abrirModalAlterarSenha(); }}><Lock /><span>Alterar Senha</span></a>
              </div>
            )}
          </div>
        </div>
        <div style={{ height: "50px", display: "flex", alignItems: "center", padding: sidebarOpen ? "0 8px" : "0", justifyContent: "center", background: "transparent" }}>
          <button type="button" data-auto-mapa="dashboard.sair" data-permissao="dashboard.sair" title={!sidebarOpen ? "Sair" : ""} onClick={() => deslogar(true, true)} style={{ display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "flex-start" : "center", gap: "12px", width: "100%", background: "transparent", border: "none", color: "#ef4444", fontSize: "13px", fontWeight: "500", cursor: "pointer", padding: sidebarOpen ? "10px 12px" : "10px 0", borderRadius: "8px", transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <LogOut size={18} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>
      <div className="content">
        <div className="topbar">
          <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)", padding: "6px", borderRadius: "8px", display: "flex", boxShadow: "0 4px 10px rgba(2, 132, 199, 0.3)" }}>
                <Zap size={16} color="white" fill="white" />
              </div>
              <span className="logo-top" style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ background: "linear-gradient(to right, #0f172a, #0284c7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "900", letterSpacing: "-0.5px", fontSize: "20px" }}>ZEUS</span>
                <span style={{ color: "#64748b", fontWeight: "500", fontSize: "14px", marginLeft: "8px", borderLeft: "1px solid #cbd5e1", paddingLeft: "8px" }}>Gestão Integrada de Obras Elétricas</span>
              </span>
            </div>
          </div>
          <button type="button" title="Notificações" style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", height: "36px", width: "36px", borderRadius: "50%", transition: "all 0.2s ease", position: "relative" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}>
            <Bell size={20} />
            {notificacoesNaoLidas === 0 ? (
              <span style={{ position: "absolute", top: "7px", right: "7px", width: "10px", height: "10px", background: "#10b981", borderRadius: "50%", border: "2px solid #fff" }} />
            ) : (
              <span style={{ position: "absolute", top: "1px", right: "1px", background: "#ef4444", color: "#ffffff", fontSize: "9px", fontWeight: "bold", minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "20px", padding: "0 4px", border: "2px solid #ffffff" }}>
                {notificacoesNaoLidas > 99 ? "99+" : notificacoesNaoLidas}
              </span>
            )}
          </button>
        </div>
        <div className="main">
          <div className="page-container">
            <div className="page-content" id="mainContent">
              <Outlet />
            </div>
          </div>
        </div>
        <div className="footer" style={{ height: "50px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", fontSize: "12px", color: "#64748b" }}>
          <span>© 2026 ZEUS System - Todos os direitos reservados.</span>
          <span title={`ID da Sessão: ${userData.id_sessao}`}>
            Sessão: {userData.id_sessao ? (userData.id_sessao.length > 12 ? `${userData.id_sessao.substring(0, 12)}...` : userData.id_sessao) : "Ativa"}
          </span>
        </div>
      </div>
    </div>
  );
}