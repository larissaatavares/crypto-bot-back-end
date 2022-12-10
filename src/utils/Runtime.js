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
            case 'hour':      return `0 0 0/${interval.amount} * * *`;
            case 'day-month': return `0 0 0 0/${interval.amount} * *`;
            case 'month':     return `0 0 0 0 0/${interval.amount} *`;
            case 'day-week':  return `0 0 0 0 0 0/${interval.amount}`;
        }
    }

    static createJob(strategyObject) {
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
    static createJob(strategyObject) {
        const { id, propToListen, run } = strategyObject;
        const exchange = ExchangeManager.getPublic();
        exchange.subscribe(id, propToListen, run.bind(strategyObject));
    }

    static terminateJob(strategyObject){ 
        const { id, propToListen, run } = strategyObject;
        const report = strategyObject.report();
        StrategyManager.addReport({ id, report });        
        const exchange = ExchangeManager.getPublic();
        exchange.unsubscribe(id, propToListen, run.bind(strategyObject))
    }
}

class Backtest {
    static #incrementalIds = 0;
    static #jobs = {};
    static #workers = {};

    static #jobIds() { return Object.keys(this.#jobs) }
    static #workerIds() { return Object.keys(this.#workers) }

    static createJob(params) {
        const hasThreadAvailable = () => this.#jobIds().length < os.cpus().length - 1;
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
    static createJob(strategyObject) {
        if(strategyObject.runtime === 'live') Live.createJob(strategyObject);
        else if(strategyObject.runtime === 'tick') Tick.createJob(strategyObject);
        else if(strategyObject.runtime === 'back') return Backtest.createJob(strategyObject);
    }
    static terminateJob(strategyObject) {
        if(strategyObject.runtime === 'live') Live.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'tick') Tick.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'back') Backtest.terminateJob(strategyObject);  
        if(strategyObject.runtime !== 'back') strategyObject.terminate();
    }
    static shutdown(strategyObject) {
        if(strategyObject.runtime === 'live') Live.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'tick') Tick.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'back') Backtest.terminateJob(strategyObject);     
    }
}