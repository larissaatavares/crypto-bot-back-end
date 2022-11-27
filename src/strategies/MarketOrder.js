import BaseStrategy from './BaseStrategy.js';

export default class MarketOrder extends BaseStrategy {
    #data = {}; // data specific to the strat
    #results = {}; // report data

    constructor(params) {
        super(params);

        this.#data = Object.assign({
            // needs to track open orders
            // keep going
            // ...
        }, params);
        delete this.#data.userId;
    }
}