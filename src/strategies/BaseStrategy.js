import ExchangeManager from '../exchanges/ExchangeManager.js';

export default class BaseStrategy {
    ID;
    USER_ID;
    PRIVATE_EXCHANGE;
    PUBLIC_EXCHANGE;

    constructor(params) {
        this.USER_ID = params.userId;
        this.ID; // grab from db
        this.PRIVATE_EXCHANGE; // grab from ExchangeManager
        this.PUBLIC_EXCHANGE; // grab from ExchangeManager
    }

    run() {} // runs strat
    save() {} // save data after each change
    terminate() {} // tidies up before terminating
    notify() {} // notifies everyone that wants to know about changes
    report() {} // gives report
}