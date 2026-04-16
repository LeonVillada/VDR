import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Wallet,
  Settings,
  PlusCircle,
  TrendingUp,
  CreditCard,
  Menu,
  X,
  Zap,
  Building2,
  HandCoins
} from 'lucide-react';

import Dashboard    from './pages/Dashboard';
import Personas     from './pages/Personas';
import Pagos        from './pages/Pagos';
import GestionMetas from './pages/GestionMetas';
import Alcantarilla from './pages/Alcantarilla';
import BancoGeneral from './pages/BancoGeneral';
import Prestamos    from './pages/Prestamos';
import Gastos        from './pages/Gastos';
import Fondos        from './pages/Fondos';
import FondosEspecificos from './pages/FondosEspecificos';

const SidebarItem = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link to={to} onClick={onClick} className={`btn btn-ghost ${active ? 'active-link' : ''}`} style={{
      justifyContent: 'flex-start',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      background: active ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
    }}>
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  );
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <BrowserRouter>
      {/* Logos flotantes eliminados - Diseño limpio */}

      <div className="mobile-header" style={{ display: 'none', padding: '1rem', background: 'var(--surface)', borderBottom: '1px solid var(--glass-border)', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--primary)', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
            <TrendingUp color="black" size={20} strokeWidth={3} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>VDRSOFTWARE</h2>
        </div>
        <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <div className="app-container" style={{ minHeight: '100vh', display: 'flex' }}>
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'var(--primary)', padding: '0.6rem', borderRadius: '12px', display: 'flex' }}>
                <TrendingUp color="black" size={24} strokeWidth={3} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>VDRSOFTWARE</h2>
            </div>
            <button className="btn btn-ghost mobile-close-btn" style={{ display: 'none', padding: '0.5rem' }} onClick={closeSidebar}>
              <X size={24} />
            </button>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SidebarItem to="/" icon={BarChart3} label="Dashboard" onClick={closeSidebar} />
            <SidebarItem to="/personas" icon={Users} label="Integrantes" onClick={closeSidebar} />
            <SidebarItem to="/pagos" icon={CreditCard} label="Pagos" onClick={closeSidebar} />
            <SidebarItem to="/metas" icon={TrendingUp} label="Gestión Metas" onClick={closeSidebar} />
            <SidebarItem to="/alcantarilla" icon={Zap} label="La Alcantarilla" onClick={closeSidebar} />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />
            <SidebarItem to="/banco" icon={Building2} label="Banco General VDR" onClick={closeSidebar} />
            <SidebarItem to="/prestamos" icon={HandCoins} label="Préstamos" onClick={closeSidebar} />
            <SidebarItem to="/gastos" icon={CreditCard} label="Gastos" onClick={closeSidebar} />
            <SidebarItem to="/fondos" icon={CreditCard} label="Fondos" onClick={closeSidebar} />
            <SidebarItem to="/fondos-especificos" icon={CreditCard} label="Fondos Específicos" onClick={closeSidebar} />
          </nav>
        </aside>

        <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/personas" element={<Personas />} />
              <Route path="/pagos" element={<Pagos />} />
              <Route path="/metas" element={<GestionMetas />} />
              <Route path="/alcantarilla" element={<Alcantarilla />} />
              <Route path="/banco" element={<BancoGeneral />} />
              <Route path="/prestamos" element={<Prestamos />} />
              <Route path="/gastos" element={<Gastos />} />
              <Route path="/fondos" element={<Fondos />} />
              <Route path="/fondos-especificos" element={<FondosEspecificos />} />
            </Routes>
          </div>

          {/* FOOTER CON LOGO */}
          <footer style={{
            marginTop: 'auto',
            padding: '2rem',
            textAlign: 'center',
            background: 'transparent',
            position: 'relative',
            zIndex: 10
          }}>
            <div style={{ maxWidth: '180px', margin: '0 auto' }}>
              <img
                src="/assets/verdaderos-logo.png"
                alt="VDR Software Logo"
                style={{
                  maxHeight: '45px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.3))' // Sutil brillo verde
                }}
              />
            </div>
          </footer>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
