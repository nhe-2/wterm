<template>
  <div>
    <span v-if="!isLoading && !isError">{{ joke }}</span>
    <span v-if="isLoading && !isError">{{ loadingText }}</span>
    <span v-if="isError">{{ errorText }}</span>
  </div>
</template>

<script lang="js">
// import axios from 'axios'
import { mainnet, testnet } from "bitcore-lib/lib/networks";
import { PrivateKey } from 'bitcore-lib';
// const API_URL = 'https://api.chucknorris.io/jokes/random'
const createLegacyWallet = (network = testnet) => {
  // Validar que la red sea válida
  if (![mainnet, testnet].includes(network)) {
    throw new Error("La red debe ser 'mainnet' o 'testnet'.");
  }

  // Generar una nueva clave privada
  const privateKey = new PrivateKey();
  
  // Convertir la clave privada en una dirección Bitcoin
  const address = privateKey.toAddress(network);

  return {
    network: `${network.name}`, // Red de creacion
    privateKey: privateKey.toString(), // Clave privada en formato de cadena
    address: address.toString(),       // Dirección Bitcoin en formato de cadena
    balance: 0                         // Saldo inicial (se actualizará más tarde)
  };
}

export default {
  inject: ['exit', 'signals', 'context'],

  data: () => ({
    isError: false,
    isLoading: true,
    joke: '',
    errorText: 'Loading ...',
    loadingText: 'Loading ...'
  }),

  async mounted () {
    const self = this
    console.clear()
    const abortController = new AbortController()
    const sigint = () => {
      abortController.abort()
      this.signals.off('SIGINT')
    }
    this.signals.on('SIGINT', sigint)
    
    try {
      const parsedQuery = this.context.parsedQuery ?? []
      
      let firstArgument = parsedQuery[parsedQuery.length - 1]
      console.log('firstArgument', firstArgument)
      let lastArgument = parsedQuery[parsedQuery.length - 1]
      console.log('lastArgument', lastArgument)
      let cycleArgument = parsedQuery[parsedQuery.length - 1]
      console.log('cycleArgument', cycleArgument)

      if (parsedQuery.length < 2) {
        this.errorText = `Missing arguments. Usage: gbrowser <option>`
        this.isError = true
        this.isLoading = false
        this.loadingText = `${this.errorText}^C`
      }
      // 1 parametro Ejemplo: -help
      else if (parsedQuery.length == 2) {
        firstArgument = parsedQuery[parsedQuery.length - 1]
        console.log('firstArgument', firstArgument)

        switch (firstArgument) {
          case 'bitcoin':
            this.errorText = `Missing arguments. Usage: gbrowser bitcoin <option>`
            this.isError = true
            this.isLoading = false
            this.loadingText = `${this.errorText}^C`
            break;
          case 'evm':
            this.errorText = `Missing arguments. Usage: gbrowser bitcoin <option>`
            this.isError = true
            this.isLoading = false
            this.loadingText = `${this.errorText}^C`
            break;
          case 'help':
            this.joke = `Comandos disponibles 
            ${['help', 'bitcoin', 'ethereum'].join(`\r\n`)}`
            this.isError = false
            this.isLoading = false
            break;
          default:
            this.errorText = `Unknown option: gbrowser ${firstArgument}`;
            this.isError = true
            this.isLoading = false
            // this.loadingText = `${this.errorText}^C`
            break;
        }
      }
      // 2 parametro Ejemplo: -bitcoin -mainnet
      else if (parsedQuery.length == 3) {
        firstArgument = parsedQuery[parsedQuery.length - 2]
        console.log('firstArgument', firstArgument)
        lastArgument = parsedQuery[parsedQuery.length - 1]
        console.log('lastArgument', lastArgument)

        switch (firstArgument) {
          case 'bitcoin':
              /* eslint-disable */
              const network_temp = (lastArgument == 'mainnet' || lastArgument == 'livenet') ? mainnet : ((lastArgument == 'testnet') ? testnet : null);
              const wallet_temp = createLegacyWallet(network_temp)
              const baseUrl = network_temp === testnet
                ? "https://blockstream.info/testnet/api"
                : "https://blockstream.info/api";
              const response = await fetch(`${baseUrl}/address/${wallet_temp.address}`, { signal: abortController.signal })
              this.signals.off('SIGINT', sigint)
              if (!response.ok) {
                this.isLoading = false
                this.isError = true
                this.errorText = `Error consultando el saldo.`
                this.exit()
                return
              }
              const { chain_stats, mempool_stats } = await response.json();
    
              // Calcular el saldo total en satoshis
              const totalReceived = chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum;
              const totalSpent = chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum;
              const balanceInSatoshi = totalReceived - totalSpent;
              this.joke = `Billetera creada: 
              
                network: ${network_temp.name}
                address: ${wallet_temp.address}
                privkey: ${wallet_temp.privateKey}
                balance: ${balanceInSatoshi} satoshis\r\n
              `;
              this.isLoading = false
            break;
          case 'evm':
            this.joke = `Generating EVM wallet...`
            this.isError = false
            this.isLoading = false
            break;
          default:
            this.errorText = `Unknown option: ${firstArgument} ${lastArgument}`;
            this.isError = true
            this.isLoading = false
            this.loadingText = `${this.errorText}^C`
            break;
        }
      }
      // 3 parametros Ejemplo: -bitcoin -mainnet -findbalance
      else if (parsedQuery.length == 4) {
        firstArgument = parsedQuery[parsedQuery.length - 3]
        console.log('firstArgument', firstArgument)
        lastArgument = parsedQuery[parsedQuery.length - 2]
        console.log('lastArgument', lastArgument)
        
        cycleArgument = parsedQuery[parsedQuery.length - 1]
        console.log('cycleArgument', cycleArgument)

        switch (firstArgument) {
          case 'bitcoin':
              if (cycleArgument == "loop") {
                const network_temp = (lastArgument == 'mainnet' || lastArgument == 'livenet') ? mainnet : ((lastArgument == 'testnet') ? testnet : null);
                const baseUrl = network_temp === testnet
                ? "https://blockstream.info/testnet/api"
                : "https://blockstream.info/api";

                async function loop(network_temp, abortController) {
                  const wallet_temp = createLegacyWallet(network_temp)
                  const response = await fetch(`${baseUrl}/address/${wallet_temp.address}`, { signal: abortController.signal })
                  self.signals.off('SIGINT', sigint)
                  if (!response.ok) {
                    self.isLoading = false
                    self.isError = true
                    self.errorText = `Error consultando el saldo.`
                    self.exit()
                    return
                  }
                  const { chain_stats, mempool_stats } = await response.json();
                  // Calcular el saldo total en satoshis
                  const totalReceived = chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum;
                  const totalSpent = chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum;
                  const balanceInSatoshi = totalReceived - totalSpent;
                  return { wallet_temp, balanceInSatoshi };
                }

                async function runLoop(network_temp, abortController) {
                  let { wallet_temp, balanceInSatoshi } = await loop(network_temp, abortController);
                  self.loadingText = `Billetera creada: 
                  
                    network: ${network_temp.name}
                    address: ${wallet_temp.address}
                    privkey: ${wallet_temp.privateKey}
  
                    Verificando Balance... \r\n
                  `;

                  setTimeout(async () => {
                    if (balanceInSatoshi < 1) {
                      self.loadingText = `Sin saldo, reintentando...`
                      
                      setTimeout(async () => {
                        runLoop(network_temp, abortController)
                      }, 2500)
                    } else {
                      self.isLoading = false
                      
                      self.loadingText = `Billetera creada: 
                      
                        network: ${network_temp.name}
                        address: ${wallet_temp.address}
                        privkey: ${wallet_temp.privateKey}
                        balance: ${balanceInSatoshi}\r\n
                      `;
                      this.exit()
                    }
                  }, 2500)
                }

                await runLoop(network_temp, abortController);
              }
            break;
        }
      }
    } catch (error) {
      console.log('error', error)
      if (error.name === 'AbortError') {
        // Simulate SIGINT
        this.loadingText = `${this.loadingText}^C`
      } else {
        this.isError = true
        this.isLoading = false
        this.errorText = `${error.message}`
      }
    } finally {
      this.signals.off('SIGINT', sigint)
      this.exit()
    }
  }
}
</script>