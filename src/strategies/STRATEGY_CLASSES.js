import OCOOrder from './OCOOrder.js';
import TrailingOrder from './TrailingOrder.js';
import StoplossOrder from './StoplossOrder.js';
import MarketOrder from './MarketOrder.js';
import BaseStrategy from './BaseStrategy.js';

export default class STRATEGY_CLASSES { 
    static OCOOrder = OCOOrder;
    static TrailingOrder = TrailingOrder;
    static StoplossOrder = StoplossOrder;
    static MarketOrder = MarketOrder;
    static BaseStrategy = BaseStrategy;
}