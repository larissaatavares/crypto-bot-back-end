import { CronJob } from 'cron';
import ExchangeManager from '../exchanges/ExchangeManager.js';
import StrategyManager from '../strategies/StrategyManager.js';
import { Worker } from 'worker_threads';
import os from 'os';

class Tick {
    static #jobs = {}; // key: strat id, value: cronObject

    /**
     * Transforms human readable intervals into cron intervals.
     * @param {{unit: String, amount: Number}} interval 
     * @returns {String} cronTime
     */
    static #getCronTime(interval) {
        switch(interval.unit) {
            case 'second':    return `*/${interval.amount} * * * * *`;
            case 'minute':    return `0 */${interval.amount} * * * *`;
            case 'hour':      return `0 0 */${interval.amount} * * *`;
            case 'day-month': return `0 0 0 */${interval.amount} * *`;
            case 'month':     return `0 0 0 0 */${interval.amount} *`;
            case 'day-week':  return `0 0 0 0 0 */${interval.amount}`;
        }
    }

    static async createJob(strategyObject) {
        await strategyObject.init();
        this.#jobs[strategyObject.id] = new CronJob({
            cronTime: this.#getCronTime(strategyObject.cronSettings),
            context: strategyObject.getContext(),
            onTick: strategyObject.run,
            start: true
        });
    }

    static terminateJob(strategyObject) {
        this.#jobs[strategyObject.id].stop();
        const report = strategyObject.report();
        StrategyManager.addReport({ id: strategyObject.id, report });
        delete this.#jobs[strategyObject.id];
    }
}

class Live {
    static async createJob(strategyObject) {
        const methods = {
            tickers: 'watchTicker',
            trades: 'watchTradeHistory',
            ohlcvs: 'watchCandles'
        }
        const { id, propToListen, pair } = strategyObject;
        const exchange = await ExchangeManager.getPublic(strategyObject.exchange);
        await exchange[methods[propToListen]](pair);
        await strategyObject.init();
        exchange.subscribe(id, propToListen, pair, () => strategyObject.run());
    }

    static terminateJob(strategyObject){ 
        const { id, propToListen, pair } = strategyObject;
        const report = strategyObject.report();
        StrategyManager.addReport({ id, report });        
        ExchangeManager.getPublic(strategyObject.exchange).then(exchange => {
            exchange.unsubscribe(id, propToListen, pair);
        });
    }
}

class Backtest {
    static #incrementalIds = 0;
    static #jobs = {};
    static #workers = {};

    static #jobIds() { return Object.keys(this.#jobs) }
    static #workerIds() { return Object.keys(this.#workers) }

    static createJob(params) {
        const hasThreadAvailable = () => this.#workerIds().length < os.cpus().length - 1;
        if(!params.id) params.id = String(Date.now() + this.#incrementalIds++);

        if(hasThreadAvailable()) {
            const worker = new Worker('./src/utils/worker.js', { workerData: params });
            this.#workers[params.id] = worker;

            worker.on('exit', () => {
                console.log(`Worker ${params.id} finished.`);
                delete this.#workers[params.id];
                while(hasThreadAvailable() && this.#jobIds().length) {
                    const id = Object.keys(this.#jobs)[0];
                    const stratParams = this.#jobs[id];
                    delete this.#jobs[id];
                    this.createJob(stratParams);
                }
            });

            worker.on('message', msg => {
                if(msg.type == 'report'){
                    StrategyManager.addReport({ id: params.id, report: msg.result });
                }
            });

        } else if(!this.#jobIds().includes(params.id)){
            this.#jobs[params.id] = params;
        }

        return params.id;
    }

    static terminateJob(id) { 
        if(this.#jobIds().includes(id)) {
            delete this.#jobs[id];
        } else if(this.#workerIds().includes(id)){
            const worker = this.#workers[id];
            worker.postMessage('terminate');
        } 
    }
}

export default class Runtime {
    static async createJob(strategyObject) {
        if(strategyObject.runtime === 'live') await Live.createJob(strategyObject);
        else if(strategyObject.runtime === 'tick') await Tick.createJob(strategyObject);
        else if(strategyObject.runtime === 'back') return Backtest.createJob(strategyObject);
    }
    static terminateJob(strategyObject) {
        if(strategyObject.runtime === 'live') Live.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'tick') Tick.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'back') Backtest.terminateJob(strategyObject.id);  
        if(strategyObject.runtime !== 'back') strategyObject.terminate();
    }
    static shutdown(strategyObject) {
        if(strategyObject.runtime === 'live') Live.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'tick') Tick.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'back') Backtest.terminateJob(strategyObject.id);     
    }
}