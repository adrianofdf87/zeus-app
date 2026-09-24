import { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet, Link } from "react-router-dom";
import { ChevronLeft, User, Home, ChevronDown, Users, Zap, Wallet, CalendarRange, TrendingUp, Database, Settings, Lock, Menu, LogOut, Camera, Trash2, Upload, Bell } from "lucide-react";
import bcrypt from "bcryptjs";
import Swal from "sweetalert2";
import { supabase } from "../../services/supabase";
import "./Dashboard.css"; 

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
  const [userData, setUserData] = useState({ nome: "Carregando...", id_sessao: "...", perfil: "", foto: null });
  
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  
  const fileInputRef = useRef(null), menuRef = useRef(null), navigate = useNavigate();

  useEffect(() => {
    if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock("landscape").catch((err) => {
        console.log("Orientação landscape travada ou restrita:", err);
      });
    }

    let tempoInat, intervaloVerificacao;
    const eventos = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    const resetTimer = () => {
      clearTimeout(tempoInat);
      tempoInat = setTimeout(() => encerrarSessao("Sessão encerrada por inatividade (30 min).", false), 1800000);
    };

    const verificarSeSessaoCaiu = async () => {
      try {
        const dadosL = localStorage.getItem("usuario_logado"), idL = localStorage.getItem("id_sessao");
        if (!dadosL || !idL) return;
        const userObj = JSON.parse(dadosL);

        const { data: usr, error } = await supabase.from("tabi_cad_usuarios").select("id_sessao, situacao").eq("id", userObj.id).single();
        if (error || !usr) return;
        
        if (usr.situacao?.toUpperCase() !== "ATIVO" || (usr.id_sessao && usr.id_sessao !== idL)) {
          clearInterval(intervaloVerificacao);
          encerrarSessao("Sessão inválida, inativada por outro acesso!", true);
        }
      } catch (e) {
        // Silencia erros de rede pontuais
      }
    };

    const validarSessao = async () => {
      try {
        const dadosL = localStorage.getItem("usuario_logado"), idL = localStorage.getItem("id_sessao");
        
        if (!dadosL || !idL) {
          navigate("/", { replace: true });
          return;
        }

        const userObj = JSON.parse(dadosL);

        const { data: usr, error } = await supabase.from("tabi_cad_usuarios").select("id_sessao, situacao, nome, \"Perfil\"").eq("id", userObj.id).single();
        if (error || !usr) throw new Error("Usuário não encontrado.");
        if (usr.situacao?.toUpperCase() !== "ATIVO") throw new Error("Conta inativa.");
        
        if (usr.id_sessao !== idL) throw new Error("Atenção|Sessão inválida, acesso inativado por outro acesso!");

        setUserData({ nome: usr.nome, id_sessao: usr.id_sessao, perfil: usr.Perfil || usr.perfil || "Usuário", foto: localStorage.getItem(`foto_perfil_${userObj.id}`) });

        // Validação ativa rodando via intervalo de segurança a cada 4 segundos
        intervaloVerificacao = setInterval(verificarSeSessaoCaiu, 4000);

      } catch (e) { 
        const errParts = e.message.split('|');
        if (errParts.length > 1) {
          encerrarSessao(errParts[1], true);
        } else {
          encerrarSessao(`Falha: ${e.message}`, false);
        }
      }
    };

    const clickFora = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuPerfilAberto(false);

    validarSessao();
    eventos.forEach(e => document.addEventListener(e, resetTimer));
    document.addEventListener("mousedown", clickFora);
    resetTimer();

    return () => {
      clearTimeout(tempoInat);
      clearInterval(intervaloVerificacao);
      eventos.forEach(e => document.removeEventListener(e, resetTimer));
      document.removeEventListener("mousedown", clickFora);
    };
  }, [navigate]);

  const deslogar = async (perguntar = false, limparBanco = true) => {
    if (perguntar) {
      const r = await Swal.fire({ title: "Deseja sair?", icon: "question", showCancelButton: true, confirmButtonText: "Sair", confirmButtonColor: "#d93025" });
      if (!r.isConfirmed) return;
    }
    const userL = JSON.parse(localStorage.getItem("usuario_logado") || "null");
    
    if (userL && limparBanco) {
      await supabase.from("tabi_cad_usuarios").update({ id_sessao: null, data_sessao: null }).eq("id", userL.id);
    }
    
    localStorage.clear();
    navigate("/");
  };

  const encerrarSessao = async (msg, porOutroAcesso = false) => { 
    if (Swal.isVisible()) return;

    await Swal.fire({ 
      icon: "warning", 
      title: "Atenção", 
      text: msg, 
      confirmButtonColor: "#005596",
      allowOutsideClick: false,
      allowEscapeKey: false
    }); 
    
    deslogar(false, !porOutroAcesso); 
  };

  const atualizarFoto = (novaFoto, msg) => {
    const usr = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
    setMenuPerfilAberto(false);
    const ldr = document.getElementById("global-loader");
    if (ldr) ldr.classList.add("active");
    
    setTimeout(() => {
      if (usr.id) {
        novaFoto ? localStorage.setItem(`foto_perfil_${usr.id}`, novaFoto) : localStorage.removeItem(`foto_perfil_${usr.id}`);
        setUserData(p => ({ ...p, foto: novaFoto }));
        Swal.fire({ icon: "success", title: msg, timer: 1200, showConfirmButton: false });
      }
      if (ldr) ldr.classList.remove("active");
    }, 300);
  };

  const handleTrocarFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2e6) return Swal.fire("Erro", "Escolha uma imagem de até 2MB.", "error");
    const reader = new FileReader();
    reader.onloadend = () => atualizarFoto(reader.result, "Foto atualizada!");
    reader.readAsDataURL(file);
  };

  const abrirModalAlterarSenha = async () => {
    const usrL = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
    const { data } = await supabase.from("tabi_cad_usuarios").select("senha").eq("id", usrL.id).single();
    if (!data) return;

    const icLk = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    const icUnlk = icLk.replace('#94a3b8', '#005596').replace('10 0v4', '9.9-1');
    const inputHtml = (id, ph) => `<div style="position:relative;margin-bottom:10px;"><input type="password" id="${id}" class="swal2-input" placeholder="${ph}" style="width:100%;margin:0;padding-right:40px;box-sizing:border-box;"><button type="button" id="btn-${id}" style="position:absolute;right:5px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;">${icLk}</button></div>`;

    const { value: form } = await Swal.fire({
      title: "Alterar Senha",
      html: `<div style="text-align:left;font-size:14px;color:#555;margin-bottom:20px;">Por segurança, digite sua senha atual e escolha uma nova.<br><br><strong style="color:#005596;">Requisitos mínimos:</strong><br>• Mín. 8 chars<br>• Letras (Maiús. e Minús.)<br>• 1 Número<br>• 1 Char especial (&#@$)</div>` + 
            inputHtml('s-atual', 'Senha Atual') + inputHtml('s-nova', 'Nova Senha') + inputHtml('s-conf', 'Confirme a Nova Senha'),
      focusConfirm: false, showCancelButton: true, confirmButtonText: "Salvar",
      didOpen: () => ['s-atual', 's-nova', 's-conf'].forEach(id => {
        const i = document.getElementById(id), b = document.getElementById(`btn-${id}`);
        b.onclick = () => { i.type = i.type === 'password' ? 'text' : 'password'; b.innerHTML = i.type === 'password' ? icLk : icUnlk; };
      }),
      preConfirm: () => {
        const [a, n, c] = ['s-atual', 's-nova', 's-conf'].map(id => document.getElementById(id).value);
        if (!a || !n || !c) return Swal.showValidationMessage("Preencha tudo.");
        if (!bcrypt.compareSync(a, data.senha)) return Swal.showValidationMessage("Senha atual incorreta.");
        if (n !== c) return Swal.showValidationMessage("Senhas não coincidem.");
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&#@$])[A-Za-z\d&#@$]{8,}$/.test(n)) return Swal.showValidationMessage("Requisitos inválidos.");
        if (bcrypt.compareSync(n, data.senha)) return Swal.showValidationMessage("Senha igual à atual.");
        return n;
      }
    });

    if (form) {
      await supabase.from("tabi_cad_usuarios").update({ senha: bcrypt.hashSync(form, 10) }).eq("id", usrL.id);
      Swal.fire("Sucesso!", "Senha atualizada.", "success");
    }
  };

  const getSaudacao = () => { const h = new Date().getHours(); return h >= 5 && h < 12 ? "Bom dia," : h < 18 ? "Boa tarde," : "Boa noite,"; };

  const itemMenuClass = {
    justifyContent: sidebarOpen ? 'flex-start' : 'center',
    padding: sidebarOpen ? '10px 12px' : '10px 0'
  };

  return (
    <div className="dashboard">
      <aside className="sidebar" id="sidebar" style={{ width: sidebarOpen ? '250px' : '50px', transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        
        <div className="sidebar-header" style={{ padding: sidebarOpen ? '0 14px' : '0', justifyContent: sidebarOpen ? 'flex-start' : 'center', display: 'flex', alignItems: 'center' }}>
          
          {!sidebarOpen ? (
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '60px' }}>
              <Menu size={22} />
            </button>
          ) : (
            <>
              <button className="close-btn" onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none' }}>
                <ChevronLeft />
              </button>
              
              <div className="user-avatar-wrapper" ref={menuRef} style={{ margin: '0' }}>
                <div 
                  className="user-avatar-container" 
                  onClick={() => {
                    if (userData.foto) setMenuPerfilAberto(p => !p);
                    else fileInputRef.current.click();
                  }} 
                  title="Gerenciar foto"
                >
                  {userData.foto ? <img src={userData.foto} alt="Perfil" className="user-avatar-img" /> : <div className="user-avatar"><User /></div>}
                  <div className="avatar-overlay"><Camera size={12} color="#fff" /></div>
                </div>
                
                {menuPerfilAberto && (
                  <div className="avatar-dropdown-menu">
                    <button onClick={() => { setMenuPerfilAberto(false); fileInputRef.current.click(); }}><Upload size={13} /> Nova Foto</button>
                    <button onClick={() => atualizarFoto(null, "Foto removida!")} className="danger-option"><Trash2 size={13} /> Remover Foto</button>
                  </div>
                )}
              </div>
              
              <div className="user-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: '#fff', fontWeight: '500', textTransform: 'none', lineHeight: '1.1' }}>
                  {getSaudacao()}
                </span>
                <span style={{ fontSize: '11px', color: '#fff', fontWeight: '500', textTransform: 'none', lineHeight: '1.1' }}>
                  {userData.nome}
                </span>
              </div>
            </>
          )}
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleTrocarFoto} accept="image/*" style={{ display: 'none' }} />

        <div className="menu">
          <Link to="/dashboard" style={itemMenuClass} title={!sidebarOpen ? "Início" : ""} onClick={() => setSidebarOpen(false)}>
            <Home />
            {sidebarOpen && <span>Início</span>}
          </Link>
          
          <div className={`menu-item ${openMenu === "operacao" && sidebarOpen ? "open" : ""}`}>
            <div className="menu-link" style={itemMenuClass} title={!sidebarOpen ? "Operação" : ""} onClick={() => { 
                setSidebarOpen(true); 
                setOpenMenu(p => p === "operacao" ? "" : "operacao"); 
            }}>
              <Zap />
              {sidebarOpen && <span>Operação</span>}
              {sidebarOpen && <ChevronDown className="arrow" />}
            </div>
            
            {sidebarOpen && (
              <div className="submenu">
                <Link to="/dashboard/carteira" onClick={() => setSidebarOpen(false)}><Wallet /><span>Carteira</span></Link>
                <Link to="/dashboard/programacao" onClick={() => setSidebarOpen(false)}><CalendarRange /><span>Programação</span></Link>
                <Link to="/dashboard/producao" onClick={() => setSidebarOpen(false)}><TrendingUp /><span>Produção</span></Link>
              </div>
            )}
          </div>
          
          <Link to="/dashboard/tabelas-internas" style={itemMenuClass} title={!sidebarOpen ? "Database" : ""} onClick={() => setSidebarOpen(false)}>
            <Database />
            {sidebarOpen && <span>Database</span>}
          </Link>
          
          <div className={`menu-item ${openMenu === "config" && sidebarOpen ? "open" : ""}`}>
            <div className="menu-link" style={itemMenuClass} title={!sidebarOpen ? "Configurações" : ""} onClick={() => { 
                setSidebarOpen(true); 
                setOpenMenu(p => p === "config" ? "" : "config"); 
            }}>
              <Settings />
              {sidebarOpen && <span>Configurações</span>}
              {sidebarOpen && <ChevronDown className="arrow" />}
            </div>
            
            {sidebarOpen && (
              <div className="submenu">
                <Link to="/dashboard/usuarios" onClick={() => setSidebarOpen(false)}><Users /><span>Usuários</span></Link>
                <a href="#" onClick={(e) => { e.preventDefault(); setSidebarOpen(false); abrirModalAlterarSenha(); }}><Lock /><span>Alterar Senha</span></a>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: '50px', display: 'flex', alignItems: 'center', padding: sidebarOpen ? '0 8px' : '0', justifyContent: 'center', background: 'transparent' }}>
          <button 
            title={!sidebarOpen ? "Sair" : ""}
            onClick={() => deslogar(true, true)} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: '12px', width: '100%', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '13px', fontWeight: '500', cursor: 'pointer', padding: sidebarOpen ? '10px 12px' : '10px 0', borderRadius: '8px', transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="content">
        <div className="topbar">
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', padding: '6px', borderRadius: '8px', display: 'flex', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)' }}><Zap size={16} color="white" fill="white" /></div>
              <span className="logo-top" style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ background: 'linear-gradient(to right, #0f172a, #0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900', letterSpacing: '-0.5px', fontSize: '20px' }}>ZEUS</span>
                <span style={{ color: '#64748b', fontWeight: '500', fontSize: '14px', marginLeft: '8px', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px' }}>Gestão Integrada de Obras Elétricas</span>
              </span>
            </div>
          </div>
          
          <button 
            title="Notificações"
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px', borderRadius: '50%', transition: 'all 0.2s ease', position: 'relative' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <Bell size={20} />
            
            {notificacoesNaoLidas === 0 ? (
              <span style={{ 
                position: 'absolute', top: '7px', right: '7px', 
                width: '10px', height: '10px', 
                background: '#10b981',
                borderRadius: '50%', 
                border: '2px solid #fff' 
              }}></span>
            ) : (
              <span style={{ 
                position: 'absolute', top: '1px', right: '1px', 
                background: '#ef4444',
                color: '#ffffff', fontSize: '9px', fontWeight: 'bold', 
                minWidth: '16px', height: '16px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                borderRadius: '20px', padding: '0 4px', 
                border: '2px solid #ffffff'
              }}>
                {notificacoesNaoLidas > 99 ? '99+' : notificacoesNaoLidas}
              </span>
            )}
          </button>
        </div>

        <div className="main"><div className="page-container"><div className="page-content" id="mainContent"><Outlet /></div></div></div>
        
        <div className="footer" style={{ height: '50px' }}>
          <span>© 2026 ZEUS System - Todos os direitos reservados.</span>
          <span>Sessão ativa</span>
        </div>
      </div>
    </div>
  );
}