import BaseStrategy from './BaseStrategy.js';
import StrategyManager from './StrategyManager.js';

// Reference: https://www.investopedia.com/terms/s/stop-lossorder.asp

export default class StoplossOrder extends BaseStrategy {
    #offset;       // number, percentage or absolute value 
    #stoplossType; // 'percentage' or 'absolute'
    #side;         // 'buy' or 'sell'
    #stoplossPrice;// number, stop price
    #getTicker;    // reference to ticker values in exchange

    constructor(params) {
        super(params);

        this.#offset = params.offset; 
        this.#stoplossType = params.stoplossType; 
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

        if(!this.#stoplossPrice) {
            this.#stoplossPrice = (() => {
                if(this.#stoplossType === 'percentage') {
                    if(this.#side === 'buy') latestPrice + latestPrice / 100 * this.#offset;
                    else if(this.#side === 'sell') return latestPrice - latestPrice / 100 * this.#offset;
                } else if(this.#stoplossType === 'absolute') {
                    if(this.#side === 'buy') return latestPrice + this.#offset;
                    else if(this.#side === 'sell') return latestPrice - this.#offset;
                }                
            })();
        }

        if( (this.#side === 'buy' && this.#stoplossPrice <= latestPrice)
            || (this.#side === 'sell' && this.#stoplossPrice >= latestPrice)
        ) {
            const amount = (() => {
                const coins = this.pair.split('/'); // [0] is base, [1] is quote, eg: 'BTC/USDT'
                if(this.#side === 'buy') return this.claimed.notInUse[coins[1]];
                else if(this.#side === 'sell') return this.claimed.notInUse[coins[0]];
            })();

            if(this.runtime !== 'back') {
                this.order = await this.privateExchange.sendOrder({
                    type: 'market', 
                    side: this.#side,
                    pair: this.pair,
                    price: this.#stoplossPrice,
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
            stoplossType: this.#stoplossType,
            stoplossPrice: this.#stoplossPrice,
            pair: this.pair,
            amount: this.claimed,
            side: this.#side,
            offset: this.#offset,
            order: this.order
        }
    }

    #getClone() {
        return {
            offset: this.#offset,
            stoplossType: this.#stoplossType,
            side: this.#side,
            stoplossPrice: this.#stoplossPrice
        }
    }
}