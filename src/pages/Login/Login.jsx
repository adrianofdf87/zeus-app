import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Zap, User, Lock, LockOpen } from "lucide-react";
import bcrypt from "bcryptjs";
import Swal from "sweetalert2";
import { supabase } from "../../services/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("id_sessao");
    localStorage.removeItem("mapa_aberto");
    localStorage.removeItem("usuario_logado");
  }, []);

  const traduzirErro = (msg) => {
    if (!msg) return "Erro desconhecido.";
    if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
    if (msg.includes("Email not confirmed")) return "Por favor, confirme seu e-mail antes de acessar.";
    return msg;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Swal.fire("Atenção", "Preencha todos os campos para continuar.", "warning");
      return;
    }

    setLoading(true);

    try {
      const { data: usuario, error: userError } = await supabase
        .from("tabi_cad_usuarios")
        .select("id, senha, situacao, id_sessao, nome, senha_temporaria, Perfil")
        .eq("email", email)
        .single();

      if (userError) {
        console.error("Erro retornado pelo Supabase:", userError);
        throw new Error("Erro no banco de dados: " + userError.message);
      }

      if (!usuario) {
        throw new Error("E-mail ou senha incorretos.");
      }

      const senhaValida = bcrypt.compareSync(password, usuario.senha);
      if (!senhaValida) {
        console.warn("A senha digitada não confere com o Hash salvo no banco.");
        throw new Error("E-mail ou senha incorretos.");
      }

      if (usuario.situacao !== "Ativo") {
        throw new Error("Sua conta está inativa. Contate o administrador.");
      }

      setLoading(false);

      if (usuario.senha_temporaria === true || usuario.senha_temporaria === "true" || usuario.senha_temporaria === 1) {
        const sucesso = await abrirModalNovaSenha(usuario.id, usuario.senha);
        if (!sucesso) return;
        usuario.senha_temporaria = false;
      }

      await concluirLogin(usuario, email);
    } catch (err) {
      setLoading(false);
      console.error("Erro capturado no catch:", err);
      Swal.fire("Erro de acesso", traduzirErro(err.message), "error");
    }
  };

  const abrirModalNovaSenha = async (userId, senhaAtualHash) => {
    const icLk = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    const icUnlk = icLk.replace('#94a3b8', '#005596').replace('10 0v4', '9.9-1');

    const inputHtml = (id, label) => `
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
        <label style="font-size:0.85rem;font-weight:600;color:#475569;">${label}</label>
        <div style="position:relative;">
          <input type="password" id="${id}" style="width:100%;height:40px;padding:0 36px 0 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;box-sizing:border-box;font-size:0.9rem;color:#1e293b;outline:none;transition:all 0.2s ease;" onfocus="this.style.borderColor='#005596';this.style.boxShadow='0 0 0 3px rgba(0,85,150,0.12)';" onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none';">
          <button type="button" id="btn-${id}" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:0;display:flex;transition:color 0.2s;">${icLk}</button>
        </div>
      </div>
    `;

    const { value: novaSenha } = await Swal.fire({
      padding: '0', 
      background: '#ffffff', 
      showCloseButton: false,
      showCancelButton: true,
      reverseButtons: true,
      allowOutsideClick: false,
      customClass: { 
        popup: 'swal2-enterprise-modal', 
        actions: 'swal2-custom-actions', 
        confirmButton: 'swal2-confirm-pro', 
        cancelButton: 'swal2-cancel-pro' 
      },
      html: `
        <div style="background:#f8fafc;padding:20px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:14px;text-align:left;">
          <div style="background:#005596;color:#fff;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,85,150,0.2);flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          </div>
          <div>
            <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Redefinição Obrigatória</h2>
            <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Cadastre sua senha definitiva</p>
          </div>
        </div>
        <div style="padding:20px 24px 10px;display:flex;flex-direction:column;text-align:left;">
          ${inputHtml('s-nova', 'Nova Senha')}
          ${inputHtml('s-conf', 'Confirme a Nova Senha')}
          
          <div style="margin-top:4px;margin-bottom:8px;background:#f0f9ff;padding:12px 14px;border-radius:8px;border-left:3px solid #005596;">
            <strong style="color:#005596;font-size:0.8rem;display:block;margin-bottom:6px;">Requisitos mínimos:</strong>
            <ul style="margin:0;padding-left:16px;color:#475569;font-size:0.8rem;line-height:1.5;">
              <li>Mínimo de 8 caracteres</li>
              <li>Letras maiúsculas e minúsculas</li>
              <li>Pelo menos um número</li>
              <li>Caractere especial (&#@$)</li>
            </ul>
          </div>
        </div>
      `,
      confirmButtonText: "Salvar Senha",
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      didOpen: () => {
        ['s-nova', 's-conf'].forEach(id => {
          const i = document.getElementById(id), b = document.getElementById(`btn-${id}`);
          if (i && b) {
            b.onclick = () => { 
              i.type = i.type === 'password' ? 'text' : 'password'; 
              b.innerHTML = i.type === 'password' ? icLk : icUnlk; 
            };
          }
        });
      },
      preConfirm: () => {
        const nSenha = document.getElementById('s-nova').value;
        const cSenha = document.getElementById('s-conf').value;
        const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&#@$])[A-Za-z\d&#@$]{8,}$/;

        if (!nSenha || !cSenha) return Swal.showValidationMessage("Preencha todos os campos obrigatórios.");
        if (nSenha !== cSenha) return Swal.showValidationMessage("As senhas não coincidem.");
        if (!regexSenha.test(nSenha)) return Swal.showValidationMessage("A senha não atende aos requisitos mínimos de segurança.");
        if (senhaAtualHash && bcrypt.compareSync(nSenha, senhaAtualHash)) return Swal.showValidationMessage("A nova senha não pode ser igual à senha temporária.");
        return nSenha;
      }
    });

    if (!novaSenha) return false;

    try {
      const salt = bcrypt.genSaltSync(10);
      const novoHash = bcrypt.hashSync(novaSenha, salt);
      const { error } = await supabase.from("tabi_cad_usuarios").update({ senha: novoHash, senha_temporaria: false }).eq("id", userId);
      
      if (error) throw error;

      await Swal.fire({
        padding: '0', 
        background: '#ffffff', 
        showCloseButton: false,
        allowOutsideClick: false,
        customClass: { popup: 'swal2-enterprise-modal', actions: 'swal2-custom-actions', confirmButton: 'swal2-confirm-pro' },
        html: `
          <div style="background:#f8fafc;padding:20px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:14px;text-align:left;">
            <div style="background:#10b981;color:#fff;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(16,185,129,0.2);flex-shrink:0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div>
              <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#0f172a;line-height:1.2;">Senha Atualizada!</h2>
              <p style="margin:3px 0 0;font-size:0.82rem;color:#64748b;">Acesso liberado.</p>
            </div>
          </div>
        `,
        confirmButtonText: "Entrar no Sistema",
        didOpen: () => {
          const btn = Swal.getConfirmButton();
          if (btn) btn.style.backgroundColor = '#10b981'; 
        }
      });
      return true;
    } catch (err) {
      Swal.fire("Erro", "Não foi possível atualizar: " + err.message, "error");
      return false;
    }
  };

  const concluirLogin = async (usuario, email) => {
    setLoading(true);
    if (usuario.id_sessao) {
      setLoading(false);
      const result = await Swal.fire({
        title: "Sessão ativa",
        text: "Existe outro acesso ativo. Deseja encerrar a outra sessão e entrar aqui?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sim, substituir",
      });
      if (!result.isConfirmed) return;
      setLoading(true);
    }

    const novoIdSessao = crypto.randomUUID();
    const { error: updateError } = await supabase.from("tabi_cad_usuarios").update({
      id_sessao: novoIdSessao,
      data_sessao: new Date().toISOString()
    }).eq("id", usuario.id);

    if (updateError) {
      setLoading(false);
      Swal.fire("Erro", "Falha ao atualizar sessão.", "error");
      return;
    }

    localStorage.setItem("id_sessao", novoIdSessao);
    localStorage.setItem("usuario_logado", JSON.stringify({
      id: usuario.id, nome: usuario.nome, email: email, Perfil: usuario.Perfil
    }));

    navigate("/dashboard");
  };

  return (
    <>
      <main className="main-wrapper">
        <section className="side-image">
          <div className="overlay"></div>
        </section>
        <section className="login-section">
          <div className="login-container">
            
            {/* LOGO */}
            <div className="brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                
                <div style={{ 
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', 
                  padding: '12px', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  boxShadow: '0 8px 20px rgba(2, 132, 199, 0.3)' 
                }}>
                  <Zap size={36} color="white" fill="white" />
                </div>
                
                <span style={{ 
                  background: 'linear-gradient(to right, #0f172a 0%, #0284c7 100%)',
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent',
                  fontWeight: '900', 
                  letterSpacing: '-1.5px', 
                  fontSize: '48px',
                  lineHeight: '1',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  ZEUS
                </span>
                
              </div>
              
              <p className="tagline" style={{ 
                color: '#64748b', 
                fontWeight: '600', 
                fontSize: '12px',
                letterSpacing: '0.3px',
                margin: '0',
                textTransform: 'uppercase'
              }}>
                Obras Elétricas
              </p>
            </div>
            {/* FIM DA LOGO */}

            <div className="input-group">
              {/* Input de E-mail */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <input 
                  type="email" 
                  placeholder="E-mail" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} 
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <span style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#94a3b8' }}>
                  <User size={18} />
                </span>
              </div>

              {/* Input de Senha */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Senha" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} 
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: 0,
                    color: '#94a3b8'
                  }}
                >
                  {showPassword ? <LockOpen size={18} /> : <Lock size={18} />}
                </button>
              </div>

              <Link to="/reset" className="forgot-link" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: '500' }}>Esqueceu a senha?</Link>
            </div>
            
            <button className="btn-primary" onClick={handleLogin}>ACESSAR</button>
          </div>
        </section>
      </main>
      {loading && (
        <div className="loader-overlay active">
          <div className="loader-spinner"></div>
        </div>
      )}
    </>
  );
}