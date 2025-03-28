<template>
  <vue-command
    v-model:cursor-position="cursorPosition"
    v-model:dispatched-queries="dispatchedQueries"
    v-model:is-fullscreen="isFullscreen"
    v-model:history="history"
    v-model:history-position="historyPosition"
    v-model:query="query"
    :commands="commands"
    :font="font"
    :help-text="helpText"
    :help-timeout="helpTimeout"
    :hide-bar="hideBar"
    :hide-buttons="hideButtons"
    :hide-prompt="hidePrompt"
    :hide-title="hideTitle"
    :invert="invert"
    :prompt="prompt"
    :options-resolver="optionsResolver"
    :show-help="showHelp"
    :title="title" />
</template>

<script lang="js">
// import axios from 'axios'; // Para realizar solicitudes HTTP
import { ref } from 'vue'
import VueCommand from '@/components/VueCommand'
import {
  createStderr,
  createStdout,
  createQuery,
  listFormatter,
  newDefaultHistory,
  tableFormatter
} from '@/utils/library'
import NanoEditor from '@/components/NanoEditor.vue'
import ChuckNorris from '@/components/ChuckNorris.vue'
import GeneratorBrowser from '@/components/GeneratorBrowser.vue'
import VirtualGeneratorBrowser from '@/components/VirtualGeneratorBrowser.vue'

// import { PrivateKey } from 'bitcore-lib';
// import { mainnet, testnet } from "bitcore-lib/lib/networks";

const getUA = () => {
    let device = "Unknown";
    const ua = {
        "Generic Linux": /Linux/i,
        "Android": /Android/i,
        "BlackBerry": /BlackBerry/i,
        "Bluebird": /EF500/i,
        "Chrome OS": /CrOS/i,
        "Datalogic": /DL-AXIS/i,
        "Honeywell": /CT50/i,
        "iPad": /iPad/i,
        "iPhone": /iPhone/i,
        "iPod": /iPod/i,
        "macOS": /Macintosh/i,
        "Windows": /IEMobile|Windows/i,
        "Zebra": /TC70|TC55/i,
    }
    Object.keys(ua).map(v => navigator.userAgent.match(ua[v]) && (device = v));
    return device;
}

// const PROMPT = 'user@nhe2-terminal~$'
const PROMPT = `nhe2@${getUA()}~$`

// const createLegacyWallet = (network = testnet) => {
//   // Validar que la red sea válida
//   if (![mainnet, testnet].includes(network)) {
//     throw new Error("La red debe ser 'mainnet' o 'testnet'.");
//   }

//   // Generar una nueva clave privada
//   const privateKey = new PrivateKey();
  
//   // Convertir la clave privada en una dirección Bitcoin
//   const address = privateKey.toAddress(network);

//   return {
//     network: `${network.name}`, // Red de creacion
//     privateKey: privateKey.toString(), // Clave privada en formato de cadena
//     address: address.toString(),       // Dirección Bitcoin en formato de cadena
//     balance: 0                         // Saldo inicial (se actualizará más tarde)
//   };
// }

// const getBalance = async (address, network = testnet) => {
//   console.log('getBalance', network)
//   const baseUrl = network === testnet
//     ? "https://blockstream.info/testnet/api"
//     : "https://blockstream.info/api";

//   try {
//     // Consultar la API para obtener los detalles de la dirección
//     const response = await axios.get(`${baseUrl}/address/${address}`);
//     const { chain_stats, mempool_stats } = response.data;

//     // Calcular el saldo total en satoshis
//     const totalReceived = chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum;
//     const totalSpent = chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum;
//     const balance = totalReceived - totalSpent;

//     return balance; // Saldo en satoshis
//   } catch (error) {
//     throw new Error(`Error al obtener el saldo: ${error.message}`);
//   }
// }

