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
        .from("0-Interno_usuarios")
        .select("id, senha, situacao, id_sessao, nome, senha_temporaria, Perfil")
        .eq("email", email)
        .single();

      if (userError || !usuario) throw new Error("E-mail ou senha incorretos.");

      const senhaValida = bcrypt.compareSync(password, usuario.senha);
      if (!senhaValida) throw new Error("E-mail ou senha incorretos.");

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
      Swal.fire("Erro de acesso", traduzirErro(err.message), "error");
    }
  };

  const abrirModalNovaSenha = async (userId, senhaAtualHash) => {
    // Ícones SVG para usarmos dentro do texto do SweetAlert
    const iconLock = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    const iconLockOpen = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#005596" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;

    const { value: novaSenha } = await Swal.fire({
      title: "Redefinição Obrigatória",
      html: `
        <div style="text-align: left; font-size: 14px; color: #555; margin-bottom: 20px;">
          Você acessou usando uma senha temporária. Por segurança, cadastre uma nova senha definitiva.<br><br>
          <strong style="color: #005596;">Requisitos mínimos:</strong><br>
          • Mínimo de 8 caracteres<br>
          • Letras (pelo menos uma maiúscula e uma minúscula)<br>
          • Pelo menos um número<br>
          • Pelo menos um caractere especial (&#@$)
        </div>
        
        <div style="position: relative; margin-bottom: 10px;">
          <input type="password" id="swal-nova-senha" class="swal2-input" placeholder="Nova Senha" style="width: 100%; margin: 0; padding-right: 45px; box-sizing: border-box;">
          <button type="button" id="btn-nova-senha" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 5px;">
            ${iconLock}
          </button>
        </div>

        <div style="position: relative; margin-bottom: 10px;">
          <input type="password" id="swal-confirma-senha" class="swal2-input" placeholder="Confirme a Nova Senha" style="width: 100%; margin: 0; padding-right: 45px; box-sizing: border-box;">
          <button type="button" id="btn-confirma-senha" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 5px;">
            ${iconLock}
          </button>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonText: "Salvar",
      didOpen: () => {
        const inputNova = document.getElementById('swal-nova-senha');
        const btnNova = document.getElementById('btn-nova-senha');
        btnNova.addEventListener('click', () => {
          if (inputNova.type === 'password') {
            inputNova.type = 'text';
            btnNova.innerHTML = iconLockOpen;
          } else {
            inputNova.type = 'password';
            btnNova.innerHTML = iconLock;
          }
        });

        const inputConfirma = document.getElementById('swal-confirma-senha');
        const btnConfirma = document.getElementById('btn-confirma-senha');
        btnConfirma.addEventListener('click', () => {
          if (inputConfirma.type === 'password') {
            inputConfirma.type = 'text';
            btnConfirma.innerHTML = iconLockOpen;
          } else {
            inputConfirma.type = 'password';
            btnConfirma.innerHTML = iconLock;
          }
        });
      },
      preConfirm: () => {
        const nSenha = document.getElementById('swal-nova-senha').value;
        const cSenha = document.getElementById('swal-confirma-senha').value;
        
        // REGEX ATUALIZADA: Exige minúscula (?=.*[a-z]), maiúscula (?=.*[A-Z]), número (?=.*\d) e especial (?=.*[&#@$])
        const regexSenha = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[&#@$])[A-Za-z\d&#@$]{8,}$/;

        if (!nSenha || !cSenha) return Swal.showValidationMessage("Preencha todos os campos.");
        if (nSenha !== cSenha) return Swal.showValidationMessage("As senhas não coincidem.");
        if (!regexSenha.test(nSenha)) return Swal.showValidationMessage("A senha não atende aos requisitos mínimos.");
        if (senhaAtualHash && bcrypt.compareSync(nSenha, senhaAtualHash)) return Swal.showValidationMessage("Não pode ser igual à anterior.");
        return nSenha;
      }
    });

    if (!novaSenha) return false;

    try {
      const salt = bcrypt.genSaltSync(10);
      const novoHash = bcrypt.hashSync(novaSenha, salt);
      const { error } = await supabase.from("0-Interno_usuarios").update({ senha: novoHash, senha_temporaria: false }).eq("id", userId);
      
      if (error) throw error;

      await Swal.fire("Senha atualizada!", "Sua senha definitiva foi cadastrada.", "success");
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
    const { error: updateError } = await supabase.from("0-Interno_usuarios").update({
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
            <div className="brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 className="logo-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap style={{ color: '#005596', fill: '#005596', marginRight: '4px' }} size={64} /> ZEUS
              </h1>
              <p className="tagline">Gestão Integrada de Obras Elétricas</p>
            </div>
            <div className="input-group">
              <div className="password-wrapper">
                <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
                <span className="eye-btn" style={{ display: 'flex', alignItems: 'center', pointerEvents: 'none' }}><User /></span>
              </div>
              <div className="password-wrapper">
                <input type={showPassword ? "text" : "password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <LockOpen /> : <Lock />}
                </button>
              </div>
              <Link to="/reset" className="forgot-link">Esqueceu a senha?</Link>
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