import ccxt from 'ccxt';
import StrategyManager from '../strategies/StrategyManager.js';
import User from '../database/User.js';
import Big from 'big.js';

class PrivateExchange {
    #exchange;
    markets;
    pairs;
    trades = {};
    orders = {};

    constructor(name, authConfig, isTest = false) {
        const config = Object.assign({
            newUpdates: false
        }, isTest ? authConfig.test : authConfig.prod); 
        
        if(ccxt.pro.exchanges.includes(name)) this.#exchange = new ccxt.pro[name](config); 
        else this.#exchange = new ccxt[name](config); 

        if(isTest) this.#exchange.setSandboxMode(true);
        this.#exchange.options['warnOnFetchOpenOrdersWithoutSymbol'] = false;
    }

    /**
     * Override this when needed.
     */
    async authenticate() {}

    getInfo() { // works
        return this.#exchange.describe();
    }

    async getAllOrders() { // works
        const orders = await this.#exchange.fetchOpenOrders();
        orders.forEach(order => {
            const pair = order.symbol;
            if(!this.orders[pair].map(o => o.id).includes(order.id))
                this.orders[pair].push(order);
        });
        return this.orders;
    }
    async getOrdersByPair(pair) { // works
        if(!this.isValidPair(pair)) return null;
        const orders = await this.#exchange.fetchOpenOrders(pair);
        orders.forEach(order => {
            if(!this.orders[pair].map(o => o.id).includes(order.id))
                this.orders[pair].push(order);
        });
        return this.orders[pair];
    }
    async getOrderById(orderId, pair) { // works, but requires pair. not what i had in mind
        if(!this.isValidPair(pair)) return null;
        try {
            return await this.#exchange.fetchOrder(orderId, pair);
        } catch(error) {
            console.log(error.message);
            return null;
        }
    } 
    async getAllTrades() { // works, but painfully slowly
        let pairs = [...this.pairs];
        while(pairs.length) {
            const pair = pairs.pop();
            this.trades[pair] = await this.getTradesByPair(pair);
        }
        return this.trades;
    }
    async getTradesByPair(pair) { // works
        if(!this.isValidPair(pair)) return null;
        const trades = await this.#exchange.fetchMyTrades(pair);
        trades.forEach(trade => {
            if(!this.trades[pair].map(t => t.id).includes(trade.id))
                this.trades[pair].push(trade);
        });
        return this.trades[pair];
    }

