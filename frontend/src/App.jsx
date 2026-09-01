import { PortfolioProvider } from "./hooks/usePortfolio";
import { ToastProvider } from "./components/shared/Toast";
import WalletConnect from "./components/WalletConnect";
import Dashboard from "./components/Dashboard";
import Logo from "./components/Logo";
import MarqueeTicker from "./components/MarqueeTicker";
import "./index.css";

export default function App() {
  return (
    <PortfolioProvider>
      <ToastProvider>
        <div className="app">
          <MarqueeTicker />
          <header className="header" role="banner">
            <div className="header-inner">
              <Logo />
              <div className="wallet-connect-area">
                <WalletConnect />
              </div>
            </div>
          </header>
          <main className="main" role="main">
            <Dashboard />
          </main>
          <footer className="footer" role="contentinfo">
            <span>Decentralized Portfolio Manager — Non-Custodial Smart Contracts on Optimism</span>
          </footer>
        </div>
      </ToastProvider>
    </PortfolioProvider>
  );
}
