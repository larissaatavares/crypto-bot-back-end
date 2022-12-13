import PublicExchange from './PublicExchange.js';
import PrivateExchange from './PrivateExchange.js';

class ExchangeManager {
    static #public = {};
    static #private = {};

    /**
     * Creates or returns existing public exchange.
     * @param {string} name
     * @returns {PublicExchange}
     */
    static async getPublic(name) {
        if(this.#public[name]) {
            return this.#public[name];
        } else {
            this.#public[name] = await PublicExchange.create(name);
            return this.#public[name];
        }
    }   

    /**
     * Creates or returns existing private exchange.
     * @param {string} name 
     * @param {string} userId 
     * @param {boolean} isTest
     * @returns {PrivateExchange}
     */
    static async getPrivate(name, userId, isTest = false) {
        const type =  isTest ? 'test' : 'prod';
        const key = name + '_' + userId + '_' + type;
        if(this.#private[key]) {
            return this.#private[key];
        } else {
            this.#private[key] = await PrivateExchange.create(name, userId, isTest);
            return this.#private[key];
        }
    }

    static count(type) {
        if(type === 'public') return Object.keys(this.#public).length;
        else return Object.keys(this.#private).length;
    }
}

export default ExchangeManager;