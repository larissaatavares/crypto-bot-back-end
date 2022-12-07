import OCOOrder from './OCOOrder.js';
import TrailingOrder from './TrailingOrder.js';
import StoplossOrder from './StoplossOrder.js';
import MarketOrder from './MarketOrder.js';
import BaseStrategy from './BaseStrategy.js';

import Runtime from '../utils/Runtime.js';
import Strategy from '../database/Strategy.js';

class STRATEGY_CLASSES {
    static OCOOrder = OCOOrder;
    static TrailingOrder = TrailingOrder;
    static StoplossOrder = StoplossOrder;
    static MarketOrder = MarketOrder;
    static BaseStrategy = BaseStrategy;
}

class StrategyManager {
    static #strategies = {}; // key: id, value: strategy object

    /**
     * 
     * @param {{id:undefined,userId:String,type:String,runtime:String,interval?:{unit:String,amount:Number}}} params 
     * @returns {String} - Newly generated Strategy Id.
     */
    static async create(params) {
        // do it different for backtests
        if(params.runtime !== 'back') {
            const strategyDb = await Strategy.create({
                data: JSON.stringify(params),
                userId: params.userId,
                type: params.type
            });
            params.id = strategyDb.id;
            let strategyObj = new STRATEGY_CLASSES[type](params);
            this.#strategies[params.id] = strategyObj;
            Runtime.createJob(strategyObj);
            return params.id;
        } else {
            Runtime.createJob(params);
        }
    }

    static edit(strategyId, params) {
        this.#strategies[strategyId].edit(params);
    }

    static delete(strategyId) {
        const report = Runtime.terminateJob(this.#strategies[strategyId]);
        return report;
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
    }

    // Finish
    static setReport() {

    }

    // Change
    static getReport(strategyId) {
        return this.#strategies[strategyId].report();
    }
}

export { STRATEGY_CLASSES };
export default StrategyManager;