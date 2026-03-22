<template>
  <div class="safe-container">
    <nav>
      <div class="logo">🌿 OceanGuard DAO</div>
      <div class="nav-right">
        <router-link to="/" class="btn btn-outline" style="margin-right: 15px; text-decoration: none;">&larr; Back to Home</router-link>
        <button id="btn-connect" class="btn btn-outline" @click="connectWallet">
          {{ userAccount ? `${userAccount.substring(0,6)}...` : 'Connect Wallet' }}
        </button>
      </div>
    </nav>

    <div class="hero">
      <h1>Fund the Future of our Oceans</h1>
      <p>Your contribution directly supports verified non-profits cleaning the Pacific Ocean. All smart contracts are heavily audited and verified.</p>
      
      <div v-if="error" style="color: red; margin-bottom: 20px;">
        {{ error }}
      </div>

      <div class="card">
        <div style="font-size: 60px; margin-bottom: 20px;">🐋</div>
        <div class="stat"><span>Target Goal</span> <strong>100 AVAX</strong></div>
        <div class="stat"><span>Donated so far</span> <strong>45.2 AVAX</strong></div>
        
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Customize your donation below:</p>
        
        <div class="input-group">
          <label>Contribution (AVAX)</label>
          <input type="number" v-model="amount" step="0.001" min="0.001" class="form-input" />
        </div>
        
        <div class="input-group">
          <label>Encouragement Message</label>
          <input type="text" v-model="comment" placeholder="Save the turtles!" class="form-input" />
        </div>

        <button id="btn-donate" class="btn btn-primary" style="width: 100%; padding: 15px;" @click="donate">
          Donate {{ amount }} AVAX
        </button>
      </div>
      <p v-if="txHash" style="color: #059669; margin-top: 20px; font-weight: bold;">
        Transaction Sent! Hash: {{ txHash }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ethers } from 'ethers'
import { useWallet } from '../composables/useWallet'

const { userAccount, signer, connectWallet, error } = useWallet()

const SAFE_CONTRACT_ADDRESS = "0x70eFe282B5040a24d1c7C1b37C155d1cFC45b814"
const ABI = [
  { "inputs": [], "name": "depositar", "outputs": [], "stateMutability": "payable", "type": "function" }
]

const txHash = ref(null)
const amount = ref(0.001)
const comment = ref("")

const donate = async () => {
  if (!signer.value) {
    alert("Por favor conecta tu billetera primero.")
    return connectWallet()
  }

  try {
    const contract = new ethers.Contract(SAFE_CONTRACT_ADDRESS, ABI, signer.value)
    // Usamos gasLimit manual para evitar que ethers haga eth_estimateGas y aborte antes de abrir la wallet
    // Adicionalmente parseamos el monto elegido por el usuario
    const tx = await contract.depositar({ 
      value: ethers.utils.parseEther(amount.value.toString()), 
      gasLimit: 300000 
    })
    console.log("Tx enviada:", tx.hash)
    console.log("Mensaje de apoyo (off-chain):", comment.value)
    txHash.value = tx.hash
  } catch (err) {
    console.warn("Rechazado o error:", err)
    error.value = "Transaction rejected or failed."
  }
}
</script>

<style scoped>
.safe-container {
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%);
  color: #064e3b;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

nav {
  width: 100%;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  align-items: center;
}

.logo {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #047857;
}

.nav-right {
  display: flex;
  align-items: center;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-outline {
  background: transparent;
  border: 2px solid #059669;
  color: #059669;
}

.btn-outline:hover {
  background: rgba(5, 150, 105, 0.1);
}

.btn-primary {
  background: #059669;
  color: white;
  box-shadow: 0 4px 15px rgba(5, 150, 105, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(5, 150, 105, 0.6);
}

.hero {
  text-align: center;
  margin-top: 100px;
  max-width: 600px;
}

.hero h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 48px;
  margin: 0 0 20px 0;
  color: #064e3b;
}

.hero p {
  font-size: 18px;
  color: #047857;
  line-height: 1.6;
  margin-bottom: 40px;
}

.card {
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
  margin: 0 auto;
  width: 400px;
  box-sizing: border-box;
}

.stat {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 10px;
}

.stat span {
  color: #6b7280;
  font-weight: 600;
}

.stat strong {
  color: #111827;
  font-size: 18px;
}

/* Nuevos estilos input */
.input-group {
  display: flex;
  flex-direction: column;
  text-align: left;
  margin-bottom: 15px;
}

.input-group label {
  font-size: 13px;
  font-weight: 600;
  color: #064e3b;
  margin-bottom: 5px;
}

.form-input {
  padding: 12px;
  border: 1px solid #d1fae5;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Outfit', sans-serif;
  background: #f9fafb;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #059669;
}
</style>
