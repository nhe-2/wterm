/* eslint-disable */
import { PrivateKey } from 'bitcore-lib';
import { mainnet, testnet } from "bitcore-lib/lib/networks";
import axios from 'axios'; // Para realizar solicitudes HTTP

/**
 * Crea una nueva billetera Bitcoin "legacy" (P2PKH).
 * 
 * @param {Object} network - La red Bitcoin a utilizar (mainnet o testnet). Por defecto, testnet.
 * @returns {Object} Un objeto que contiene la clave privada, la dirección y el saldo inicial.
 * @throws {Error} Si el parámetro 'network' no es válido.
 */
export const createLegacyWallet = (network = testnet) => {
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
};

/**
 * Obtiene el saldo de una dirección Bitcoin utilizando la API de Blockstream.
 * 
 * @param {string} address - La dirección Bitcoin.
 * @param {Object} network - La red Bitcoin (mainnet o testnet).
 * @returns {Promise<number>} El saldo en satoshis.
 * @throws {Error} Si ocurre un error al consultar la API.
 */
export const getBalance = async (address, network = testnet) => {
  const baseUrl = network === testnet
    ? "https://blockstream.info/testnet/api"
    : "https://blockstream.info/api";

  try {
    // Consultar la API para obtener los detalles de la dirección
    const response = await axios.get(`${baseUrl}/address/${address}`);
    const { chain_stats, mempool_stats } = response.data;

    // Calcular el saldo total en satoshis
    const totalReceived = chain_stats.funded_txo_sum + mempool_stats.funded_txo_sum;
    const totalSpent = chain_stats.spent_txo_sum + mempool_stats.spent_txo_sum;
    const balance = totalReceived - totalSpent;

    return balance; // Saldo en satoshis
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