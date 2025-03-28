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
    loadingText: 'Loading ...',
    abortController: null,
    loopActive: false,
  }),

  methods: {
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    sigint() {
        this.abortController.abort()
        this.signals.off('SIGINT')
        this.loopActive = false
      
        // this.signals.off('SIGINT', self.sigint)
        this.exit()
    },

    async runLoop(network_temp) {
        let self = this
        let { wallet_temp, balanceInSatoshi } = await self.loop(network_temp, self.abortController);
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
            self.runLoop(network_temp, self.abortController)
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
    },

    async loop(network_temp) {
        let self = this
        const baseUrl = network_temp === testnet ? "https://blockstream.info/testnet/api" : "https://blockstream.info/api";
        const wallet_temp = createLegacyWallet(network_temp)
        const response = await fetch(`${baseUrl}/address/${wallet_temp.address}`, { signal: self.abortController.signal })
        if (!response.ok) {
            self.loadingText = `Error consultando el saldo.`
            return { wallet_temp, balanceInSatoshi: 0 }
        }
        const { chain_stats, mempool_stats } = await response.json();
        // Calcular el saldo total en satoshis
        const totalReceived = chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum;
        const totalSpent = chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum;
        const balanceInSatoshi = totalReceived - totalSpent;
        return { wallet_temp, balanceInSatoshi };
    },

    async runner(network_temp) {
        let self = this
        console.log('promise')
        // for (let i = 0; (i < limit && self.loopActive == true); i++) {
        //     console.log(`for ${i}`)
        //     self.loadingText = `for ${i}`
        //     // const loopResponse = await self.loop(network_temp)
        //     // console.log('loopResponse', loopResponse)
        //     await self.sleep(100)
        // }
        const { wallet_temp, balanceInSatoshi } = await self.loop(network_temp)
        console.log('loopResponse', wallet_temp, balanceInSatoshi)
        await self.sleep(100)
        
        if (balanceInSatoshi < 1) {
            self.loadingText = `Billetera creada: 
            
            network: ${network_temp.name}
            address: ${wallet_temp.address}
            privkey: ${wallet_temp.privateKey}
            balance: ${balanceInSatoshi}

            Sin saldo, reintentando...\r\n
            `;
            //   await new Promise(setTimeout(async () => {
            //         const { wallet_temp, balanceInSatoshi } = await self.loop(network_temp)
            //         console.log('loopResponse', wallet_temp, balanceInSatoshi)
            //         await self.sleep(100)
            //   }, 500));
            await self.sleep(1000)
            self.runner(network_temp)
        } else {
            self.isLoading = false
            self.loadingText = `Billetera creada: 
            
            network: ${network_temp.name}
            address: ${wallet_temp.address}
            privkey: ${wallet_temp.privateKey}
            balance: ${balanceInSatoshi}\r\n
            `;
        }
        console.log('promise end')
    },
  },

  async mounted () {
    const self = this
    console.clear()
    self.abortController = new AbortController()
    // const sigint = () => {
    //   abortController.abort()
    //   this.signals.off('SIGINT')
    // }
    self.signals.on('SIGINT', self.sigint)
    
    try {
      const parsedQuery = this.context.parsedQuery ?? []
      
      let firstArgument = parsedQuery[parsedQuery.length - 1]
      console.log('firstArgument', firstArgument)
      let lastArgument = parsedQuery[parsedQuery.length - 1]
      console.log('lastArgument', lastArgument)
      let cycleArgument = parsedQuery[parsedQuery.length - 1]
      console.log('cycleArgument', cycleArgument)
      let limitArgument = parsedQuery[parsedQuery.length - 1]
      console.log('limitArgument', limitArgument)

      if (parsedQuery.length < 2) {
        this.errorText = `Missing arguments. Usage: gbrowser <option>`
        this.isError = true
        this.isLoading = false
        this.loadingText = `${this.errorText}^C`
        
        self.signals.off('SIGINT', self.sigint)
        self.exit()
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

        self.signals.off('SIGINT', self.sigint)
        self.exit()
      }
      // 2 parametro Ejemplo: -bitcoin -testnet
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
              const response = await fetch(`${baseUrl}/address/${wallet_temp.address}`, { signal: self.abortController.signal })
            //   this.signals.off('SIGINT', self.sigint)
              if (!response.ok) {
                self.isLoading = false
                self.isError = true
                self.errorText = `Error consultando el saldo.`
                // self.signals.off('SIGINT', self.sigint)
                self.exit()
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
        
        self.signals.off('SIGINT', self.sigint)
        self.exit()
      }
      // 3 parametros Ejemplo: -bitcoin -testnet -findbalance
      else if (parsedQuery.length == 4) {
        firstArgument = parsedQuery[parsedQuery.length - 3]
        console.log('firstArgument', firstArgument)
        lastArgument = parsedQuery[parsedQuery.length - 2]
        console.log('lastArgument', lastArgument)
        
        cycleArgument = parsedQuery[parsedQuery.length - 1]
        console.log('cycleArgument', cycleArgument)

        switch (firstArgument) {
          case 'bitcoin':
              if (cycleArgument == "findbalance") {
                console.log('findbalance')
                const network_temp = (lastArgument == 'mainnet' || lastArgument == 'livenet') ? mainnet : ((lastArgument == 'testnet') ? testnet : null);
                const baseUrl = network_temp === testnet ? "https://blockstream.info/testnet/api" : "https://blockstream.info/api";
                console.log('baseUrl', baseUrl)
                
                self.loopActive = true
                const result = await new Promise(resolve => self.runner(network_temp));
                console.log('result', result)

                self.signals.off('SIGINT', self.sigint)
                self.exit()

                // do {
                //     // await runLoop(network_temp, abortController);
                //     console.log(`.`)
                    
                // } 
                // while (self.loopActive)
              }
            break;
        }
      }
    //   else if (parsedQuery.length == 5) {
    //     firstArgument = parsedQuery[parsedQuery.length - 4]
    //     console.log('firstArgument', firstArgument)
    //     lastArgument = parsedQuery[parsedQuery.length - 3]
    //     console.log('lastArgument', lastArgument)
        
    //     cycleArgument = parsedQuery[parsedQuery.length - 2]
    //     console.log('cycleArgument', cycleArgument)

    //     limitArgument = parsedQuery[parsedQuery.length - 1]
    //     console.log('limitArgument', limitArgument)

    //     switch (firstArgument) {
    //       case 'bitcoin':
    //           if (cycleArgument == "loop") {
    //             const network_temp = (lastArgument == 'mainnet' || lastArgument == 'livenet') ? mainnet : ((lastArgument == 'testnet') ? testnet : null);
    //             const baseUrl = network_temp === testnet
    //             ? "https://blockstream.info/testnet/api"
    //             : "https://blockstream.info/api";

    //             async function loop(network_temp, abortController) {
    //               const wallet_temp = createLegacyWallet(network_temp)
    //               const response = await fetch(`${baseUrl}/address/${wallet_temp.address}`, { signal: abortController.signal })
    //               self.signals.off('SIGINT', sigint)
    //               if (!response.ok) {
    //                 self.isLoading = false
    //                 self.isError = true
    //                 self.errorText = `Error consultando el saldo.`
    //                 self.exit()
    //                 return
    //               }
    //               const { chain_stats, mempool_stats } = await response.json();
    //               // Calcular el saldo total en satoshis
    //               const totalReceived = chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum;
    //               const totalSpent = chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum;
    //               const balanceInSatoshi = totalReceived - totalSpent;
    //               return { wallet_temp, balanceInSatoshi };
    //             }

    //             async function runLoop(network_temp, abortController) {
    //               let { wallet_temp, balanceInSatoshi } = await loop(network_temp, abortController);
    //               self.loadingText = `Billetera creada: 
                  
    //                 network: ${network_temp.name}
    //                 address: ${wallet_temp.address}
    //                 privkey: ${wallet_temp.privateKey}
  
    //                 Verificando Balance... \r\n
    //               `;

    //               setTimeout(async () => {
    //                 if (balanceInSatoshi < 1) {
    //                   self.loadingText = `Sin saldo, reintentando...`
                      
    //                   setTimeout(async () => {
    //                     runLoop(network_temp, abortController)
    //                   }, 2500)
    //                 } else {
    //                   self.isLoading = false
                      
    //                   self.loadingText = `Billetera creada: 
                      
    //                     network: ${network_temp.name}
    //                     address: ${wallet_temp.address}
    //                     privkey: ${wallet_temp.privateKey}
    //                     balance: ${balanceInSatoshi}\r\n
    //                   `;
    //                   this.exit()
    //                 }
    //               }, 2500)
    //             }

    //             await runLoop(network_temp, abortController);
    //           }
    //         break;
    //     }
    //   }
    } catch (error) {
        if (error.name === 'AbortError') {
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
    }
  }
}
</script>