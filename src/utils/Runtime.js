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
            case 'minute':    return `* */${interval.amount} * * * *`;
            case 'hour':      return `* * */${interval.amount} * * *`;
            case 'day-month': return `* * * */${interval.amount} * *`;
            case 'month':     return `* * * * */${interval.amount} *`;
            case 'day-week':  return `* * * * * */${interval.amount}`;
        }
    }

    static createJob(strategyObject) {
        this.#jobs[strategyObject.ID] = new CronJob({
            cronTime: this.#getCronTime(strategyObject.interval),
            context: strategyObject.getContext(),
            onTick: strategyObject.run,
            start: true
        });
    }

    static terminateJob(strategyObject) {
        this.#jobs[strategyObject.ID].stop();
        let report = strategyObject.report();
        strategyObject.terminate();
        delete this.#jobs[strategyObject.ID];
        return report;
    }
}

class Live {
    static createJob(strategyObject) {
        const { ID, propToListen, run } = strategyObject;
        const exchange = ExchangeManager.getPublic();
        exchange.subscribe(ID, propToListen, run.bind(strategyObject));
    }

    static terminateJob(strategyObject){
        const { ID, propToListen } = strategyObject;
        const exchange = ExchangeManager.getPublic();
        exchange.unsubscribe(ID, propToListen);
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
        if(!params.ID) params.ID = Date.now() + this.#incrementalIds++;

        if(hasThreadAvailable()) {
            const worker = new Worker('./src/utils/worker.js', { workerData: params });
            this.#workers[params.ID] = worker;

            worker.on('exit', () => {
                console.log(`Worker ${params.ID} finished.`);
                delete this.#workers[params.ID];
                while(hasThreadAvailable() && this.#jobIds().length) {
                    const id = Object.keys(this.#jobs)[0];
                    const stratParams = this.#jobs[id];
                    delete this.#jobs[id];
                    this.createJob(stratParams);
                }
            });

            worker.on('message', msg => {
                if(msg.type == 'report'){
                    StrategyManager.setReport(msg.result);
                }
            });

        } else if(!this.#jobIds().includes(params.ID)){
            this.#jobs[params.ID] = params;
        }
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
        else if(strategyObject.runtime === 'back') Backtest.createJob(strategyObject);
    }
    static terminateJob(strategyObject) {
        if(strategyObject.runtime === 'live') Live.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'tick') Tick.terminateJob(strategyObject);
        else if(strategyObject.runtime === 'back') Backtest.terminateJob(strategyObject);        
    }
}