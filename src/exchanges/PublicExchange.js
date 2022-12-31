import ccxt from 'ccxt';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import Stream from 'stream';
import { getMilliseconds } from '../utils/index.js';
import sortHistoricalData from '../utils/historicalDataSorter.js';

/**
 * These methods work with the default behavior of ccxt.
 * If any of these methods isn't available for a given
 * exchange, the child class will wrap and adapt it. 
 * In the perfect case, nothing is overriden.
 */
class PublicExchange {
    name;
    #exchange; 
    #whileLoopFlag = true;
    #options = {};
    #subscribers = { 
        // key: pair, value: { key: id String, value: callback Function }
        tickers: {},    
        trades: {},    
        ohlcvs: {}    
    };

    #getMilliseconds = getMilliseconds;

    constructor(name, isTest = false) {
        this.name = name;
        if(ccxt.pro.exchanges.includes(name))
            this.#exchange = new ccxt.pro[name](this.#options); 
        else 
            this.#exchange = new ccxt[name](this.#options); 

        // will hold data meant for og props from the library, so they 
        // can turn into gets/sets alerting subscribers to it's changes
        this.#exchange.realTickers = {};
        this.#exchange.realTrades = {};
        this.#exchange.realOhlcvs = {};

        if(isTest) this.#exchange.setSandboxMode(true);
    }

    /**
     * General request for public data.
     * @param {String|[String]} pairs 
     * @param {String} method method to call in ccxt
     * @param {String} prop data property of ccxt to return
     * @returns {Object} 
     */
    async request(pairs, method, prop, isAdapter){
        if(typeof pairs === 'string') pairs = [pairs];
        if(!(pairs instanceof Array)) return null;
        pairs = pairs.filter(pair => this.pairs.includes(pair));
        if(pairs.length === 0) return null;

        const res = await Promise.all(pairs.map(pair => {
            return this.#exchange[method](pair);
        }));
        if(method.includes('fetch') || isAdapter){  
            res.forEach((item, index) => {
                this.#exchange[prop][pairs[index]] = item;
            });
        } 
        return this.#exchange[prop];
    }
    async iterator(pairs, method, prop) {
        while(this.#whileLoopFlag) 
            await this.request(pairs, method, prop, true);
    }
    /**
     * @param {string|[string]} pairs 
     */
    async getOrderbook(pairs) {
        return this.request(pairs, 'fetchOrderBook', 'orderbooks');
    } 
    /**
     * @param {string|[string]} pairs 
     */    
    async getTradeHistory(pairs) {
        return this.request(pairs, 'fetchTrades', 'trades');
    } 
    /**
     * @param {string|[string]} pairs 
     */    
    async getTicker(pairs) {
        return this.request(pairs, 'fetchTicker', 'tickers');
    } 
    /**
     * @param {string|[string]} pairs 
     */
    async getCandles(pairs) {
        return this.request(pairs, 'fetchOHLCV', 'ohlcvs');
    } 

    /**
     * @param {string|[string]} pairs 
     */
    async watchOrderbook(pairs) {
        if(this.#exchange.has['watchOrderBook']){
            return this.request(pairs, 'watchOrderBook', 'orderbooks');
        } else {
            await this.iterator(pairs, 'fetchOrderBook', 'orderbooks');
            return this.#exchange.orderbooks;
        }
    } 
    /**
     * @param {string|[string]} pairs 
     */    
    async watchTradeHistory(pairs) {
        if(this.#exchange.has['watchTrades']){
            return this.request(pairs, 'watchTrades', 'trades');
        } else {
            await this.iterator(pairs, 'fetchTrades', 'trades');
            return this.#exchange.trades;
        }
    } 
    /**
     * @param {string|[string]} pairs 
     */    
    async watchTicker(pairs) {
        if(this.#exchange.has['watchTicker']){
            return this.request(pairs, 'watchTicker', 'tickers');
        } else {
            await this.iterator(pairs, 'fetchTicker', 'tickers');
            return this.#exchange.tickers;
        }
    } 
    /**
     * @param {string|[string]} pairs 
     */
    async watchCandles(pairs) {
        if(this.#exchange.has['watchOHLCV']){
            return this.request(pairs, 'watchOHLCV', 'ohlcvs');
        } else {
            await this.iterator(pairs, 'fetchOHLCV', 'ohlcvs');
            return this.#exchange.ohlcvs;
        }
    } 

    terminate() { 
        Object.keys(this.#subscribers).forEach(prop => {
            Object.keys(this.#subscribers[prop]).forEach(pair => {
                Object.keys(this.#subscribers[prop][pair]).forEach(id => {
                    this.unsubscribe(id, prop, pair);
                });
            });
        });
        this.#whileLoopFlag = false;
    }
    async saveHistoricalCandles(pairs, since = this.#exchange.milliseconds() - 86400000, timeframe = { unit: 'minute', amount: 1 }) {
        if(typeof pairs === 'string') pairs = [pairs];
        const originalSince = since;
        
        for(const pair of pairs) {
            const fileName = `${this.name}-${pair.replace('/', '_')}-${this.#getInterval(timeframe)}`;
            const filePath = path.resolve(`./historicalData/${fileName}.csv`); 
            let exists;
            try {
                await fs.promises.access(filePath);
                exists = true;
            } catch(e) {
                exists = false;
            }
            
            if(!exists){
                const header = 'date,open,high,low,close,volume\n';
                await fs.promises.appendFile(filePath, header)
            } else {
                const inStream = fs.createReadStream(filePath);
                const outStream = new Stream();
                const rl = readline.createInterface(inStream, outStream);
                let lastLine;
                rl.on('line', line => lastLine = line);
                const promise = new Promise((resolve, reject) => {
                    inStream.on('end', () => {
                        resolve(Number(lastLine.split(',')[0]));
                    });
                });
                since = await promise + 1;
            }

            while(since < this.#exchange.milliseconds()) {
                let candles = await this.#exchange.fetchOHLCV(pair, this.#getInterval(timeframe), since, 1000);
                candles.sort((a, b) => a[0]- b[0]);
                
                if(candles.length > 0){
                    since = candles[candles.length-1][0]+1;

                    const lastDate = candles[candles.length-1][0];
                    const nowDate = this.#exchange.milliseconds();
                    const interval = this.#getMilliseconds(timeframe);
                    if(nowDate - lastDate < interval) candles.pop();

                    candles.forEach(async c => {
                        const data = `${c[0]},${c[1]},${c[2]},${c[3]},${c[4]},${c[5]}\n`;
                        await fs.promises.appendFile(filePath, data);
                    });
                } else {
                    since = originalSince;
                    sortHistoricalData(fileName);
                    break;
                }
            }
        }
    }
    /**
     * Subscribes given strategy from given exchange property changes.
     * @param {string} id 
     * @param {string} prop 
     * @param {string} pair
     * @param {function} callback 
     */
    subscribe(id, prop, pair, callback) { 
        this.#subscribers[prop][pair][id] = callback;
    }
    /**
     * Unsubscribes given strategy from given exchange property changes.
     * @param {string} id 
     * @param {string} prop 
     * @param {string} pair
     */
    unsubscribe(id, prop, pair) {
        delete this.#subscribers[prop][pair][id]; 
    }

    /**
     * Uses Object.defineProperty on pairs on given props.
     * @param {string|[string]} pairs 
     * @param {string} getSetProp 
     * @param {string} dataProp 
     * @returns 
     */
    setupObservers(pairs, originalProp, dataProp) {
        if(typeof pairs === 'string') pairs = [pairs];
        if(!(pairs instanceof Array)) return null;
        pairs = pairs.filter(pair => this.pairs.includes(pair));
        if(pairs.length === 0) return null;

        const exchange = this.getExchange();
        const callbacks = (function(prop, pair) {
            Object.values(this.#subscribers[prop][pair]) 
                  .forEach(callback => callback());
        }).bind(this);

        for(const pair of this.pairs) {
            this.#exchange[dataProp][pair] = null;
            this.#subscribers[originalProp][pair] = {}; 
            Object.defineProperty(this.#exchange[originalProp], pair, {
                get: function() {
                    return exchange[dataProp][pair];
                }, 
                set: function(value) {
                    exchange[dataProp][pair] = value;
                    callbacks(originalProp, pair);
                }
            });          
        }
    }

    /**
     * Transforms { unit: 'minute', amount: 5 } into '5m'.
     * @param {{unit:String,amount:Number}} interval 
     * @returns {String}
     */
    #getInterval(interval) {
        const time = {
            second: 's',
            minute: 'm',
            hour: 'h'
        }
        return interval.amount + time[interval.unit];
    }

    async loadMarkets() {
        const markets = await this.#exchange.loadMarkets();
        this.precision = this.#exchange.currencies;
        this.pairs = this.#exchange.symbols;
        this.minimums = {};
        for(const pair in this.#exchange.markets) 
            this.minimums[pair] = this.#exchange.markets[pair].limits.amount;       
    }

    /**
     * Checks if exchange supports fetching orderbook, trades, ticker and candles.
     * @returns {boolean}
     */
    hasNeededMethods() {
        const testedMethods = [
            'fetchOrderBook',    
            'fetchTrades',
            'fetchTicker',
            'fetchOHLCV'
        ];
        return testedMethods.every(method => {
            return Boolean(this.#exchange.has[method]);
        });
    }

    /**
     * Gets the ccxt exchange object itself.
     * @returns {}
     */
    getExchange() {
        return this.#exchange;
    }
}

export { PublicExchange };
export default class PublicExchangeFactory {
    static async create(name, isTest) {
        const newExchange = new PublicExchange(name, isTest);
        if(!newExchange.hasNeededMethods()) return null;
        try {
            await newExchange.loadMarkets();

            newExchange.setupObservers(newExchange.pairs, 'tickers', 'realTickers');
            newExchange.setupObservers(newExchange.pairs, 'trades', 'realTrades');
            newExchange.setupObservers(newExchange.pairs, 'ohlcvs', 'realOhlcvs');

            return newExchange;
        } catch(error) {
            console.error('Couldn\'t load markets', error);
            return null;
        }
    }
}