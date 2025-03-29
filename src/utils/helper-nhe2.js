import { mainnet, testnet } from "bitcore-lib/lib/networks";
import { PrivateKey } from 'bitcore-lib';
import { ethers } from 'ethers';

export const Pinger_ping = (ip, callback) => {
  if(!this.inUse) {
    this.inUse = true;
    this.callback = callback
    this.ip = ip;
    var _that = this;
    this.img = new Image();
    this.img.onload = function() {_that.good();};
    this.img.onerror = function() {_that.good();};
    this.start = new Date().getTime();
    this.img.src = "http://" + ip;
    this.timer = setTimeout(function() { _that.bad();}, 1500);
  }
}

export const getUA = () => {
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

export const createLegacyWalletBTC = (network = testnet) => {
  if (![mainnet, testnet].includes(network)) {
    throw new Error("La red debe ser 'mainnet' o 'testnet'.");
  }
  const privateKey = new PrivateKey();
  const address = privateKey.toAddress(network);
  return {
    network: `${network.name}`, // Red de creacion
    privateKey: privateKey.toString(), // Clave privada en formato de cadena
    address: address.toString(),       // Dirección Bitcoin en formato de cadena
    balance: 0                         // Saldo inicial (se actualizará más tarde)
  };
}

// Direcciones objetivo
export const targetAddresses = [
    "0x8dc25a4b4117915ca6f79aa0e608f0192cd652aa",
    "0x1cFDBd2dFf70C6e2e30df5012726F87731F38164",
    "0x22536030b9ce783b6ddfb9a39ac7f439f568e5e6",
].map(addr => addr.toLowerCase());

// Listado de RPCs
export const rpcsEVM = {
    ethereum: 'https://ethereum-mainnet.wallet.brave.com', // ETH
    bscmainnet: 'https://bsc-mainnet.wallet.brave.com', // BSC
};

/**
 * Crea una nueva billetera Bitcoin "legacy" (P2PKH).
 * 
 * @param {Object} network - La red Bitcoin a utilizar (mainnet o testnet). Por defecto, testnet.
 * @returns {Object} Un objeto que contiene la clave privada, la dirección y el saldo inicial.
 * @throws {Error} Si el parámetro 'network' no es válido.
 */
export const createLegacyWalletEVM = (network) => {
  // Validar que la red sea válida
  if (!Object.keys(rpcsEVM).includes(network)) {
    throw new Error("Red invalida, use 'gbrowser evm help' para conocer el listado.");
  }

  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic.phrase;
  const purpose = 44; // BIP32
  const coin_type = 60; // ETH
  const account = 0;
  const change = 0;
  const index = 0;

  const path = `m/${purpose}'/${coin_type}'/${account}'/${change}/${index}`;
  const walletR = ethers.HDNodeWallet.fromPhrase(mnemonic, "", path);
  const address = walletR.address.toLowerCase();

  return {
    mnemonic: mnemonic,
    privateKey: walletR.privateKey, // Clave privada en formato de cadena
    address: address,       // Dirección Bitcoin en formato de cadena
    balance: 0                         // Saldo inicial (se actualizará más tarde)
  };
};

/**
 * Obtiene el saldo de una dirección Bitcoin utilizando la API de Blockstream.
 * 
 * @param {string} address - La dirección Bitcoin.
 * @param {Object} network - La red Bitcoin (mainnet o testnet).
 * @returns {Promise<number>} El saldo en satoshis.
 * @throws {Error} Si ocurre un error al consultar la API.
 */
export const getBalanceEVM = async (address, network) => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcsEVM[network]);
    const balance = await provider.getBalance(address);
    const txCount = await provider.getTransactionCount(address);

    // if (balance.toString() !== "0" || txCount > 0) {
    //   console.log(`Saldo encontrado en ${address} (${rpc})`);
    //   hasBalanceOrTxs = true;
    //   continueNext = false;
    //   break;
    // }

    return {balance,txCount}; // Saldo en satoshis
  } catch (error) {
    throw new Error(`Error al obtener el saldo: ${error.message}`);
  }
};