const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  configureWebpack: {
    experiments: {
      asyncWebAssembly: true, // Habilita el soporte para WebAssembly
    },
    resolve: {
      fallback: {
        assert: require.resolve('assert'),
        buffer: require.resolve('buffer/'), // Asegura que Buffer esté disponible
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        vm: require.resolve('vm-browserify'),
      },
    },
    plugins: [
      // Agregar Buffer al scope global para compatibilidad
      new (require('webpack').ProvidePlugin)({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser', // Agrega process al scope global
      }),
    ],
  },
});