import PublicExchangeFactory, { PublicExchange } from './PublicExchange.js';
import PrivateExchangeFactory, { PrivateExchange } from './PrivateExchange.js';

class ExchangeManager {
    static #public = {};
    static #private = {};
    static #incrementalIds = 0;

    /**
     * Creates or returns existing public exchange.
     * @param {string} name
     * @returns {PublicExchange}
     */
    static async getPublic(name, isTest) {
        if(!this.#public[name]) {
            this.#public[name] = await PublicExchangeFactory.create(name, isTest);
            this.#public[name].id = String(Date.now() + this.#incrementalIds++);
        }
        return this.#public[name];
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
        if(!this.#private[key]) {
            this.#private[key] = await PrivateExchangeFactory.create(name, userId, isTest);
            this.#private[key].id = String(Date.now() + this.#incrementalIds++);
        }
        return this.#private[key];
    }

    static count(type) {
        if(type === 'public') return Object.keys(this.#public).length;
        else return Object.keys(this.#private).length;
    }
}

export default ExchangeManager;