    watchOrders() { // works only on creation, not edition or deletion
        this.pairs.forEach(pair => {
            this.#exchange.watchOrders(pair).then(res => {
                console.log('orders', res);
            });
        });

        /**
         *     
            orders ArrayCacheBySymbolById(1) [
            {
                info: {
                    e: 'executionReport',
                    E: 1670854996924,
                    s: 'ETHUSDT',
                    c: 'x-R4BD3S82551cc248b7234256acc260',
                    S: 'BUY',
                    o: 'LIMIT',
                    f: 'GTC',
                    q: '0.01000000',
                    p: '1000.00000000',
                    P: '0.00000000',
                    F: '0.00000000',
                    g: -1,
                    C: '',
                    x: 'NEW',
                    X: 'NEW',
                    r: 'NONE',
                    i: 14736173,
                    l: '0.00000000',
                    z: '0.00000000',
                    L: '0.00000000',
                    n: '0',
                    N: null,
                    T: 1670854996923,
                    t: -1,
                    I: 32329635,
                    w: true,
                    m: false,
                    M: false,
                    O: 1670854996923,
                    Z: '0.00000000',
                    Y: '0.00000000',
                    Q: '0.00000000'
                },
                symbol: 'ETH/USDT',
                id: '14736173',
                clientOrderId: 'x-R4BD3S82551cc248b7234256acc260',
                timestamp: 1670854996923,
                datetime: '2022-12-12T14:23:16.923Z',
                lastTradeTimestamp: undefined,
                type: 'limit',
                timeInForce: 'GTC',
                postOnly: undefined,
                side: 'buy',
                price: 1000,
                stopPrice: 0,
                amount: 0.01,
                cost: 0,
                average: undefined,
                filled: 0,
                remaining: 0.01,
                status: 'open',
                fee: undefined,
                trades: undefined
            }
            ]
         */
    } 
    watchTrades() { // works only on creation, not edition or deletion
        this.pairs.forEach(pair => {
            this.#exchange.watchMyTrades(pair).then(res => {
                console.log('trades', res);
            });
        });
    }
    watchBalances() { // works only on creation, not edition or deletion
        this.#exchange.watchBalance().then(res => {
            console.log('balances', res);
        });

        /**
            balances {
                info: {
                    e: 'outboundAccountPosition',
                    E: 1670854996924,
                    u: 1670854996923,
                    B: [ [Object], [Object] ]
                },
                ETH: { free: 100, used: 0, total: 100 },
                USDT: { free: 9850, used: 150, total: 10000 },
                timestamp: 1670854996924,
                datetime: '2022-12-12T14:23:16.924Z',
                free: { ETH: 100, USDT: 9850 },
                used: { ETH: 0, USDT: 150 },
                total: { ETH: 100, USDT: 10000 }
            }
         */
    }   

    /**
     * 
     * @param {{pair:string,type:string,side:string,amount:number,price:number}} params 
     * @returns {import('ccxt').Order} 
     */
    async sendOrder(params) {
        let { pair, type, side, amount, price, stratArgs } = params;
        if(side !== 'buy' && side !== 'sell') return null;
        if(!this.isValidPair(pair)) return null;
    
        if(side === 'buy') amount /= price;
        price = Number(this.#exchange.priceToPrecision(pair, price));
        amount = Number(this.#exchange.amountToPrecision(pair, amount));

        if(!this.areOrderParamsValid(amount, price, pair)) return null;
        
        if(type === 'market') {
            if(this.#exchange.hasCreateMarketOrder){
                const ticker = await this.#exchange.fetchTicker(pair);
                price = side === 'buy' ? ticker.bid : ticker.ask;
                return await this.#exchange.createMarketOrder(pair, side, amount, price);
            } else {
                return StrategyManager.create(stratArgs);
            }
        } else if(type === 'stoploss') {
            return await StrategyManager.create(stratArgs);
        } else if(type === 'trailing') {
            return await StrategyManager.create(stratArgs);
        } else if(type === 'limit') {
            try {
                return await this.#exchange.createLimitOrder(pair, side, amount, price);
            } catch(error) {
                console.log(error.message);
                return null;
            }
        } else {
            return null;
        }
    }
    async editOrder(orderId, pair, newAmount, newPrice) {
        if(!this.isValidPair(pair)) return null;
        const order = await this.getOrderById(orderId, pair);
        if(!order) return null;
        const { id, symbol, type, side, amount, price, status } = order;

        if(status !== 'open') return null;

        if(!newPrice) newPrice = price;
        if(!newAmount) newAmount = amount;
        if(side === 'buy') newAmount /= newPrice;
        else newAmount = amount;

        newPrice = Number(this.#exchange.priceToPrecision(pair, newPrice));
        newAmount = Number(this.#exchange.amountToPrecision(pair, newAmount));

        if(this.areOrderParamsValid(newAmount, newPrice, symbol)){
            const args = [ id, symbol, type, side, newAmount, newPrice ];
            try {
                return await this.#exchange.editOrder(...args); 
            } catch(error) {
                console.log(error.message);
                return null;
            }
        } else {
            return null;
        }
    }

    async cancelAllOrders() { // works
        let responses = [];
        let pairs = [...this.pairs];
        while(pairs.length) {
            const pair = pairs.pop();
            responses.push(...(await this.cancelOrderByPair(pair)));
        }
        return responses;
    }
    async cancelOrderByPair(pair) { // works
        if(!this.isValidPair(pair)) return null;
        try {
            return await this.#exchange.cancelAllOrders(pair);
        } catch(error) {
            //console.log(pair, 'There aren\'t orders for this pair.');
            return [];
        }
    }   
    async cancelOrderById(orderId, pair) { // works, but requires pair. not what i had in mind
        if(!this.isValidPair(pair)) return null;
        try {
            return await this.#exchange.cancelOrder(orderId, pair);
        } catch(error) {
            //console.log(orderId, 'There aren\'t orders with this id.');
            return null;
        }
    }

    async getBalance() { // TODO: needs to reserve amounts for strats and not give it away to other strats
        return await this.#exchange.fetchBalance();
    }

    isValidPair(pair) { // works
        return this.pairs.includes(pair);
    }
    areOrderParamsValid(amount, price, pair) { // works
        if(amount >= this.markets[pair].limits.amount.min
            && amount <= this.markets[pair].limits.amount.max
            && price >= this.markets[pair].limits.price.min
            && price <= this.markets[pair].limits.price.max) 
        {
            return true;
        } else {
            return false;
        }
    }
    hasNeededMethods() { // placeholder
        return true;
    }
    getExchange() { // works
        return this.#exchange;
    }
}

export { PrivateExchange };
export default class PrivateExchangeFactory {
    static async create(name, userId, isTest) {
        const user = await User.findByPk(userId);
        const authConfig = {
            test: JSON.parse(user.exchangeAuthTest)[name],
            prod: JSON.parse(user.exchangeAuthProd)[name]
        }
        const newExchange = new PrivateExchange(name, authConfig, isTest);

        newExchange.markets = await newExchange.getExchange().loadMarkets();
        newExchange.pairs = Object.keys(newExchange.markets);
        newExchange.pairs.forEach(pair => {
            newExchange.trades[pair] = [];
            newExchange.orders[pair] = [];
        });
        //newExchange.watchBalances();
        //newExchange.watchOrders();
        //newExchange.watchTrades();
        
        if(!newExchange.hasNeededMethods()) return null;
        else return newExchange;
    }
}