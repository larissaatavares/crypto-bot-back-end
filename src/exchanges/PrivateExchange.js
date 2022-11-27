import ccxt from 'ccxt';
export default class PrivateExchange {
    constructor(name, auth) {
        
    }

    getAllOrders() {}
    getOrderByPair() {}
    getOrderById() {}
    
    getAllTrades() {}
    getTradeByPair() {}
    getTradeById() {}

    watchOrders() {}
    watchTrades() {}
    watchBalances() {}

    sendOrder() {}
    editOrder() {}
    cancelAllOrders() {}
    cancelOrderByPair() {}
    cancelOrderById() {}

    getBalance() {}
    deposit() {}
    withdraw() {}
}