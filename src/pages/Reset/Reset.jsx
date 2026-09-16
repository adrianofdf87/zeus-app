import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, User } from "lucide-react";
import bcrypt from "bcryptjs";
import Swal from "sweetalert2";
import emailjs from "@emailjs/browser";
import { supabase } from "../../services/supabase";

export default function Reset() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const gerarSenhaTemporaria = () => {
    const letrasMaiusculas = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const letrasMinusculas = "abcdefghijklmnopqrstuvwxyz";
    const numeros = "0123456789";
    const especiais = "&#@$";
    
    let senha = letrasMaiusculas.charAt(Math.floor(Math.random() * letrasMaiusculas.length)) +
                letrasMinusculas.charAt(Math.floor(Math.random() * letrasMinusculas.length)) +
                numeros.charAt(Math.floor(Math.random() * numeros.length)) +
                especiais.charAt(Math.floor(Math.random() * especiais.length));

    const todosCaracteres = letrasMaiusculas + letrasMinusculas + numeros + especiais;
    for (let i = senha.length; i < 10; i++) {
      senha += todosCaracteres.charAt(Math.floor(Math.random() * todosCaracteres.length));
    }
    return senha.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const handleRecuperar = async () => {
    if (!email.trim()) {
      Swal.fire("Atenção", "Por favor, digite o seu e-mail.", "warning");
      return;
    }

    setLoading(true);
    try {
      const { data: usuario, error: erroBusca } = await supabase
        .from("tabi_cad_usuarios")
        .select("id, email, situacao")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (erroBusca || !usuario) throw new Error("E-mail não encontrado no sistema.");
      if (usuario.situacao !== "Ativo") throw new Error("Esta conta está inativa. Contate o administrador.");

      const novaSenhaTemp = gerarSenhaTemporaria();
      const salt = bcrypt.genSaltSync(10);
      const senhaHash = bcrypt.hashSync(novaSenhaTemp, salt);

      const { error: erroUpdate } = await supabase.from("tabi_cad_usuarios").update({ 
        senha: senhaHash, senha_temporaria: true 
      }).eq("id", usuario.id);

      if (erroUpdate) throw erroUpdate;

      await emailjs.send("service_ul23vmi", "template_e547vrb", {
        email: usuario.email, senha_temp: novaSenhaTemp
      }, "s-0CXwrPxKtLrSZfU");

      setLoading(false);
      await Swal.fire("E-mail Enviado!", "Uma nova senha temporária foi gerada e enviada.", "success");
      navigate("/");

    } catch (err) {
      setLoading(false);
      Swal.fire("Erro", err.message, "error");
    }
  };

  return (
    <>
      <main className="main-wrapper" style={{ minHeight: '100vh', minHeight: '100dvh', height: 'auto', overflowY: 'auto' }}>
        <section className="side-image">
          <div className="overlay"></div>
        </section>
        <section className="login-section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 15px', boxSizing: 'border-box' }}>
          <div className="login-container" style={{ width: '100%', maxWidth: '400px', margin: 'auto', boxSizing: 'border-box' }}>
            
            <div className="brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', 
                  padding: '10px', 
                  borderRadius: '14px', 
                  display: 'flex', 
                  boxShadow: '0 6px 16px rgba(2, 132, 199, 0.3)' 
                }}>
                  <Zap size={32} color="white" fill="white" />
                </div>
                <span style={{ 
                  background: 'linear-gradient(to right, #0f172a 0%, #0284c7 100%)',
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent',
                  fontWeight: '900', 
                  letterSpacing: '-1.5px', 
                  fontSize: '40px',
                  lineHeight: '1',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  ZEUS
                </span>
              </div>
              <p className="tagline" style={{ 
                color: '#64748b', 
                fontWeight: '600', 
                fontSize: '11px',
                letterSpacing: '0.3px',
                margin: '0',
                textTransform: 'uppercase'
              }}>
                Recuperação de Senha
              </p>
            </div>

            <div className="input-group">
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
                <input 
                  type="email" 
                  placeholder="E-mail cadastrado" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleRecuperar()} 
                  style={{ width: '100%', paddingRight: '40px', height: '42px', boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#94a3b8' }}>
                  <User size={18} />
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <Link to="/" className="forgot-link" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: '500', fontSize: '0.85rem' }}>Voltar para o Login</Link>
              </div>
            </div>
            
            <button className="btn-primary" onClick={handleRecuperar} style={{ width: '100%', height: '44px', boxSizing: 'border-box' }}>ENVIAR NOVA SENHA</button>
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