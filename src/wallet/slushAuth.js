// src/wallet/slushAuth.js

export const signSlushMessage = async (address) => {
    const message = `ChainHunter Login\nAddress: ${address}\nTime: ${Date.now()}`;
  
    const signature = await window.slush.request({
      method: 'slush_signMessage',
      params: { message, address }
    });
  
    return { message, signature };
  };
  