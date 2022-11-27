import OCOOrder from './OCOOrder.js';
import TrailingOrder from './TrailingOrder.js';
import StoplossOrder from './StoplossOrder.js';
import MarketOrder from './MarketOrder.js';

const STRATEGY_CLASSES = {
    OCOOrder,
    TrailingOrder,
    StoplossOrder,
    MarketOrder
};

class StrategyManager {
    static #strategies = {}; // key: id, value: strategy object

    static create() {}
    static edit() {}
    static delete() {}
    static getByUser() {}
    static getById() {}
}

export default StrategyManager;