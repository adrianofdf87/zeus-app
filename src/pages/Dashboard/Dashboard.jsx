import { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet, Link } from "react-router-dom";
import { 
  ChevronLeft, User, Home, Sliders, ChevronDown, Users, 
  Truck, Zap, Wallet, CalendarRange, TrendingUp, Database, 
  FileText, Settings, Lock, Menu, LogOut, Camera, Trash2, Upload 
} from "lucide-react";
import bcrypt from "bcryptjs";
import Swal from "sweetalert2";
import { supabase } from "../../services/supabase";
import "./Dashboard.css"; 

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenu, setOpenMenu] = useState("");
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
  const [userData, setUserData] = useState({ 
    nome: "Carregando...", 
    id_sessao: "...", 
    perfil: "", 
    foto: null 
  });
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // =========================
  // VALIDAÇÃO E INATIVIDADE
  // =========================
  useEffect(() => {
    let tempoInatividade;
    let canalSessao; 
    
    const resetarTemporizador = () => {
      clearTimeout(tempoInatividade);
      tempoInatividade = setTimeout(() => {
        encerrarSessao("Sua sessão foi encerrada por inatividade de 15 minutos.");
      }, 900000); // 15 minutos
    };

    const validarSessao = async () => {
      try {
        const dadosLocal = localStorage.getItem("usuario_logado");
        const idLocal = localStorage.getItem("id_sessao");

        if (!dadosLocal || !idLocal) throw new Error("Faltam dados de autenticação no navegador.");
        const usuarioObj = JSON.parse(dadosLocal);

        const { data: usuario, error } = await supabase
          .from("0-Interno_usuarios")
          .select("id_sessao, situacao, nome, \"Perfil\"")
          .eq("id", usuarioObj.id)
          .single();

        if (error) throw new Error(`Erro ao buscar usuário: ${error.message}`);
        if (!usuario) throw new Error("Usuário não encontrado no banco de dados.");
        if (usuario.situacao?.toUpperCase() !== "ATIVO") throw new Error(`Conta inativa.`);
        if (usuario.id_sessao !== idLocal) throw new Error("O ID da sessão no banco não atualizou.");

        const fotoSalva = localStorage.getItem(`foto_perfil_${usuarioObj.id}`) || null;

        setUserData({ 
          nome: usuario.nome, 
          id_sessao: usuario.id_sessao, 
          perfil: usuario.Perfil || usuario.perfil || "Usuário",
          foto: fotoSalva 
        });

        const nomeCanalUnico = `usuario-${usuarioObj.id}-${Date.now()}`;

        canalSessao = supabase.channel(nomeCanalUnico)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: '0-Interno_usuarios', filter: `id=eq.${usuarioObj.id}` }, (payload) => {
            if (payload.new.id_sessao !== idLocal) encerrarSessao("Sessão iniciada em outro dispositivo.");
          })
          .subscribe();

      } catch (e) {
        console.error("Falha na Sessão:", e);
        encerrarSessao(`Falha na segurança: ${e.message}`); 
      }
    };

    validarSessao();
    
    ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(e => document.addEventListener(e, resetarTemporizador));
    resetarTemporizador();

    // Fecha o menu flutuante ao clicar fora dele
    const handleClickFora = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuPerfilAberto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFora);

    return () => {
      clearTimeout(tempoInatividade);
      ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(e => document.removeEventListener(e, resetarTemporizador));
      document.removeEventListener("mousedown", handleClickFora);
      
      if (canalSessao) {
        supabase.removeChannel(canalSessao);
      }
    };
  }, [navigate]);

  const encerrarSessao = async (msg) => {
    await Swal.fire({ icon: "warning", title: "Sessão encerrada", text: msg, confirmButtonColor: "#005596" });
    deslogar();
  };

  const deslogar = async (perguntar = false) => {
    if (perguntar) {
      const r = await Swal.fire({ 
        title: "Deseja sair?", icon: "question", showCancelButton: true, 
        confirmButtonText: "Sair", cancelButtonText: "Cancelar", confirmButtonColor: "#d93025" 
      });
      if (!r.isConfirmed) return;
    }

    const dadosLocal = localStorage.getItem("usuario_logado");
    if (dadosLocal) {
      const { id } = JSON.parse(dadosLocal);
      await supabase.from("0-Interno_usuarios").update({ id_sessao: null, data_sessao: null }).eq("id", id);
    }
    
    localStorage.clear();
    navigate("/");
  };

  // =========================
  // GERENCIAR FOTO DE PERFIL (FLUIDO, SEM PISCAR E COM LOADER)
  // =========================
  const handleAvatarClick = () => {
    const temFoto = !!userData.foto;
    if (!temFoto) {
      // Se não tem foto, abre o explorador de arquivos na hora
      fileInputRef.current.click();
    } else {
      // Se tem foto, abre o menu suspenso nativo
      setMenuPerfilAberto(prev => !prev);
    }
  };

  const handleTrocarFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire("Arquivo muito grande", "Escolha uma imagem de até 2MB.", "error");
      return;
    }

    // Fecha o menu flutuante imediatamente
    setMenuPerfilAberto(false);

    // Ativa o loader global do sistema para dar feedback visual imediato
    const loader = document.getElementById("global-loader");
    if (loader) loader.classList.add("active");

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      const usuarioObj = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
      
      if (usuarioObj.id) {
        localStorage.setItem(`foto_perfil_${usuarioObj.id}`, base64String);
        
        // Pequeno delay simulando processamento fluído para o loader aparecer bonito
        setTimeout(() => {
          setUserData(prev => ({ ...prev, foto: base64String }));
          if (loader) loader.classList.remove("active");
          Swal.fire({ icon: "success", title: "Foto atualizada!", timer: 1200, showConfirmButton: false });
        }, 300);
      } else {
        if (loader) loader.classList.remove("active");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoverFoto = () => {
    const usuarioObj = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
    
    // Fecha o menu flutuante imediatamente
    setMenuPerfilAberto(false);

    // Ativa o loader global
    const loader = document.getElementById("global-loader");
    if (loader) loader.classList.add("active");

    setTimeout(() => {
      if (usuarioObj.id) {
        localStorage.removeItem(`foto_perfil_${usuarioObj.id}`);
        setUserData(prev => ({ ...prev, foto: null }));
        if (loader) loader.classList.remove("active");
        Swal.fire({ icon: "success", title: "Foto removida!", timer: 1200, showConfirmButton: false });
      } else {
        if (loader) loader.classList.remove("active");
      }
    }, 300);
  };

  // =========================
  // ALTERAR SENHA
  // =========================
  const abrirModalAlterarSenha = async () => {
    const usuarioLocal = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
    const { data: usuarioDb } = await supabase.from("0-Interno_usuarios").select("senha").eq("id", usuarioLocal.id).single();
    
    if (!usuarioDb) return;
    const senhaAtualHash = usuarioDb.senha;

    const iconLock = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    const iconLockOpen = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#005596" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;

    const { value: formValues } = await Swal.fire({
      title: "Alterar Senha",
      html: `
        <div style="text-align: left; font-size: 14px; color: #555; margin-bottom: 20px;">
          Por segurança, digite sua senha atual e escolha uma nova.<br><br>
          <strong style="color: #005596;">Requisitos mínimos:</strong><br>
          • Mínimo de 8 caracteres<br>
          • Letras (maiúsculas e minúsculas)<br>
          • Pelo menos um número<br>
          • Pelo menos um caractere especial (&#@$)
        </div>
        <div style="position: relative; margin-bottom: 10px;">
          <input type="password" id="swal-senha-atual" class="swal2-input" placeholder="Senha Atual" style="width: 100%; margin: 0; padding-right: 40px; box-sizing: border-box;">
          <button type="button" id="btn-senha-atual" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">${iconLock}</button>
        </div>
        <div style="position: relative; margin-bottom: 10px;">
          <input type="password" id="swal-nova-senha" class="swal2-input" placeholder="Nova Senha" style="width: 100%; margin: 0; padding-right: 40px; box-sizing: border-box;">
          <button type="button" id="btn-nova-senha" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">${iconLock}</button>
        </div>
        <div style="position: relative; margin-bottom: 10px;">
          <input type="password" id="swal-confirma-senha" class="swal2-input" placeholder="Confirme a Nova Senha" style="width: 100%; margin: 0; padding-right: 40px; box-sizing: border-box;">
          <button type="button" id="btn-confirma-senha" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">${iconLock}</button>
        </div>
      `,
      focusConfirm: false, showCancelButton: true, confirmButtonText: "Salvar", cancelButtonText: "Cancelar",
      didOpen: () => {
        ['atual', 'nova', 'confirma'].forEach(tipo => {
          const input = document.getElementById(`swal-${tipo === 'atual' ? 'senha-atual' : tipo + '-senha'}`);
          const btn = document.getElementById(`btn-${tipo === 'atual' ? 'senha-atual' : tipo + '-senha'}`);
          btn.addEventListener('click', () => {
            input.type = input.type === 'password' ? 'text' : 'password';
            btn.innerHTML = input.type === 'password' ? iconLock : iconLockOpen;
          });
        });
      },
      preConfirm: () => {
        const sAtual = document.getElementById('swal-senha-atual').value;
        const nSenha = document.getElementById('swal-nova-senha').value;
        const cSenha = document.getElementById('swal-confirma-senha').value;
        const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&#@$])[A-Za-z\d&#@$]{8,}$/;

        if (!sAtual || !nSenha || !cSenha) return Swal.showValidationMessage("Preencha todos os campos.");
        if (!bcrypt.compareSync(sAtual, senhaAtualHash)) return Swal.showValidationMessage("Senha atual incorreta.");
        if (nSenha !== cSenha) return Swal.showValidationMessage("As novas senhas não coincidem.");
        if (!regexSenha.test(nSenha)) return Swal.showValidationMessage("A nova senha não atende aos requisitos.");
        if (bcrypt.compareSync(nSenha, senhaAtualHash)) return Swal.showValidationMessage("A nova senha não pode ser igual à atual.");
        return nSenha;
      }
    });

    if (formValues) {
      const novoHash = bcrypt.hashSync(formValues, bcrypt.genSaltSync(10));
      await supabase.from("0-Interno_usuarios").update({ senha: novoHash }).eq("id", usuarioLocal.id);
      Swal.fire("Sucesso!", "Senha atualizada.", "success");
    }
  };

  const toggleMenu = (menuName) => setOpenMenu(openMenu === menuName ? "" : menuName);

  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "Bom dia,";
    if (hora >= 12 && hora < 18) return "Boa tarde,";
    return "Boa noite,";
  };

  return (
    <div className="dashboard">
      <aside className={`sidebar ${sidebarOpen ? "" : "hidden"}`} id="sidebar">
        <div className="sidebar-header">
          <button className="close-btn" onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none' }}><ChevronLeft /></button>
          
          {/* Avatar com suporte a menu suspenso sem piscar */}
          <div className="user-avatar-wrapper" ref={menuRef}>
            <div className="user-avatar-container" onClick={handleAvatarClick} title="Gerenciar foto do perfil">
              {userData.foto ? (
                <img src={userData.foto} alt="Perfil" className="user-avatar-img" />
              ) : (
                <div className="user-avatar"><User /></div>
              )}
              <div className="avatar-overlay">
                <Camera size={12} color="#fff" />
              </div>
            </div>

            {/* Menu flutuante que aparece apenas se já houver foto cadastrada */}
            {menuPerfilAberto && (
              <div className="avatar-dropdown-menu">
                <button onClick={() => { setMenuPerfilAberto(false); fileInputRef.current.click(); }}>
                  <Upload size={13} /> Enviar Nova Foto
                </button>
                <button onClick={handleRemoverFoto} className="danger-option">
                  <Trash2 size={13} /> Remover Foto
                </button>
              </div>
            )}
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleTrocarFoto} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />

          <div className="user-info">
            <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '600', textTransform: 'uppercase' }}>{getSaudacao()}</span>
            <span className="user-name-text">{userData.nome}</span>
            <span className="user-perfil-tag">{userData.perfil}</span>
          </div>
        </div>

        <div className="menu">
          <Link to="/dashboard"><Home /><span>Início</span></Link>

          <div className={`menu-item ${openMenu === "atividades" ? "open" : ""}`}>
            <div className="menu-link" onClick={() => toggleMenu("atividades")}>
              <Zap /><span>Atividades</span><ChevronDown className="arrow" />
            </div>
            <div className="submenu">
              <Link to="/dashboard/carteira"><Wallet /><span>Carteira</span></Link>
              <Link to="/dashboard/programacao"><CalendarRange /><span>Programação</span></Link>
              <Link to="/dashboard/producao"><TrendingUp /><span>Produção</span></Link>
            </div>
          </div>

          <div className={`menu-item ${openMenu === "database" ? "open" : ""}`}>
            <div className="menu-link" onClick={() => toggleMenu("database")}>
              <Database /><span>Database</span><ChevronDown className="arrow" />
            </div>
            <div className="submenu">
              <Link to="/dashboard/tabelas-externas"><FileText /><span>Tabelas Externas</span></Link>
              <Link to="/dashboard/tabelas-internas"><Database /><span>Tabelas Internas</span></Link>
            </div>
          </div>

          <div className={`menu-item ${openMenu === "configuracoes" ? "open" : ""}`}>
            <div className="menu-link" onClick={() => toggleMenu("configuracoes")}>
              <Settings /><span>Configurações</span><ChevronDown className="arrow" />
            </div>
            <div className="submenu">
              <Link to="/dashboard/usuarios"><Users /><span>Usuários</span></Link>
              <a href="#" onClick={(e) => { e.preventDefault(); abrirModalAlterarSenha(); }}><Lock /><span>Alterar Senha</span></a>
            </div>
          </div>
        </div>
      </aside>

      <div className="content">
        <div className="topbar">
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {!sidebarOpen && (
              <button className="toggle-btn" onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <Menu size={22} />
              </button>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', padding: '6px', borderRadius: '8px', display: 'flex', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)' }}>
                <Zap size={16} color="white" fill="white" />
              </div>
              <span className="logo-top" style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ background: 'linear-gradient(to right, #0f172a, #0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900', letterSpacing: '-0.5px', fontSize: '20px' }}>
                  ZEUS
                </span>
                <span style={{ color: '#64748b', fontWeight: '500', fontSize: '14px', marginLeft: '8px', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px' }}>
                  Gestão Integrada de Obras Elétricas
                </span>
              </span>
            </div>
          </div>

          <button className="logout-top" onClick={() => deslogar(true)} title="Sair da conta">
            <LogOut size={16} />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Sair</span>
          </button>
        </div>

        <div className="main">    
          <div className="page-container">
            <div className="page-content" id="mainContent">
              <Outlet />
            </div>
          </div>
        </div>

        <div className="footer">
          <span>© 2026 ZEUS System - Todos os direitos reservados.</span>
          <span>Sessão: {userData.id_sessao.substring(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
}