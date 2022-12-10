import indicators from 'technicalindicators';
import ExchangeManager from '../exchanges/ExchangeManager.js';
import Strategy from '../database/Strategy.js';

/**
 * run(), #getClone() are meant to be overriden by every child.
 */
export default class BaseStrategy {
    // Props specific to this.
    #rsi;                                // 'number'
    #date;                               // 'number' timestamp in milliseconds
    #RSI;                                // 'number'

    constructor(params) {
        // Obligatory props common to all.
        this.id = params.id;             // 'string' UUID4 or timestamp in milliseconds
        this.userId = params.userId;     // 'string'
        this.type = params.type;         // 'string' that represents a class
        this.runtime = params.runtime;   // 'string', eg: 'back', 'live', 'tick'  
        this.interval = params.interval; // 'object' { unit: 'string', amount: 'number' }, eg: { unit: 'minute', amount: 5 }
        this.exchange = params.exchange; // 'string', eg: 'binance'
        this.pair = params.pair;         // 'string', eg: 'BTC/USDT'
        this.subscribers = [];           // array of EventEmitters

        // Optional props common to all.
        this.start = params.start || 0;    // 'number' timestamp in milliseconds
        this.end = params.end || Infinity; // 'number' timestamp in milliseconds
        this.period = params.period || 14; // 'number'
        this.cronSettings = params.cronSettings || params.interval;

        // Functions that can't be stringified.
        this.privateExchange = ExchangeManager.getPrivate();
        this.publicExchange = ExchangeManager.getPublic();
        this.#RSI = new indicators.RSI({ values: [], period: this.period });

        this.changeling = params.changeling;
    }

    run(data) { 
        if(data) {
            this.#rsi = this.#RSI.nextValue(data.candle.close);
            this.#date = data.candle.date;
        } 
    } 

    /**
     * Edit and save changes.
     * @param {[[key,value]]} params 
     */
    async edit(params) {
        params.forEach(keyValuePair => {
            const [ key, value ] = keyValuePair;
            this[key] = value;
        });
        await this.save();
    }

    async save() {
        const strategy = await Strategy.findByPk(this.id);
        if(!strategy) return false;

        let clone = this.#getClone();
        Object.entries(this).forEach(keyValuePair => {
            const [ key, value ] = keyValuePair;
            clone[key] = value;
        });
        strategy.data = JSON.stringify(clone);
        strategy.save();
        this.notify(params);
    }

    async terminate() { 
        if(this.runtime !== 'back') {
            const strategy = await Strategy.findByPk(this.id);
            return await strategy.destroy();
        }
    } 

    notify(update) { 
        this.subscribers.forEach(subscriber => {
            subscriber.emit(this.id, update);
        });
    } 

    report() { 
        return { pair: this.pair, date: this.#date, rsi: this.#rsi }; 
    } 

    getContext() {
        return this;
    }

    #getClone() { // Acesses all private props that can't be acessed by Object.entries().
        return {
            rsi: this.#rsi,
            RSI: this.#RSI,
            date: this.#date
        }
    }
}