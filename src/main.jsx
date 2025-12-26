
import React from "react";
import "./index.css";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';

// Global Error Boundary
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // Optionally log error to external service
    // console.error("Global Error Boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#1a1a1a', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: '#ff5555', fontSize: 32 }}>Something went wrong.</h1>
          <pre style={{ color: '#ffb86c', marginTop: 16, maxWidth: 600, whiteSpace: 'pre-wrap', textAlign: 'left' }}>
            {this.state.error?.toString()}
            {this.state.errorInfo?.componentStack}
          </pre>
          <div style={{ marginTop: 32, color: '#888', fontSize: 14 }}>The UI crashed, but the app is still running.<br/>Please check the error above and fix the root cause.</div>
        </div>
      );
    }
    return this.props.children;
  }
}


const queryClient = new QueryClient();
const networkConfig = {
  testnet: { url: getFullnodeUrl('testnet') },
};

const slushWallet = {
  name: 'Slush',
  // Optionally, you can add icon, url, and other metadata here
  // iconUrl: '...',
  // url: '...',
  // id: 'slush',
};

const root = document.getElementById("root");
ReactDOM.createRoot(root).render(
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider features={['sui:signAndExecuteTransaction', 'sui:signMessage']} wallets={[slushWallet]}>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);
