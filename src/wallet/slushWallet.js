// src/wallet/slushWallet.js

export const isSlushInstalled = () => {
    return typeof window !== 'undefined' && window.slush;
  };
  
  export const connectSlushWallet = async () => {
    if (!isSlushInstalled()) {
      throw new Error('Slush Wallet extension not installed');
    }
  
    const accounts = await window.slush.request({
      method: 'slush_requestAccounts'
    });
  
    if (!accounts || accounts.length === 0) {
      throw new Error('No Slush account found');
    }
  
    return accounts[0]; // address
  };
  