import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login/Login.jsx";
import Reset from "./pages/reset/Reset.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Usuarios from "./pages/Usuarios/Usuarios.jsx";
import Carteira from "./pages/Carteira/carteira.jsx"; // <--- Importando a página da Carteira

// Este é o nosso componente padronizado para as mensagens no centro da tela!
function MensagemCentro({ texto }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
      <h3 style={{ fontSize: '18px', color: '#005596', fontWeight: '600', margin: 0, textAlign: 'center' }}>
        {texto}
      </h3>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/reset" element={<Reset />} />
        
        <Route path="/dashboard" element={<Dashboard />}>
          {/* Rota inicial */}
          <Route index element={<MensagemCentro texto="Página de Início do ZEUS" />} />
          
          {/* Demais rotas em construção */}
          <Route path="equipes" element={<MensagemCentro texto="Tela de Equipes em construção..." />} />
          <Route path="colaboradores" element={<MensagemCentro texto="Tela de Colaboradores em construção..." />} />
          <Route path="veiculos" element={<MensagemCentro texto="Tela de Veículos em construção..." />} />
          
          {/* Rota da Carteira integrada com sucesso */}
          <Route path="carteira" element={<Carteira />} />
          
          <Route path="programacao" element={<MensagemCentro texto="Tela de Programação em construção..." />} />
          <Route path="producao" element={<MensagemCentro texto="Tela de Produção em construção..." />} />
          
          <Route path="usuarios" element={<Usuarios />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;