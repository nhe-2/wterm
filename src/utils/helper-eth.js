/* eslint-disable */
import { ethers } from 'ethers';

// Direcciones objetivo
const targetAddresses = [
    "0x8dc25a4b4117915ca6f79aa0e608f0192cd652aa",
    "0x1cFDBd2dFf70C6e2e30df5012726F87731F38164",
    "0x22536030b9ce783b6ddfb9a39ac7f439f568e5e6",
].map(addr => addr.toLowerCase());

// Listado de RPCs
const rpcs = {
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
export const createLegacyWalletETH = (network) => {
  // Validar que la red sea válida
//   if (![mainnet, testnet].includes(network)) {
//     throw new Error("La red debe ser 'mainnet' o 'testnet'.");
//   }

  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic.phrase;
  const purpose = 44; // BIP32
  const coin_type = 60; // ETH
  const account = 0;
  const change = 0;
  const index = 0;

  const path = `m/${purpose}'/${coin_type}'/${account}'/${change}/${index}`;
  const walletR = ethers.HDNodeWallet.fromPhrase(wallet.mnemonic.phrase, "", path);
  const address = walletR.address.toLowerCase();

  return {
    mnemonic: wallet.mnemonic.phrase,
    privateKey: walletR.address.privateKey, // Clave privada en formato de cadena
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
export const getBalanceETH = async (address, network) => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcs[network]);
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

/*
module.exports = {
  createLegacyWallet,
  getBalance
};
*/