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
        orderbook: {}, // key: id String, value: callback Function
        ticker: {},    
        trades: {},    
        candles: {}    
    };

    #getMilliseconds = getMilliseconds;

    constructor(name) {
        this.name = name;
        if(ccxt.pro.exchanges.includes(name))
            this.#exchange = new ccxt.pro[name](this.#options); 
        else 
            this.#exchange = new ccxt[name](this.#options); 
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
        } else {
            //this.notify(prop);
        }
        return this.#exchange[prop];
    }
    async iterator(pairs, method, prop) {
        while(this.#whileLoopFlag) {
            await this.request(pairs, method, prop, true);
            this.notify(prop);
        }        
    }

    async getOrderbook(pairs) {
        return this.request(pairs, 'fetchOrderBook', 'orderbooks');
    } 
    async getTradeHistory(pairs) {
        return this.request(pairs, 'fetchTrades', 'trades');
    } 
    async getTicker(pairs) {
        return this.request(pairs, 'fetchTicker', 'tickers');
    } 
    async getCandles(pairs) {
        return this.request(pairs, 'fetchOHLCV', 'ohlcvs');
    } 

    async watchOrderbook(pairs) {
        if(this.#exchange.has['watchOrderBook']){
            return this.request(pairs, 'watchOrderBook', 'orderbooks');
        } else {
            await this.iterator(pairs, 'fetchOrderBook', 'orderbooks');
            return this.#exchange.orderbooks;
        }
    } 
    async watchTradeHistory(pairs) {
        if(this.#exchange.has['watchTrades']){
            return this.request(pairs, 'watchTrades', 'trades');
        } else {
            await this.iterator(pairs, 'fetchTrades', 'trades');
            return this.#exchange.trades;
        }
    } 
    async watchTicker(pairs) {
        if(this.#exchange.has['watchTicker']){
            return this.request(pairs, 'watchTicker', 'tickers');
        } else {
            await this.iterator(pairs, 'fetchTicker', 'tickers');
            return this.#exchange.tickers;
        }
    } 
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
            Object.keys(this.#subscribers[prop]).forEach(id => {
                this.unsubscribe(id, prop);
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
     * 
     * @param {String} id 
     * @param {String} prop 
     * @param {Function} callback 
     */
    subscribe(id, prop, callback) { // change tthis or strat notifier to match each other
        const alreadySubscribed = Object.keys(this.#subscribers[prop]).find(existingId => existingId === id);
        if(!alreadySubscribed) this.#subscribers[prop][id] = callback;
    }
    /**
     * 
     * @param {String} id 
     * @param {String} prop 
     */
    unsubscribe(id, prop) {
        const alreadySubscribed = Object.keys(this.#subscribers[prop]).find(existingId => existingId === id);
        if(alreadySubscribed) delete this.#subscribers[prop][id];
    }
    /**
     * 
     * @param {String} prop 
     */
    notify(prop) {
        Object.values(this.#subscribers[prop]).forEach(callback => callback());
    }

    /**
     * 
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

    getExchange() {
        return this.#exchange;
    }
}

export { PublicExchange };
export default class PublicExchangeFactory {
    static async create(name) {
        const newExchange = new PublicExchange(name);
        if(!newExchange.hasNeededMethods()) return null;
        try {
            await newExchange.loadMarkets();
            return newExchange;
        } catch(error) {
            console.error('Couldn\'t load markets', error.message);
            return null;
        }
    }
}