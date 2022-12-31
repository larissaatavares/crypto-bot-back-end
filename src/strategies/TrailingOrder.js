import BaseStrategy from './BaseStrategy.js';
import StrategyManager from './StrategyManager.js';

// Reference: https://www.investopedia.com/articles/trading/08/trailing-stop-loss.asp

export default class TrailingOrder extends BaseStrategy {
    #offset;       // number, percentage or absolute value 
    #trailingType; // 'percentage' or 'absolute'
    #side;         // 'buy' or 'sell'
    #trailingPrice;// number, trailing price
    #getTicker;    // reference to ticker values in exchange
    #trailingPriceHistory = []; // used to make charts later
    // [ timestamp, latestPrice, trailingPrice ], from oldest to newest.

    constructor(params) {
        super(params);

        this.#offset = params.offset; 
        this.#trailingType = params.trailingType; 
        this.#side = params.side;
    }

    async init() {
        if(this.runtime === 'back') {
            this.#getTicker = data => {
                return { 
                    timestamp:  data.candle.date,
                    open:       data.candle.open,
                    bid:        data.candle.close, 
                    ask:        data.candle.close,
                    high:       data.candle.high,
                    low:        data.candle.low,
                    baseVolume: data.candle.volume,
                    close:      data.candle.close
                }                 
            }
            return;
        };

        await super.init();

        if(this.runtime === 'live') {
            this.#getTicker = () => this.publicExchange.getExchange().tickers[this.pair];
        } else if(this.runtime === 'tick') {
            this.#getTicker = async () => {
                return (await this.publicExchange.getTicker(this.pair))[this.pair];
            };
        } 
    }

    async run(data) {
        const ticker = await this.#getTicker(data);
        const latestPrice = this.#side === 'buy'? ticker.ask : ticker.bid;
        const currentTrailingPrice = (() => {
            if(this.#trailingType === 'percentage') {
                if(this.#side === 'buy') return latestPrice + latestPrice / 100 * this.#offset;
                else if(this.#side === 'sell') return latestPrice - latestPrice / 100 * this.#offset;
            } else if(this.#trailingType === 'absolute') {
                if(this.#side === 'buy') return latestPrice + this.#offset;
                else if(this.#side === 'sell') return latestPrice - this.#offset;
            }
        })();

        if( !this.#trailingPrice 
            || (this.#side === 'buy' && this.#trailingPrice > currentTrailingPrice)
            || (this.#side === 'sell' && this.#trailingPrice < currentTrailingPrice)
        ) {
            this.#trailingPrice = currentTrailingPrice;
            this.#trailingPriceHistory.push([ticker.timestamp, latestPrice, this.#trailingPrice]);
            await this.save();
        }

        if( (this.#side === 'buy' && this.#trailingPrice <= latestPrice)
            || (this.#side === 'sell' && this.#trailingPrice >= latestPrice)
        ) {
            const amount = (() => {
                const coins = this.pair.split('/'); // [0] is base, [1] is quote, eg: 'BTC/USDT'
                if(this.#side === 'buy') return this.claimed.notInUse[coins[1]];
                else if(this.#side === 'sell') return this.claimed.notInUse[coins[0]];
            })();
            const tail = this.#trailingPriceHistory.length - 1;
            if(this.#trailingPriceHistory[tail][0] !== ticker.timestamp)
                this.#trailingPriceHistory.push([ticker.timestamp, latestPrice, this.#trailingPrice]);

            if(this.runtime !== 'back') {
                this.order = await this.privateExchange.sendOrder({
                    type: 'market', 
                    side: this.#side,
                    pair: this.pair,
                    price: this.#trailingPrice,
                    amount,
                    stratArgs: {} // Will be used for strat MarketOrder, if native not present
                });    
                await this.save();
                await StrategyManager.delete(this.id);
            } else {
                this.order = {
                    timestamp: ticker.timestamp,
                    symbol: this.pair,
                    type: 'market',
                    side: this.#side,
                    price: latestPrice,
                    amount
                };
            }

            return true;
        }

        return false;
    }

    report() {
        return { 
            id: this.id,
            userId: this.userId,
            exchange: this.exchange,
            runtime: this.runtime,
            isTest: this.isTest,
            interval: this.interval,
            cronSettings: this.cronSettings,
            trailingType: this.#trailingType,
            trailingPrice: this.#trailingPrice,
            pair: this.pair,
            amount: this.claimed,
            side: this.#side,
            offset: this.#offset,
            order: this.order,
            trailingPriceHistory: this.#trailingPriceHistory
        }
    }

    #getClone() {
        return {
            offset: this.#offset,
            trailingType: this.#trailingType,
            side: this.#side,
            trailingPrice: this.#trailingPrice,
            trailingPriceHistory: this.#trailingPriceHistory
        }
    }
}