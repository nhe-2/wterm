import { payments } from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1/lib/js';
import { ECPairFactory } from 'ecpair';
import axios from 'axios';

const ECPair = ECPairFactory(ecc);

/**
 * Crea una nueva billetera Bitcoin "legacy" (P2PKH).
 * 
 * @returns {Object} Un objeto que contiene la clave privada, la dirección y el saldo inicial.
 */
export const createLegacyWallet = () => {
    const keyPair = ECPair.makeRandom();
    console.log('keyPair', keyPair)
    const { address } = payments.p2pkh({ pubkey: keyPair.publicKey });
    console.log('Bitcoin Address:', address);
    return {
        privateKey: keyPair.toWIF(), // Clave privada en formato WIF
        address: address,            // Dirección Bitcoin en formato de cadena
        balance: 0                   // Saldo inicial (se actualizará más tarde)
    };
};

/**
 * Obtiene el saldo de una dirección Bitcoin utilizando la API de Blockstream.
 * 
 * @param {string} address - La dirección Bitcoin.
 * @param {string} network - La red Bitcoin ('mainnet' o 'testnet').
 * @returns {Promise<number>} El saldo en satoshis.
 * @throws {Error} Si ocurre un error al consultar la API.
 */
export const getBalance = async (address, network = 'testnet') => {
    const baseUrl = network === 'testnet'
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