export default {
  components: {
    VueCommand
  },

  methods: {
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  },

  setup () {
    // let self = this;
    const cursorPosition = ref(0)
    const dispatchedQueries = ref(new Set())
    const font = ref('')
    const helpText = ref('Type in help')
    const helpTimeout = ref(3500)
    const hideBar = ref(true)
    const hideButtons = ref(true)
    const hidePrompt = ref(false)
    const hideTitle = ref(true)
    const history = ref(newDefaultHistory())
    const historyPosition = ref(0)
    const invert = ref(false)
    const isFullscreen = ref(true)
    const prompt = ref(PROMPT)
    const query = ref('')
    const showHelp = ref(true)
    const title = ref('nhe2-terminal - 720x350')

    const optionsResolver = (program, parsedQuery, setQuery) => {
      const lastArgument = parsedQuery[parsedQuery.length - 1]

      switch (program) {
        case 'cd':
          switch (parsedQuery.length) {
            case 0:
              break

            case 1:
              setQuery('cd home')
              break

            default:
              if ('home'.startsWith(lastArgument) && lastArgument !== 'home') {
                setQuery('cd home')
              }
              break
          }
          break
        
        case 'gbrowser':
          if (parsedQuery.length === 1) {
            setQuery('gbrowser help');
          } 
          else if (parsedQuery.length === 2) {
            if ('help'.startsWith(parsedQuery.at(-1))) {
              setQuery('gbrowser help');
            } 
            else if ('bitcoin'.startsWith(parsedQuery.at(-1))) {
              setQuery('gbrowser bitcoin');
            } 
            else if ('ethereum'.startsWith(parsedQuery.at(-1))) {
              setQuery('gbrowser ethereum');
            }
          } 
          else if (parsedQuery.length === 3) {
            if ('mainnet'.startsWith(parsedQuery.at(-1))) {
              setQuery('gbrowser bitcoin mainnet');
            } 
            else {
              setQuery('gbrowser bitcoin testnet');
            }
          }
          else if (parsedQuery.length === 4) {
            if ('findbalance'.startsWith(parsedQuery.at(-1))) {
              setQuery('gbrowser bitcoin testnet findbalance');
            }
          }
          break;
        
      }
    }

    const commands = {
      reboot: () => {
        location.reload()
      },
      vgbrowser: () => GeneratorBrowser,
      gbrowser: () => VirtualGeneratorBrowser,

      // cd: parsedQuery => {
      //   if (parsedQuery.length < 2 || parsedQuery[parsedQuery.length - 1] === '.') {
      //     return createQuery()
      //   }

      //   const lastArgument = parsedQuery[parsedQuery.length - 1]

      //   if (lastArgument === 'home') {
      //     prompt.value = `${PROMPT}/home`
      //   }
      //   if ((lastArgument === '../' || lastArgument === '..') && prompt.value === `${PROMPT}/home`) {
      //     prompt.value = `${PROMPT}`
      //   }
      //   if (lastArgument !== 'home' && lastArgument !== '../' && lastArgument !== '..') {
      //     return createStderr(`bash: cd: ${lastArgument}: No such file or directory`)
      //   }

      //   return createQuery()
      // },

      clear: () => {
        // "splice" is necessary since Vue.js losses its reactivity if array is
        // set to empty
        history.value.splice(0, history.value.length)
        return createQuery()
      },

      // 'hello-world': () => {
      //   return createStdout('Hello world')
      // },

//       'copyright': () => {
//         return createStdout(`Windows PowerShell
// Copyright (C) Microsoft Corporation. Todos los derechos reservados.

// Instale la versión más reciente de PowerShell para obtener nuevas características y mejoras. https://aka.ms/PSWindows

// `)
//       },

      history: () => {
        const history = []
        for (const [index, entry] of [...dispatchedQueries.value].entries()) {
          history.push([index, entry])
        }

        return createStdout(tableFormatter(history))
      },

      nano: () => NanoEditor,
      norris: () => ChuckNorris,

      'set-font': parsedQuery => {
        if (parsedQuery.length < 2) {
          return createStderr('Missing font')
        }

        const match = parsedQuery.at(1)
        if (match) {
          font.value = match.replace(/['"]+/g, '')
          return createQuery()
        }

        return createStderr('Missing font')
      }
    }
    commands.help = () => {
      const list = Object.keys(commands)
      // TODO: Create terminal-like columns
      return createStdout(listFormatter(...list))
    }

    return {
      commands,

      cursorPosition,
      dispatchedQueries,
      helpText,
      helpTimeout,
      hideBar,
      hideButtons,
      hidePrompt,
      hideTitle,
      history,
      historyPosition,
      invert,
      isFullscreen,
      prompt,
      query,
      showHelp,
      title,
      font,

      optionsResolver
    }
  }
}
</script>

<style lang="scss">

body {
  margin: 0;
  width: calc(100vw);
  height: calc(100vh);
}
.vue-command {
  background-color: #000;
  height: calc(100vh);
  overflow: hidden;
}

@media (min-width: 1200px) {
  .container {
    max-width: 720px;
  }
}

.vue-command,
.vue-command--invert {
  width: 100%;
  //height: 100%;
  // position: relative;


  ::-webkit-scrollbar {
    width: 6px;
  }

  .vue-command__bar,
  .vue-command__bar--invert {
    border-top-right-radius: 6px;
    border-top-left-radius: 6px;
  }

  .vue-command__history,
  .vue-command__history--invert {
    min-height: 350px;
    // height: 100%;
    border-bottom-right-radius: 6px;
    border-bottom-left-radius: 6px;
    // position: fixed;
    // top: 0;
    // left: 0;
    // right: 0;
    // border: 0;
    background-color: rgb(1,36,86);
  }
}

.vue-command {
  ::-webkit-scrollbar-track {
    background: #252525;
  }

  ::-webkit-scrollbar-thumb {
    background: #f1f1f1;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #333;
  }
}

.vue-command--invert {
  ::-webkit-scrollbar-track {
    background: #dadada;
  }

  ::-webkit-scrollbar-thumb {
    background: #0e0e0e;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #cccccc;
  }
}
</style>