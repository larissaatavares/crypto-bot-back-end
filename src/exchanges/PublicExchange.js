import ccxt from 'ccxt';
export default class PublicExchange {
    #exchange; // TODO: make Public and private exchange methods similar

    constructor(name) {
        this.#exchange = new ccxt.pro.binance() //temp, just so i can acess methods
        if(ccxt.pro.exchanges.includes(name)){
            //this.#exchange = new ccxt.pro[name](); // uncomment this
        } else {
            //this.#exchange = new ccxt[name](); // uncomment this
        }            

        this.orderbooks = this.#exchange.orderbooks;
        this.tradeHistory = this.#exchange.trades;
        this.candles = {};
        this.info = {
            fees: this.#exchange.fees,
            limits: this.#exchange.limits,
            markets: this.#exchange.markets,
        }
    }

    /**
     * These methods work with the default behavior of ccxt.
     * If any of these methods isn't available for a given
     * exchange, the child class will polyfill it. 
     * In the perfect case, nothing is overriden.
     */

    async getOrderbook() {}
    async getTradeHistory() {}
    async getTicker() {}
    async getCandles() {}

    async watchOrderbook() {}
    async watchTradeHistory() {}
    async watchTicker() {}
    async watchCandles() {}
}