<template>
  <div>
    <span v-if="!isLoading && !isError">{{ joke }}</span>
    <span v-if="isLoading && !isError">{{ loadingText }}</span>
    <span v-if="isError">{{ errorText }}</span>
  </div>
</template>

<script lang="js">
/* eslint-disable */
import { mainnet, testnet } from "bitcore-lib/lib/networks";
import { PrivateKey } from 'bitcore-lib';
import { ethers } from 'ethers';
import { createLegacyWalletBTC, createLegacyWalletEVM, getBalanceEVM, rpcsEVM } from "@/utils/helper-nhe2";
import {  } from "@/utils/helper-eth";

export default {
  inject: ['exit', 'signals', 'context'],

  data: () => ({
    isError: false,
    isLoading: true,
    joke: '',
    errorText: 'Cargando ...',
    loadingText: 'Cargando ...',
    abortController: null,
    loopActive: false,
  }),

  methods: {
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    sigint() {
        this.abortController.abort()
        this.signals.off('SIGINT', this.sigint)
        this.exit()
        this.loopActive = false
        this.abortController = new AbortController()
    },

    async loop(network_temp) {
        let self = this
        const baseUrl = network_temp === testnet ? "https://blockstream.info/testnet/api" : "https://blockstream.info/api";
        const wallet_temp = createLegacyWalletBTC(network_temp)
        const response = await fetch(`${baseUrl}/address/${wallet_temp.address}`, { signal: self.abortController.signal })
        if (!response.ok) {
            self.loadingText = `Error consultando el saldo.`
            return { wallet_temp, balanceInSatoshi: 0 }
        }
        const { chain_stats, mempool_stats } = await response.json();
        const totalReceived = chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum;
        const totalSpent = chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum;
        const balanceInSatoshi = totalReceived - totalSpent;
        return { wallet_temp, balanceInSatoshi };
    },

    async runner(network_temp) {
        let self = this
        try {
          const { wallet_temp, balanceInSatoshi } = await self.loop(network_temp)
          await self.sleep(100)
          if (balanceInSatoshi < 1 && self.loopActive == true) {
              self.loadingText = `Billetera creada:
              network: ${network_temp.name}
              address: ${wallet_temp.address}
              privkey: ${wallet_temp.privateKey}
              balance: ${balanceInSatoshi} shatoshis

              Sin saldo, reintentando...\r\n
              `;
              self.runner(network_temp)
          } else {
              self.isLoading = false
              self.loadingText = `Billetera creada:
              network: ${network_temp.name}
              address: ${wallet_temp.address}
              privkey: ${wallet_temp.privateKey}
              balance: ${balanceInSatoshi} shatoshis\r\n
              `;
          }
        } catch (error) {
          console.log("error runner: ", error, error.message)
          console.error(error)
        }
    },

    async loopEVM(network_temp) {
      let self = this
      
      try {
        const wallet_temp = createLegacyWalletEVM(network_temp);
        const provider = new ethers.JsonRpcProvider(rpcsEVM[network_temp]);
        const balanceInWei = await provider.getBalance(wallet_temp.address);
        return { wallet_temp, balanceInWei };
      } catch (error) {
        console.log('error loop evm', error)
        // throw new Error(`Error al obtener el saldo: ${error.message}`);
        return { wallet_temp, balanceInWei: 0 }
      }
    },
    async runnerEVM(network_temp) {
        let self = this
        try {
          const { wallet_temp, balanceInWei } = await self.loopEVM(network_temp)
          await self.sleep(100)
          if (balanceInWei < 1 && self.loopActive == true) {
              self.loadingText = `Billetera creada:
              network: ${network_temp}
              address: ${wallet_temp.address}
              privkey: ${wallet_temp.privateKey}
              balance: ${balanceInWei} Wei

              Sin saldo, reintentando...\r\n
              `;
              self.runnerEVM(network_temp)
          } else {
              self.isLoading = false
              self.loadingText = `Billetera creada:
              network: ${network_temp}
              address: ${wallet_temp.address}
              privkey: ${wallet_temp.privateKey}
              balance: ${balanceInWei} Wei\r\n
              `;
          }
        } catch (error) {
          console.log("error runnerEVM: ", error, error.message)
          console.error(error)
        }
    },
  },

  async mounted () {
    const self = this
    self.abortController = new AbortController()
    self.signals.on('SIGINT', self.sigint)

    try {
      const parsedQuery = this.context.parsedQuery ?? []
      let firstArgument = parsedQuery[parsedQuery.length - 1]
      let lastArgument = parsedQuery[parsedQuery.length - 1]
      let cycleArgument = parsedQuery[parsedQuery.length - 1]
      let limitArgument = parsedQuery[parsedQuery.length - 1]
      if (parsedQuery.length < 2) {
        this.errorText = `Argumentos faltantes. Uso: gbrowser <opción>`
        this.isError = true
        this.isLoading = false
        this.loadingText = `${this.errorText}^C`
        this.signals.off('SIGINT', this.sigint)
        this.exit()
      }
      // 1 parametro Ejemplo: gbrowser help
      else if (parsedQuery.length == 2) {
        firstArgument = parsedQuery[parsedQuery.length - 1]
        switch (firstArgument) {
          case 'bitcoin':
            this.errorText = `Argumentos faltantes. Uso: gbrowser bitcoin <network>`
            this.isError = true
            this.isLoading = false
            this.loadingText = `${this.errorText}^C`
            this.signals.off('SIGINT', this.sigint)
            this.exit()
            break;
          case 'evm':
              this.errorText = `Argumentos faltantes. Uso: gbrowser evm <network>`
              this.isError = true
              this.isLoading = false
              this.loadingText = `${this.errorText}^C`
              this.signals.off('SIGINT', this.sigint)
              this.exit()
            break;
          case 'help':
            this.joke = `Comandos disponibles
            ${['gbrowser help', 'gbrowser bitcoin <network>', 'gbrowser evm <network>'].join(`\r\n`)}`
            this.isError = false
            this.isLoading = false
            this.signals.off('SIGINT', this.sigint)
            this.exit()
            break;
          default:
            this.errorText = `Opción desconocida: gbrowser ${firstArgument}`;
            this.isError = true
            this.isLoading = false
            this.signals.off('SIGINT', this.sigint)
            this.exit()
            break;
        }
      }
      // 2 parametro Ejemplo: -bitcoin -testnet
      else if (parsedQuery.length == 3) {
        firstArgument = parsedQuery[parsedQuery.length - 2]
        lastArgument = parsedQuery[parsedQuery.length - 1]

        switch (firstArgument) {
          case 'bitcoin':
            if (lastArgument == "help") {
              self.joke = `Redes disponibles
              mainnet / livenet
              testnet
              `
              self.isLoading = false
              this.signals.off('SIGINT', this.sigint)
              this.exit()
              return;
            }

              const network_temp = (lastArgument == 'mainnet' || lastArgument == 'livenet') ? mainnet : ((lastArgument == 'testnet') ? testnet : null);
              const wallet_temp = createLegacyWalletBTC(network_temp)
              const baseUrl = network_temp === testnet
                ? "https://blockstream.info/testnet/api"
                : "https://blockstream.info/api";
              const response = await fetch(`${baseUrl}/address/${wallet_temp.address}`, { signal: self.abortController.signal })
              if (!response.ok) {
                self.isLoading = false
                self.isError = true
                self.errorText = `Error consultando el saldo.`
                this.signals.off('SIGINT', this.sigint)
                this.exit()
                return
              }
              const { chain_stats, mempool_stats } = await response.json();

              // Calcular el saldo total en satoshis
              const totalReceived = chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum;
              const totalSpent = chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum;
              const balanceInSatoshi = totalReceived - totalSpent;
              self.joke = `Billetera creada:
                network: ${network_temp.name}
                address: ${wallet_temp.address}
                privkey: ${wallet_temp.privateKey}
                balance: ${balanceInSatoshi} satoshis\r\n
              `;
              self.isLoading = false
              this.signals.off('SIGINT', this.sigint)
              this.exit()
            break;
          case 'evm':
            if (lastArgument == "help") {
              self.joke = `Redes disponibles
              ethereum
              bscmainnet
              `
              self.isLoading = false
              this.signals.off('SIGINT', this.sigint)
              this.exit()
              return;
            }
              firstArgument = parsedQuery[parsedQuery.length - 2]
              lastArgument = parsedQuery[parsedQuery.length - 1]
              const network = lastArgument
              const wallet_temp2 = createLegacyWalletEVM(network);
              const {balance,txCount} = await getBalanceEVM(wallet_temp2.address, network);
              self.joke = `Billetera creada:
                network: ${network}
                address: ${wallet_temp2.address}
                mnemonic: ${wallet_temp2.mnemonic}
                privkey: ${wallet_temp2.privateKey}
                txCount: ${txCount}
                balance: ${balance} Wei\r\n
              `;
              self.isLoading = false
              this.signals.off('SIGINT', this.sigint)
              this.exit()
            break;
          default:
            this.errorText = `Unknown option: ${firstArgument} ${lastArgument}`;
            this.isError = true
            this.isLoading = false
            this.loadingText = `${this.errorText}^C`
            this.signals.off('SIGINT', this.sigint)
            this.exit()
            break;
        }
      }
      // 3 parametros Ejemplo: -bitcoin -testnet -findbalance
      else if (parsedQuery.length == 4) {
        firstArgument = parsedQuery[parsedQuery.length - 3]
        lastArgument = parsedQuery[parsedQuery.length - 2]
        cycleArgument = parsedQuery[parsedQuery.length - 1]
        switch (firstArgument) {
          case 'bitcoin':
              if (cycleArgument == "findbalance") {
                const network_temp = (lastArgument == 'mainnet' || lastArgument == 'livenet') ? mainnet : ((lastArgument == 'testnet') ? testnet : null);
                const baseUrl = network_temp === testnet ? "https://blockstream.info/testnet/api" : "https://blockstream.info/api";
                try {
                  self.loopActive = true
                  const result = await new Promise(resolve => self.runner(network_temp));
                } catch (error) {
                  console.log("error loop: ", error)                  
                  console.error(error)                  
                }
              }
              else if (cycleArgument == 'help') {
                self.joke = `Otros comandos
                findbalance
                `
                self.isLoading = false
                this.signals.off('SIGINT', this.sigint)
                this.exit()
                return;
                // this.signals.off('SIGINT', this.sigint)
                // this.exit()
              }
              this.signals.off('SIGINT', this.sigint)
              this.exit()
            break;
          case 'evm':
              if (cycleArgument == "findbalance") {
                try {
                  self.loopActive = true
                  const result = await new Promise(resolve => self.runnerEVM(lastArgument));
                  console.log('result', result)
                } catch (error) {
                  console.log("error loop: ", error)                  
                  console.error(error)                  
                }
              }
              else if (cycleArgument == 'help') {
                self.joke = `Otros comandos
                findbalance
                `
                self.isLoading = false
                this.signals.off('SIGINT', this.sigint)
                this.exit()
                return;
                // this.signals.off('SIGINT', this.sigint)
                // this.exit()
              }
              this.signals.off('SIGINT', this.sigint)
              this.exit()
            break;
          default:
            this.loadingText = `${this.loadingText}^C`
            this.signals.off('SIGINT', this.sigint)
            this.exit()
            break;
        }
      } 
      else {
        console.log("otros parametros", parsedQuery.length, parsedQuery)
        this.loadingText = `${this.loadingText}^C`
        this.errorText = `Opción desconocida: gbrowser ${firstArgument}`;
        this.isError = true
        this.isLoading = false
        this.signals.off('SIGINT', this.sigint)
        this.exit()
      }
    } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Simulate SIGINT')
            // Simulate SIGINT
            this.loadingText = `${this.loadingText}^C`
        } else {
            console.error(error)
            console.log('error', error)
            this.isError = true
            this.isLoading = false
            this.errorText = `${error.message}`
        }
    } finally {
        // this.signals.off('SIGINT', this.sigint)
        // this.exit()
    }
  }
}
</script>