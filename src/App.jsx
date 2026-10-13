// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login/Login.jsx";
import Reset from "./pages/login/Reset.jsx";
import Dashboard from "./pages/dashboard/Dashboard.jsx"; 
import Usuarios from "./pages/Usuarios/Usuarios.jsx";
import Alimentadores from "./pages/database/dadosInternos/alimentadores.jsx";
import Contratos from "./pages/database/dadosInternos/contratos.jsx";
import Etapas from "./pages/database/dadosInternos/etapas.jsx";
import SapCn43n from "./pages/database/dadosExternos/sapcn43n.jsx";
import SapCn52n from "./pages/database/dadosExternos/sapcn52n.jsx";
import SapMe33k from "./pages/database/dadosExternos/sapme33k.jsx";
import SapCji3 from "./pages/database/dadosExternos/sapcji3.jsx";
import SapMb52 from "./pages/database/dadosExternos/sapmb52.jsx";
import ProjLto from "./pages/database/dadosExternos/projlto.jsx";
import ProjLtg from "./pages/database/dadosExternos/projltg.jsx";
import ProjMedicao from "./pages/database/dadosExternos/projmedicao.jsx";
import ProjLocalizacao from "./pages/database/dadosExternos/projlocalizacao.jsx";
import JupiterEquipes from "./pages/database/dadosExternos/jupiterequipes.jsx";
import JupiterProducao from "./pages/database/dadosExternos/jupiterproducao.jsx";

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
          
          {/* Rotas em construção */}
          <Route path="equipes" element={<MensagemCentro texto="Tela de Equipes em construção..." />} />
          <Route path="colaboradores" element={<MensagemCentro texto="Tela de Colaboradores em construção..." />} />
          <Route path="veiculos" element={<MensagemCentro texto="Tela de Veículos em construção..." />} />
          <Route path="carteira" element={<MensagemCentro texto="Tela de Carteira em construção..." />} />
          <Route path="programacao" element={<MensagemCentro texto="Tela de Programação em construção..." />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="tabelas-internas" element={<MensagemCentro texto="Tabelas Internas em construção..." />} />
          <Route path="tabelas-externas" element={<MensagemCentro texto="Tabelas Externas em construção..." />} />

          {/* Rotas com arquivos próprios */}
          <Route path="alimentadores" element={<Alimentadores />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="etapas" element={<Etapas />} />
          <Route path="sap-cn43n" element={<SapCn43n />} />
          <Route path="sap-cn52n" element={<SapCn52n />} />
          <Route path="sap-cji3" element={<SapCji3 />} />
          <Route path="sap-mb52" element={<SapMb52 />} />
          <Route path="sap-me33k" element={<SapMe33k />} />
          <Route path="proj-lto" element={<ProjLto />} />
          <Route path="proj-ltg" element={<ProjLtg />} />
          <Route path="proj-medicao" element={<ProjMedicao />} />
          <Route path="proj-localizacao" element={<ProjLocalizacao />} />
          <Route path="jupiter-producao" element={<JupiterProducao />} />
          <Route path="jupiter-equipes" element={<JupiterEquipes />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;