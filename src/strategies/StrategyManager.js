import Runtime from '../utils/Runtime.js';
import Strategy from '../database/Strategy.js';
import STRATEGY_CLASSES from './STRATEGY_CLASSES.js';

class StrategyManager {
    static #strategies = {}; // key: id, value: strategy object
    static #report = {}; // key: id, value: report object

    static async startAll() {
        const strats = await Strategy.findAll();
        strats.forEach(async params => {
            let data = JSON.parse(params.data);
            data.id = params.id;
            await this.create(data, false);
        });
    }

    /**
     * Creates strategy and returns id.
     * @param {
     *  {
     *   userId: string,
     *   type: string,
     *   runtime: string,
     *   interval: { unit: string, amount: number },
     *   exchange: string,
     *   pair: string,
     *   start?: number,
     *   end?: number,
     *   period?: number,
     *   propToListen?: string,
     *   cronSettings?: { unit: string, amount: number }
     *  }
     * } params 
     * @returns {string} - Newly generated Strategy Id.
     */
    static async create(params, isNew = true) {
        if(params.runtime !== 'back') {
            if(isNew){
                const strategyDb = await Strategy.create({
                    data: JSON.stringify(params),
                    userId: params.userId,
                    type: params.type
                });
                params.id = strategyDb.id;    
            }
            const strategyObj = new STRATEGY_CLASSES[params.type](params);
            this.#strategies[params.id] = strategyObj; 
            await Runtime.createJob(strategyObj);
            return params.id;
        } else {
            const id = await Runtime.createJob(params);
            this.#strategies[id] = params;
            return id;
        }
    }

    /**
     * Edit and save changes.
     * @param {string} strategyId
     * @param {[[key,value]]} params 
     */
    static async edit(strategyId, params) {
        const strategy = this.getById(strategyId);
        if(strategy.runtime === 'back') return false;
        await this.#strategies[strategyId].edit(params);
        return true;
    }

    static shutdown(strategyId) {
        if(strategyId){
            let strategy = this.getById(strategyId);
            Runtime.shutdown(strategy); 
        } else {
            Object.values(this.#strategies).forEach(strategy => {
                Runtime.shutdown(strategy);
            });
        }
    }

    static async delete(strategyId) {
        Runtime.terminateJob(this.#strategies[strategyId]);
        const strategy = this.getById(strategyId);
        if(strategy.runtime !== 'back') await strategy.terminate();
        delete this.#strategies[strategyId];
    }

    static getByUser(userId) {
        let result = [];
        for(const id in this.#strategies) 
            if(this.#strategies[id].userId === userId)
                result.push(this.#strategies[id]);
        return result;
    }

    static getById(strategyId) {
        for(const id in this.#strategies) 
            if(strategyId === id) 
                return this.#strategies[id];
        return null;
    }

    static addReport(data) {
        this.#report[data.id] = data.report;
    }

    static getReport(strategyId) {
        return this.#report[strategyId];
        // TODO: in the future, will save reports in database
    }
}

export default StrategyManager;