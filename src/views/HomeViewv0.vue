<template>
  <div class="terminal">
  </div>
</template>

<style>
body {
  margin: 0;
  width: calc(100vw);
  height: calc(100vh);
}
.terminal {
  background-color: #000;
  height: calc(100vh);
  overflow: hidden;
}
</style>

<script>
import { Terminal } from '@xterm/xterm';
// import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css'

import { mainnet } from 'bitcore-lib/lib/networks';
import { createLegacyWallet, getBalance } from '@/utils/helper-btc';
import { createLegacyWalletETH, getBalanceETH } from '@/utils/helper-eth';

import { setupSerialConnection } from 'simple-web-serial';

export default {
  data() {
    let self = this
    return {
      baseTheme: {
        foreground: '#F8F8F8',
        background: '#2D2E2C',
        selection: '#5DA5D533',
        black: '#1E1E1D',
        brightBlack: '#262625',
        red: '#CE5C5C',
        brightRed: '#FF7272',
        green: '#5BCC5B',
        brightGreen: '#72FF72',
        yellow: '#CCCC5B',
        brightYellow: '#FFFF72',
        blue: '#5D5DD3',
        brightBlue: '#7279FF',
        magenta: '#BC5ED1',
        brightMagenta: '#E572FF',
        cyan: '#5DA5D5',
        brightCyan: '#72F0FF',
        white: '#F8F8F8',
        brightWhite: '#FFFFFF'
      },
      otherTheme: {
        foreground: '#eff0eb',
        background: '#282a36',
        selection: '#97979b33',
        black: '#282a36',
        brightBlack: '#686868',
        red: '#ff5c57',
        brightRed: '#ff5c57',
        green: '#5af78e',
        brightGreen: '#5af78e',
        yellow: '#f3f99d',
        brightYellow: '#f3f99d',
        blue: '#57c7ff',
        brightBlue: '#57c7ff',
        magenta: '#ff6ac1',
        brightMagenta: '#ff6ac1',
        cyan: '#9aedfe',
        brightCyan: '#9aedfe',
        white: '#f1f1f0',
        brightWhite: '#eff0eb'
      },
      isBaseTheme: true,
      term: null,
      isWebglEnabled: false,
      fitAddon: null,
      history: {
        commands: [],
      },
      historySelected: null,
      command: '',
      commands: {
        help: {
          f: () => {
            const padding = 10;
            function formatMessage(name, description) {
              const maxLength = self.term.cols - padding - 3;
              let remaining = description;
              const d = [];
              while (remaining.length > 0) {
                // Trim any spaces left over from the previous line
                remaining = remaining.trimStart();
                // Check if the remaining text fits
                if (remaining.length < maxLength) {
                  d.push(remaining);
                  remaining = '';
                } else {
                  let splitIndex = -1;
                  // Check if the remaining line wraps already
                  if (remaining[maxLength] === ' ') {
                    splitIndex = maxLength;
                  } else {
                    // Find the last space to use as the split index
                    for (let i = maxLength - 1; i >= 0; i--) {
                      if (remaining[i] === ' ') {
                        splitIndex = i;
                        break;
                      }
                    }
                  }
                  d.push(remaining.substring(0, splitIndex));
                  remaining = remaining.substring(splitIndex);
                }
              }
              const message = (
                `  \x1b[36;1m${name.padEnd(padding)}\x1b[0m ${d[0]}` +
                d.slice(1).map(e => `\r\n  ${' '.repeat(padding)} ${e}`)
              );
              return message;
            }
            self.term.writeln([
              '¡Bienvenido a WGTerminal! Prueba algunos de los comandos a continuación.',
              '',
              ...Object.keys(self.commands).map(e => formatMessage(e, self.commands[e].description))
            ].join('\n\r'));
            self.prompt(self.term);
          },
          description: 'Historial de comandos ingresados disponible',
        },
        history: {
          f: () => {
            let self = this
            // const limit = -1;
            console.log('historial de comandos')
            console.log(self.history.commands)

            if (self.history.commands.length > 0) {
              self.term.writeln(self.history.commands.join('\n\r'));
            }

            self.prompt(self.term);
          },
          description: 'Imprime este mensaje de ayuda',
        },
        reboot: {
          f: () => {
            location.reload()
          },
          description: 'Reinicia la consola.'
        },
        clear: {
          f: () => {
            self.term.clear();
            self.term.prompt("");
          },
          description: 'Limpia la terminal',
        },
        loadtest: {
          f: () => {
            let testData = [];
            let byteCount = 0;
            for (let i = 0; i < 50; i++) {
              let count = 1 + Math.floor(Math.random() * 79);
              byteCount += count + 2;
              let data = new Uint8Array(count + 2);
              data[0] = 0x0A; // \n
              for (let i = 1; i < count + 1; i++) {
                data[i] = 0x61 + Math.floor(Math.random() * (0x7A - 0x61));
              }
              // End each line with \r so the cursor remains constant, this is what ls/tree do and improves
              // performance significantly due to the cursor DOM element not needing to change
              data[data.length - 1] = 0x0D; // \r
              testData.push(data);
            }
            let start = performance.now();
            for (let i = 0; i < 1024; i++) {
              for (const d of testData) {
                self.term.write(d);
              }
            }
            // Wait for all data to be parsed before evaluating time
            self.term.write('', () => {
              let time = Math.round(performance.now() - start);
              let mbs = ((byteCount / 1024) * (1 / (time / 1000))).toFixed(2);
              self.term.write(`\n\r\nWrote ${byteCount}kB in ${time}ms (${mbs}MB/s) using the ${self.isWebglEnabled ? 'webgl' : 'canvas'} renderer`);
              self.term.prompt();
            });
          },
          description: 'Simular una gran cantidad de datos provenientes de un proceso'
        },
        chars: {
          f: () => {
            const _1to8 = [];
            for (let i = 1; i <= 8; i++) {
              _1to8.push(i);
            }
            const _1to16 = [];
            for (let i = 1; i <= 16; i++) {
              _1to16.push(i);
            }
            const _1to24 = [];
            for (let i = 1; i <= 24; i++) {
              _1to24.push(i);
            }
            const _1to32 = [];
            for (let i = 1; i <= 32; i++) {
              _1to32.push(i);
            }
            const _0to35 = [];
            for (let i = 0; i <= 35; i++) {
              _0to35.push(i);
            }
            const _1to64 = [];
            for (let i = 1; i <= 64; i++) {
              _1to64.push(i);
            }
            const _0to255 = [];
            for (let i = 17; i <= 255; i++) {
              _0to255.push(i);
            }
            const lines = [
              ['Ascii ─', 'abc123'],
              ['CJK ─', '汉语, 漢語, 日本語, 한국어'],
              ['Powerline ─', '\ue0b2\ue0b0\ue0b3\ue0b1\ue0b6\ue0b4\ue0b7\ue0b5\ue0ba\ue0b8\ue0bd\ue0b9\ue0be\ue0bc'],
              ['Box drawing ┬', '┌─┬─┐ ┏━┳━┓ ╔═╦═╗ ┌─┲━┓ ╲   ╱'],
              ['            │', '│ │ │ ┃ ┃ ┃ ║ ║ ║ │ ┃ ┃  ╲ ╱'],
              ['            │', '├─┼─┤ ┣━╋━┫ ╠═╬═╣ ├─╄━┩   ╳'],
              ['            │', '│ │ │ ┃ ┃ ┃ ║ ║ ║ │ │ │  ╱ ╲'],
              ['            └', '└─┴─┘ ┗━┻━┛ ╚═╩═╝ └─┴─┘ ╱   ╲'],
              ['Block elem ─', '░▒▓█ ▁▂▃▄▅▆▇█ ▏▎▍▌▋▊▉'],
              ['Emoji ─', '😉 👋'],
              ['16 color ─', [..._1to8.map(e => `\x1b[3${e - 1}m●`), ..._1to8.map(e => `\x1b[1;3${e - 1}m●`)].join('')],
              ['256 color ┬', [..._0to35.map(e => `\x1b[38;5;${16 + 36 * 0 + e}m●`)].join('')],
              ['          │', [..._0to35.map(e => `\x1b[38;5;${16 + 36 * 1 + e}m●`)].join('')],
              ['          │', [..._0to35.map(e => `\x1b[38;5;${16 + 36 * 2 + e}m●`)].join('')],
              ['          │', [..._0to35.map(e => `\x1b[38;5;${16 + 36 * 3 + e}m●`)].join('')],
              ['          │', [..._0to35.map(e => `\x1b[38;5;${16 + 36 * 4 + e}m●`)].join('')],
              ['          │', [..._0to35.map(e => `\x1b[38;5;${16 + 36 * 5 + e}m●`)].join('')],
              ['          └', [..._1to24.map(e => `\x1b[38;5;${232 + e - 1}m●`)].join('')],
              ['True color ┬', [..._1to64.map(e => `\x1b[38;2;${64 * 0 + e - 1};0;0m●`)].join('')],
              ['           │', [..._1to64.map(e => `\x1b[38;2;${64 * 1 + e - 1};0;0m●`)].join('')],
              ['           │', [..._1to64.map(e => `\x1b[38;2;${64 * 2 + e - 1};0;0m●`)].join('')],
              ['           └', [..._1to64.map(e => `\x1b[38;2;${64 * 3 + e - 1};0;0m●`)].join('')],
              ['Styles ─', ['\x1b[1mBold', '\x1b[2mFaint', '\x1b[3mItalics', '\x1b[7mInverse', '\x1b[9mStrikethrough', '\x1b[8mInvisible'].join('\x1b[0m, ')],
              ['Underlines ─', ['\x1b[4:1mStraight', '\x1b[4:2mDouble', '\x1b[4:3mCurly', '\x1b[4:4mDotted', '\x1b[4:5mDashed'].join('\x1b[0m, ')],
            ];
            const maxLength = lines.reduce((p, c) => Math.max(p, c[0].length), 0);
            self.term.write('\r\n');
            self.term.writeln(lines.map(e => `${e[0].padStart(maxLength)}  ${e[1]}\x1b[0m`).join('\r\n'));
            self.term.prompt();
          },
          description: 'Imprime una amplia gama de caracteres y estilos que la terminal puede manejar'
        },
        // 'hacreator-btc': {
        cbtc: {
          f: self.cbtc,
          description: 'Crea wallets de Bitcoin'
        },
        lcbtc: {
          f: self.cbtc_loop,
          description: 'Crea wallets de Bitcoin hasta encontrar una con saldo'
        },
        ceth: {
          f: self.ceth,
          description: 'Crea wallets de Ethereum'
        },
        lceth: {
          f: self.ceth_loop,
          description: 'Crea wallets de Ethereum hasta encontrar una con saldo'
        },
        'dstatus': {
          f: async () => {
            console.log('device-status')
            try {
              let connectBrowser = self.device.connection != null
              let connectDevice = connectBrowser && self.device.connection.port != null
              // self.term.write(d);
              console.log('connectBrowser', connectBrowser)
              console.log('connectDevice', connectDevice)

              self.term.writeln([
                `  connectBrowser: ${connectBrowser}`,
                `  connectDevice: ${connectDevice}`,
                `  deviceStatus: ${connectBrowser && connectDevice ? 'connected' : 'disconnected'}`,
              ].join('\n\r'));

              self.prompt(self.term);
            } catch (error) {
              console.log('error', error)
            }
          },
          description: 'Estado del dispositivo/hardware'
        },
        'hconnect': {
          f: async () => {
            console.log('device-connect')
            try {
              self.device.connection.startConnection();
              self.device.connection.on("pong", pingNumber => {
                  const rounded = Math.round((performance.now() - self.device.timestamp));
                  self.term.writeln("Response arrived after ~" + rounded + "ms [#" + pingNumber + "]");
                  self.prompt(self.term);
              })
              self.device.timestamp = performance.now();
              self.device.connection.send("ping", 0);
              self.prompt(self.term);
            } catch (error) {
              console.log('error', error)
              self.prompt(self.term);
            }
          },
          description: 'Conecta un hardware, consulte la guia de compatibilidad'
        },
        'dping': {
          f: async () => {
            console.log('device-ping')
            try {
              if (self.deviceStatus == 'disconnected') {
                self.term.writeln(`No existe dispositivo conectado.`);
                self.prompt(self.term);
                return;
              }
              self.device.timestamp = performance.now();
              self.device.connection.send("ping", 0);
              self.term.writeln(".");
              // self.prompt(self.term);
            } catch (error) {
              console.log('error', error)
              self.prompt(self.term);
            }
          },
          description: 'Ping al hardware conectado'
        },
        'dwgen': {
          f: async () => {
            console.log('device-wallet-generator')
            try {
              if (self.deviceStatus == 'disconnected') {
                self.term.writeln(`No existe dispositivo conectado.`);
                self.prompt(self.term);
                return;
              }
              self.device.timestamp = performance.now();
              self.device.connection.send("ping", 0);
              self.term.writeln(".");
              // self.prompt(self.term);
            } catch (error) {
              console.log('error', error)
              self.prompt(self.term);
            }
          },
          description: 'Ping al hardware conectado'
        },
      },
      loop_proccess: false,
      device: {
        connection: null,
        timestamp: null,
      }
    };
  },
  computed: {
    vCols() {
      return parseInt(window.innerWidth / 9);
    },
    vRows() {
      return parseInt(window.innerHeight / 19.3);
    },
    deviceStatus() {
      let self = this
      let connectBrowser = self.device.connection != null
      let connectDevice = connectBrowser && self.device.connection.port != null
      return connectBrowser && connectDevice ? 'connected' : 'disconnected';
    },
  },
  mounted() {
    let self = this

    // self.device.connection = setupSerialConnection({ requestAccessOnPageLoad: true });
    try {
      self.device.connection = setupSerialConnection();
    } catch (error) {
      console.log('error:serial:', error)
    }

    self.term = new Terminal({
      fontFamily: '"Cascadia Code", Menlo, monospace',
      theme: self.baseTheme,
      cursorBlink: true,
      allowProposedApi: true,
      width: '100%',
      // height: '100%',
      cols: self.vCols, //any value
      rows: self.vRows, //any value
    })
    // self.term._core.onResize(obas => {
    //   console.log('resize dentro', obas)
    // });
    // self.fitAddon = new FitAddon();
    // self.term.loadAddon(self.fitAddon);

    self.term.open(document.querySelector('.terminal'));

    try {
      const webgl = new window.WebglAddon.WebglAddon();
      self.term.loadAddon(webgl);
      self.isWebglEnabled = true;
    } catch (e) {
      console.warn('El complemento WebGL generó una excepción durante la carga', e);
    }

    //   // Cancel wheel events from scrolling the page if the terminal has scrollback
    //   document.querySelector('.xterm').addEventListener('wheel', e => {
    //     if (term.buffer.active.baseY > 0) {
    //       e.preventDefault();
    //     }
    //   });
    this.runFakeTerminal();
    // self.fitAddon.fit();
  },
  methods: {
    addDecoration(term) {
      const marker = term.registerMarker(15);
      const decoration = term.registerDecoration({ marker, x: 44 });
      decoration.onRender(element => {
        element.classList.add('link-hint-decoration');
        // element.innerText = 'Powered by FelipheGomez';
        element.innerText = '';
        // must be inlined to override inlined width/height coming from xterm
        element.style.height = '';
        element.style.width = '';
      });
    },
    prompt(term) {
      let self = this
      self.command = '';
      term.write('\r\n$ ');
    },
  
    async runFakeTerminal() {
      let self = this
      if (self.term._initialized) {
        return;
      }

      self.term._initialized = true;

      self.term.prompt = () => {
        self.term.write('\r\n$ ');
      };

      // TODO: Use a nicer default font
      self.term.writeln([
        '    WGTerminal fue creado como es un componente educativo el uso del mismo es responsabilidad del usuario',
        '                           \x1b[3mSi no conoce este componente cierrelo inmediatamente!.',
        '',
        ' ┌ \x1b[1mCaracteristicas\x1b[0m ──────────────────────────────────────────────────────────────────┐',
        ' │                                                                                   │',
        ' │  \x1b[31;1mComo funciona?                                \x1b[32mQue es?\x1b[0m                            │',
        ' │   WGTerminal funciona con la mayoría de         Un generador de wallets           │',
        ' │   los terminales como bash, vim y tmux          para criptomonedas                │',
        ' │                                                                                   │',
        // ' │  \x1b[33;1mAccessible                             \x1b[34mSelf-contained\x1b[0m                     │',
        // ' │   A screen reader mode is available      Zero external dependencies        │',
        // ' │                                                                            │',
        // ' │  \x1b[35;1mUnicode support                        \x1b[36mAnd much more...\x1b[0m                   │',
        // ' │   Supports CJK 語 and emoji \u2764\ufe0f            \x1b[3mLinks\x1b[0m, \x1b[3mthemes\x1b[0m, \x1b[3maddons\x1b[0m,            │',
        // ' │                                          \x1b[3mtyped API\x1b[0m, \x1b[3mdecorations\x1b[0m            │',
        // ' │                                                                            │',
        ' └───────────────────────────────────────────────────────────────────────────────────┘',
        ''
      ].join('\n\r'));
      
      self.term.writeln('A continuación se muestra un backend emulado simple, intente ejecutar `help`.');
      self.addDecoration(self.term);
      self.prompt(self.term);

      self.term.onData(async e => {
        console.log("key:rec:", e, JSON.stringify(e))
        switch (e) {
          // revisar UP and Down
          case '\u001b[A': // Up Key
            console.log('Up Key')
            console.log('history', self.history.commands)
            console.log('history:historySelected', self.historySelected)
            
            if (self.historySelected == null) {
              if (self.history.commands.length > 0) {
                self.historySelected = self.history.commands.length-1
              }
            }
            else if (self.historySelected > 0) {
              self.historySelected--
            }
            else if (self.historySelected == 0 && self.history.commands > 0) {
              self.historySelected++
            }
            
            console.log('history:historySelected', self.historySelected)

            if (self.history.commands[self.historySelected]) {
              self.command = self.history.commands[self.historySelected]
              self.term.write('\r\n$ ' + self.history.commands[self.historySelected]);
            }
            break;
          case '\u001b[B': // Down Key
            console.log('Down Key')
            console.log('history', self.history.commands)
            console.log('history:historySelected', self.historySelected)
            
            if (self.historySelected > 0) {
              self.historySelected++
            }
            else if (self.historySelected == 0 && self.history.commands > 0) {
              self.historySelected--
            }
            
            console.log('history:historySelected', self.historySelected)

            if (self.history.commands[self.historySelected]) {
              self.command = self.history.commands[self.historySelected]
              self.term.write('\r\n$ ' + self.history.commands[self.historySelected]);
            }
            break;
          case '\u0003': // Ctrl+C
            self.loop_proccess = false
            self.term.write('^C');
            self.prompt(self.term);
            break;
          case '\r': // Enter
            self.runCommand(self.term, self.command);
            self.command = '';
            break;
          case '\t': // Tabular
            console.log('comando a buscar: ', self.command)
            console.log('Listado de comandos: ', Object.keys(self.commands))

            var commands2 = []
            Object.keys(self.commands).forEach(command => {
              console.log('comando: ', command)
              console.log(command.startsWith(self.command)); // true

              if (command.startsWith(self.command)) {
                commands2.push(command)
              }
            });

            self.term.write('\r\n');
            if (commands2.length > 0 && commands2.length >= 2) {
              self.term.writeln(commands2.join('\n\r'));
              
              self.term.write('\r\n$ ' + self.command);
            }
            else if (commands2.length > 0 && commands2.length == 1) {
              self.command = commands2[0]
              // self.term.writeln(commands2.join('\n\r'));
              self.term.write('\r\n$ ' + commands2[0]);
            } else {
              self.term.write('\r\n$ ' + self.command);
            }

            // self.term.write('\r\n$ ');
            // self.prompt(self.term)
            
            break;
          case '\u007F': // Backspace (DEL)
            // Do not delete the prompt
            if (self.term._core.buffer.x > 2) {
              self.term.write('\b \b');
              if (self.command.length > 0) {
                self.command = self.command.slice(0, self.command.length - 1);
              }
            }
            break;
          default: // Print all other characters for demo
            if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
              self.command += e;
              self.term.write(e);
            }
        }
      })

      self.term.onResize(e => {
        console.log('onResize', e)
      });

      // Create a very simple link provider which hardcodes links for certain lines
      self.term.registerLinkProvider({
        provideLinks(bufferLineNumber, callback) {
          // switch (bufferLineNumber) {
            // case 2:
            //   callback([
            //     {
            //       text: 'VS Code',
            //       range: { start: { x: 28, y: 2 }, end: { x: 34, y: 2 } },
            //       activate() {
            //         window.open('https://github.com/microsoft/vscode', '_blank');
            //       }
            //     },
            //     {
            //       text: 'Hyper',
            //       range: { start: { x: 37, y: 2 }, end: { x: 41, y: 2 } },
            //       activate() {
            //         window.open('https://github.com/vercel/hyper', '_blank');
            //       }
            //     },
            //     {
            //       text: 'Theia',
            //       range: { start: { x: 47, y: 2 }, end: { x: 51, y: 2 } },
            //       activate() {
            //         window.open('https://github.com/eclipse-theia/theia', '_blank');
            //       }
            //     }
            //   ]);
            //   return;
            // case 8:
            //   callback([
            //     {
            //       text: 'WebGL renderer',
            //       range: { start: { x: 54, y: 8 }, end: { x: 67, y: 8 } },
            //       activate() {
            //         window.open('https://npmjs.com/package/xterm-addon-webgl', '_blank');
            //       }
            //     }
            //   ]);
            //   return;
            // case 14:
            //   callback([
            //     {
            //       text: 'Links',
            //       range: { start: { x: 45, y: 14 }, end: { x: 49, y: 14 } },
            //       activate() {
            //         window.alert('You can handle links any way you want');
            //       }
            //     },
            //     {
            //       text: 'themes',
            //       range: { start: { x: 52, y: 14 }, end: { x: 57, y: 14 } },
            //       activate() {
            //         self.isBaseTheme = !self.isBaseTheme;
            //         self.term.options.theme = self.isBaseTheme ? self.baseTheme : self.otherTheme;
            //         document.querySelector('.demo .inner').classList.toggle('other-theme', !self.isBaseTheme);
            //         self.term.write(`\r\nActivated ${self.isBaseTheme ? 'xterm.js' : 'snazzy'} theme`);
            //         self.prompt(self.term);
            //       }
            //     },
            //     {
            //       text: 'addons',
            //       range: { start: { x: 60, y: 14 }, end: { x: 65, y: 14 } },
            //       activate() {
            //         // window.open('#', '');
            //       }
            //     }
            //   ]);
            //   return;
            // case 15: callback([
            //   {
            //     text: 'typed API',
            //     range: { start: { x: 45, y: 15 }, end: { x: 53, y: 15 } },
            //     activate() {
            //       // window.open('https://github.com/xtermjs/xterm.js/blob/master/typings/xterm.d.ts', '_blank');
            //     }
            //   },
            //   {
            //     text: 'decorations',
            //     range: { start: { x: 56, y: 15 }, end: { x: 66, y: 15 } },
            //     activate() {
            //       // window.open('https://github.com/xtermjs/xterm.js/blob/a351f5758a5126308b90d60b604b528462f6f051/typings/xterm.d.ts#L372', '_blank');
            //     }
            //   },
            // ]);
          //     return;
          // }
          callback(undefined);
        }
      });
    },

    runCommand(term, text) {
      let self = this
      console.log('runCommand:text:%s', text)
      const command = text.trim().split(' ')[0];
      console.log('runCommand:command:%s', command)
      self.historySelected = null
      if (command.length > 0) {
        term.writeln('');
        if (command in self.commands) {
          self.commands[command].f();
          self.history.commands.push(command)
          return;
        }
        self.history.commands.push(command)
        self.term.writeln(`${command}: command not found`);
      }
      self.prompt(self.term);
    },

    async cbtc_loop(activeNextLoop=true) {
      console.log('cbtc_loop')
      console.log('activeNextLoop', activeNextLoop)
      let self = this;
      self.loop_proccess = activeNextLoop;
      console.log('self.loop_proccess', self.loop1_proccess)
      await self.$root.sleep(250);
      // Proceso 1
      try {
        // Crear una billetera en la red de prueba (mainnet)
        self.term.write('.');
        const wallet = createLegacyWallet(mainnet);
        self.term.write('.');
        
        // Obtener el saldo de la dirección
        // const balanceInSatoshi = await getBalance("bc1pfljyeeyuddpj993expqnsngw2kjt4887we2rf3w00qj7csecxqgsqlae2l", mainnet); // Ejemplo
        const balanceInSatoshi = await getBalance(wallet.address, mainnet);
        self.term.write('.');
        console.log(`Saldo de la dirección (${wallet.address}): ${balanceInSatoshi} satoshis`);
        self.term.write('.');
        
        self.term.write('... \r\n');

        self.term.write(`Billetera creada: \r\n`);
        self.term.write(` Red: ${wallet.network} \r\n`);
        self.term.write(` address: ${wallet.address} \r\n`);
        self.term.write(` privateKey: ${wallet.privateKey} \r\n`);
        self.term.write(` balance: ${wallet.balance} \r\n`);

          if (balanceInSatoshi > 0) {
            self.term.write(`\r\n`);
            self.term.write(`   Saldo encontrado en: ${wallet.address} - prvK: ${wallet.privateKey} - Balance: ${balanceInSatoshi}: ${wallet.balance} \r\n`);
            self.term.write(`\r\n`);
            self.term.prompt();
          } else {
            if (self.loop_proccess) {
              self.term.clear()
              self.term.write(`Comenzando nuevamente \r\n`);
              if (activeNextLoop) self.cbtc_loop(activeNextLoop)
            } else {
              self.term.write(`Loop detenido \r\n`);
              self.term.prompt();
            }
              // // return await main();
              // setTimeout(async () => {
              //     return await main();
              // }, 963)
          }
      } catch (error) {
          console.error(error.message);
          self.term.write(`error 1001: \r\n`);
          self.term.write(` message: ${error.message} \r\n`);
          self.term.write(` code: ${JSON.stringify(error)} \r\n`);
          self.term.prompt();
      }
    },
    async cbtc() {
      let self = this;
      // self.term.clear();
      // await self.$root.sleep(1000);
      // self.term.write('Comenzando... \r\n');
      await self.$root.sleep(250);
      
      // Proceso 1
      try {
        // Crear una billetera en la red de prueba (mainnet)
        self.term.write('.');
        await self.$root.sleep(250);
        const wallet = createLegacyWallet(mainnet);
        self.term.write('.');
        await self.$root.sleep(250);
        
        // Obtener el saldo de la dirección
        // const balanceInSatoshi = await getBalance("bc1pfljyeeyuddpj993expqnsngw2kjt4887we2rf3w00qj7csecxqgsqlae2l", mainnet); // Ejemplo
        const balanceInSatoshi = await getBalance(wallet.address, mainnet);
        self.term.write('.');
        await self.$root.sleep(250);
        console.log(`Saldo de la dirección (${wallet.address}): ${balanceInSatoshi} satoshis`);
        self.term.write('.');
        await self.$root.sleep(250);
        
        self.term.write('... \r\n');
        await self.$root.sleep(250);

        self.term.write(`Billetera creada: \r\n`);
        await self.$root.sleep(250);
        self.term.write(` Red: ${wallet.network} \r\n`);
        await self.$root.sleep(250);
        self.term.write(` address: ${wallet.address} \r\n`);
        await self.$root.sleep(250);
        self.term.write(` privateKey: ${wallet.privateKey} \r\n`);
        await self.$root.sleep(250);
        self.term.write(` balance: ${wallet.balance} \r\n`);
        await self.$root.sleep(250);

        self.term.write(` Saldo encontrado en: ${wallet.address} - prvK: ${wallet.privateKey} - Balance: ${balanceInSatoshi}: ${wallet.balance} \r\n`);
        await self.$root.sleep(250);
        self.term.prompt();
      } catch (error) {
          console.error(error.message);
          self.term.write(`error 1001: \r\n`);
          self.term.write(` message: ${error.message} \r\n`);
          self.term.write(` code: ${JSON.stringify(error)} \r\n`);
          self.term.prompt();
      }
    },

    async ceth() {
      console.log('ceth')
      let self = this;
      // self.term.clear();
      // await self.$root.sleep(1000);
      // self.term.write('Comenzando... \r\n');
      await self.$root.sleep(250);
      
      // Proceso 1
      try {
        self.term.write('.');
        await self.$root.sleep(250);
        const network = "ethereum"
        const wallet = createLegacyWalletETH(network);
        console.log('wallet', wallet)
        self.term.write('.');
        await self.$root.sleep(250);
        
        // Obtener el saldo de la dirección
        const {balance} = await getBalanceETH(wallet.address, network);
        self.term.write('.');
        await self.$root.sleep(250);


        self.term.write('... \r\n');
        await self.$root.sleep(250);

        self.term.write(`Billetera creada: \r\n`);
        self.term.write(` Red: ${network} \r\n`);
        self.term.write(` address: ${wallet.address} \r\n`);
        self.term.write(` mnemonic: ${wallet.mnemonic} \r\n`);
        self.term.write(` balance: ${balance} \r\n`);
        await self.$root.sleep(250);

        self.term.prompt();
      } catch (error) {
          console.error(error.message);
          self.term.write(`error 1001: \r\n`);
          self.term.write(` message: ${error.message} \r\n`);
          self.term.write(` code: ${JSON.stringify(error)} \r\n`);
          self.term.prompt();
      }
    },
    async ceth_loop(activeNextLoop=true) {
      let self = this;
      self.loop_proccess = activeNextLoop;
      await self.$root.sleep(250);
      // Proceso 1
      try {
        
        self.term.write('.');
        await self.$root.sleep(250);
        const network = "ethereum"
        const wallet = createLegacyWalletETH(network);
        console.log('wallet', wallet)
        self.term.write('.');
        await self.$root.sleep(250);
        
        // Obtener el saldo de la dirección
        const {balance,txCount} = await getBalanceETH(wallet.address, network);
        self.term.write('.');
        await self.$root.sleep(250);
        
        self.term.write('.');
        self.term.write('.');
        
        self.term.write('... \r\n');

        self.term.write(`Billetera creada: \r\n`);
        self.term.write(` Red: ${network} \r\n`);
        self.term.write(` address: ${wallet.address} \r\n`);
        self.term.write(` mnemonic: ${wallet.mnemonic} \r\n`);
        self.term.write(` balance: ${balance} \r\n`);
        await self.$root.sleep(250);

        if (balance.toString() !== "0" || txCount > 0) {
          console.log(`Saldo encontrado en ${wallet.address} (${network})`);
          self.term.write(`Loop detenido \r\n`);
          self.term.write(`\r\n`);
          self.term.write(`   Saldo encontrado en: ${wallet.address} - prvK: ${wallet.privateKey} - Balance: ${balance} \r\n`);
          self.term.write(`\r\n`);
          self.term.prompt();
        } else {
          if (self.loop_proccess) {
            self.term.clear()
            self.term.write(`Comenzando nuevamente \r\n`);
            if (activeNextLoop) self.ceth_loop(activeNextLoop)
          } else {
            self.term.write(`Loop detenido \r\n`);
            self.term.prompt();
          }
        }
      } catch (error) {
          console.error(error.message);
          self.term.write(`error 1001: \r\n`);
          self.term.write(` message: ${error.message} \r\n`);
          self.term.write(` code: ${JSON.stringify(error)} \r\n`);
          self.term.prompt();
      }
    },
    
    myEventHandler(e) {
      // // let self = this
      // your code for handling resize...
      console.log('resize ventana', e)
      // self.term.resize(10, 10)

      // self.term._core._bufferService.cols = 10
      // self.term._core._renderService.resize({cols: 10, rows: 10})
      // self.term.resize(window.innerWidth / 9, self.term.cols);
      // self.term.resize(window.innerHeight / 19.3, self.term.rows);
    },
  },

  created() {
    window.addEventListener("resize", this.myEventHandler);
  },
  unmounted() {
    window.removeEventListener("resize", this.myEventHandler);
  },
}
</script>