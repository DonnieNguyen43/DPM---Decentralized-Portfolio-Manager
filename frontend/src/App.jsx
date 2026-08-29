import { PortfolioProvider } from "./hooks/usePortfolio";
import WalletConnect from "./components/WalletConnect";
import Dashboard from "./components/Dashboard";
import Logo from "./components/Logo";
import MarqueeTicker from "./components/MarqueeTicker";
import "./index.css";

export default function App() {
  return (
    <PortfolioProvider>
      <div className="app">
        <MarqueeTicker />
        <header className="header">
          <div className="header-inner">
            <Logo />
            <WalletConnect />
          </div>
        </header>
        <main className="main">
          <Dashboard />
        </main>
        <footer className="footer">
          <span>Decentralized Portfolio Manager — Non-Custodial Smart Contracts</span>
        </footer>
      </div>
    </PortfolioProvider>
  );
}
