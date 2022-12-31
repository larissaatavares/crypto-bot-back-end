import BaseStrategy from './BaseStrategy.js';

class MarketOrder extends BaseStrategy {
    #orders = [];
    #side;

    constructor(params) {
        super(params);

        this.#side = params.side;
    }

    async #getTicker() {
        return (await this.publicExchange.getTicker(this.pair))[this.pair];
    };

    async run(data) {
        await super.init();

        return new Promise(async (resolve, reject) => {
            let ticker = await this.#getTicker();
            const minimum = this.privateExchange.markets[this.pair].limits.amount.min;
            const amount = (() => {
                const coins = this.pair.split('/'); // [0] is base, [1] is quote, eg: 'BTC/USDT'
                if(this.#side === 'buy') return this.claimed.notInUse[coins[1]];
                else if(this.#side === 'sell') return this.claimed.notInUse[coins[0]];
            })();
            const defaultParams = {
                pair: this.pair,
                type: 'limit', 
                side: this.#side,
                amount,
                price: this.#side === 'buy' ? (ticker.ask + 100) : (ticker.bid - 100)
            };
            let currentOrder = await this.privateExchange.sendOrder(defaultParams);
            this.#orders.push(currentOrder);

            while(currentOrder.status === 'open') {
                if(currentOrder.remaining < minimum) break;
                await this.privateExchange.cancelOrderById(currentOrder.id, currentOrder.symbol);
                ticker = await this.#getTicker();
                defaultParams.price = this.#side === 'buy' ? (ticker.ask + 100) : (ticker.bid - 100);
                currentOrder = await this.privateExchange.sendOrder(defaultParams);
                this.#orders.push(currentOrder);
            }

            resolve(this.report());
        });
    }

    report() { // Will return an amalgam of all orders.
        return {
            ids: this.#orders.map(o => o.id),
            timestamp: Date.now(),
            symbol: this.pair,
            type: 'market',
            side: this.#side,
            amount: this.#orders.map(o => o.amount).reduce((acc, val) => acc += val),
            cost: this.#orders.map(o => o.cost).reduce((acc, val) => acc += val),
            status: 'closed',
            timeInForce: 'FOK',
            trades: this.#orders.flatMap(o => o.trades),
            average: this.#orders.map(o => o.average).reduce((acc, val) => acc += val),
            price: this.#orders.map(o => o.price).reduce((acc, val) => acc += val) / this.#orders.length,
            fee: this.#orders.map(o => o.fee).reduce((acc, val) => acc += val),
            isEmulated : true
        };      
    }
}

export default async params => {
    const market = new MarketOrder(params);
    const order = await market.run();
    return order;
}