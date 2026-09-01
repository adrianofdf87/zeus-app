import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
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
        .from("0-Interno_usuarios")
        .select("id, email, situacao")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (erroBusca || !usuario) throw new Error("E-mail não encontrado no sistema.");
      if (usuario.situacao !== "Ativo") throw new Error("Esta conta está inativa. Contate o administrador.");

      const novaSenhaTemp = gerarSenhaTemporaria();
      const salt = bcrypt.genSaltSync(10);
      const senhaHash = bcrypt.hashSync(novaSenhaTemp, salt);

      const { error: erroUpdate } = await supabase.from("0-Interno_usuarios").update({ 
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
      <main className="main-wrapper">
        <section className="side-image"><div className="overlay"></div></section>
        <section className="login-section">
          <div className="login-container">
            <div className="brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 className="logo-text" style={{ display: 'flex', alignItems: 'center' }}>
                <Zap style={{ color: '#005596', fill: '#005596', marginRight: '4px' }} size={64} /> GIOE
              </h1>
              <p className="tagline">RECUPERAÇÃO DE SENHA</p>
            </div>
            <div className="input-group">
              <input type="email" placeholder="Digite seu e-mail cadastrado" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRecuperar()} />
            </div>
            <button className="btn-primary" onClick={handleRecuperar}>ENVIAR NOVA SENHA</button>
            <Link to="/" style={{ textAlign: 'center', marginTop: '15px', color: '#005596', textDecoration: 'none', display: 'block' }}>Voltar para o Login</Link>
          </div>
        </section>
      </main>
      {loading && <div className="loader-overlay active"><div className="loader-spinner"></div></div>}
    </>
  );
}