import { ref, shallowRef } from 'vue'
import { ethers } from 'ethers'

// Global state so connection persists across route changes
const userAccount = ref(null)
const provider = shallowRef(null)
const signer = shallowRef(null)
const error = ref(null)

export function useWallet() {
  const connectWallet = async () => {
    console.log("---- connectWallet Triggered ----")
    error.value = null
    
    if (typeof window.ethereum === 'undefined') {
      console.error("window.ethereum is undefined")
      error.value = "Please install a Web3 Wallet."
      return
    }

    try {
      // 1. Switch to Avalanche Fuji (Chain ID: 43113)
      console.log("1. Requesting wallet_switchEthereumChain to Avalanche Fuji...")
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa869' }] })
      console.log("--> wallet_switchEthereumChain succeeded.")
    } catch (switchError) {
      console.log("--> wallet_switchEthereumChain caught an error:", switchError)
      if (switchError.code === 4902) {
        try {
          // 1.b If missing, add Avalanche Fuji
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xa869',
              chainName: 'Avalanche Fuji Testnet',
              nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
              rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
              blockExplorerUrls: ['https://testnet.snowtrace.io/']
            }]
          })
        } catch (addError) {
          console.error("wallet_addEthereumChain Error:", addError)
          error.value = "Error adding Fuji Network to Wallet"
          return
        }
      } else {
        console.error("wallet_switchEthereumChain Error:", switchError)
        error.value = "Error switching to Fuji Network"
        return
      }
    }
    
    try {
      // 2. Obtain Ethers provider & signer (Ethers handles eth_requestAccounts internally on getSigner)
      console.log("2. Initializing Web3Provider (ethers v5 API)...")
      provider.value = new ethers.providers.Web3Provider(window.ethereum)
      
      console.log("3. Awaiting signer (should pop up Wallet)...")
      signer.value = await provider.value.getSigner()
      
      console.log("4. Getting address...")
      userAccount.value = await signer.value.getAddress()
      
      console.log("---- success! ---- Account:", userAccount.value)
    } catch (e) {
      console.error("--> Provider Error:", e)
      error.value = "User rejected or Provider error."
    }
  }

  return { userAccount, provider, signer, connectWallet, error }
}
