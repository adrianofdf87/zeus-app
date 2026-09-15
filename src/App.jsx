import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Reset from "./pages/Reset/Reset.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Usuarios from "./pages/Usuarios/Usuarios.jsx";
import Carteira from "./pages/Carteira/carteira.jsx";

// Import das Tabelas Internas
import TabelasInternas from "./pages/BancoDados/tabelas_internas.jsx"; 

// 1. Import da nova tela de Programação
import Programacao from "./pages/Programacao/Programacoes.jsx";

// Componente padronizado para as mensagens no centro da tela
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
          
          {/* Rota da Carteira */}
          <Route path="carteira" element={<Carteira />} />
          
          {/* 2. Rota da Programação atualizada com o novo componente */}
          <Route path="programacao" element={<Programacao />} />
          
          <Route path="producao" element={<MensagemCentro texto="Tela de Produção em construção..." />} />
          
          <Route path="usuarios" element={<Usuarios />} />

          {/* Rota das Tabelas Internas */}
          <Route path="tabelas-internas" element={<TabelasInternas />} />
          
          {/* Rota futura */}
          <Route path="tabelas-externas" element={<MensagemCentro texto="Tabelas Externas em construção..." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;