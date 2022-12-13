import PrivateExchange from "../../src/exchanges/PrivateExchange";
import { jest } from '@jest/globals';
import User from '../../src/database/User.js';
import config from '../../config.json' assert { type: 'json' }; // use .auth
import sequelize from '../../src/database/connection.js';

jest.setTimeout(60000);

const orderKeys = [
    'info',
    'id',
    'clientOrderId',
    'timestamp',
    'datetime',
    'lastTradeTimestamp',
    'symbol',
    'type',
    'timeInForce',
    'postOnly',
    'reduceOnly',
    'side',
    'price',
    'stopPrice',
    'amount',
    'cost',
    'average',
    'filled',
    'remaining',
    'status',
    'fee',
    'trades',
    'fees'
];

let exchange;
let userId;

beforeAll(async () => {
    const user = await User.create({
        email: 'test@gmail.com',
        password: '12345',
        exchangeAuthProd: JSON.stringify({ binance: config.auth.prod }),
        exchangeAuthTest: JSON.stringify({ binance: config.auth.test })
    });
    userId = user.id;
});

afterAll(async () => {
    const user = await User.findByPk(userId);
    await user.destroy();
    await sequelize.close();
    await exchange.cancelAllOrders();
});

test('PrivateExchange.create()', async () => {
    exchange = await PrivateExchange.create('binance', userId, true);
    expect(exchange).not.toBeNull();
});

test('Precision methods', () => {
    expect(Number(exchange.getExchange().amountToPrecision('BTC/USDT', 0.0506398715416846)))
        .toBe(0.050639);
    expect(Number(exchange.getExchange().priceToPrecision('BTC/USDT', 0.0506398715416846)))
        .toBe(0.05);
    expect(Number(exchange.getExchange().costToPrecision('BTC/USDT', 23546.616843418)))
        .toBe(23546.61684341);
    expect(Number(exchange.getExchange().currencyToPrecision('BTC', 0.0506398715416846)))
        .toBe(0.05063987);
});

let orderIdBTC;
let orderIdETH;
test('sendOrder()-limit-valid', async () => {
    const orderBTC = await exchange.sendOrder({
        pair: 'BTC/USDT',
        type: 'limit',
        side: 'buy',
        amount: 100,
        price: 12000
    });
    if(orderBTC) orderIdBTC = orderBTC.id;

    const orderETH = await exchange.sendOrder({
        pair: 'ETH/USDT',
        type: 'limit',
        side: 'buy',
        amount: 100,
        price: 1000
    });
    if(orderETH) orderIdETH = orderETH.id;

    expect(orderBTC).not.toBeNull();
    expect(orderETH).not.toBeNull();
    expect(Object.keys(orderBTC)).toEqual(orderKeys);
    expect(Object.keys(orderETH)).toEqual(orderKeys);
});
test('sendOrder()-limit-invalid', async () => {
    // Bad price
    const orderBTC = await exchange.sendOrder({
        pair: 'BTC/USDT',
        type: 'limit',
        side: 'buy',
        amount: 0.01,
        price: 0.001
    });

    // Bad amount
    const orderETH = await exchange.sendOrder({
        pair: 'ETH/USDT',
        type: 'limit',
        side: 'buy',
        amount: 0.00000000000000000009001,
        price: 1000
    });

    // Bad side
    const orderBNB = await exchange.sendOrder({
        pair: 'BNB/USDT',
        type: 'limit',
        side: 'the dark side',
        amount: 0.01,
        price: 1000
    });

    // Bad type
    const orderXRP = await exchange.sendOrder({
        pair: 'XRP/USDT',
        type: 'FOMObuy',
        side: 'buy',
        amount: 0.01,
        price: 1000
    });

    // Bad pair
    const orderBAD = await exchange.sendOrder({
        pair: 'BAD/USDT',
        type: 'limit',
        side: 'buy',
        amount: 0.01,
        price: 1000
    });

    expect(orderBTC).toBeNull();
    expect(orderETH).toBeNull();
    expect(orderBNB).toBeNull();
    expect(orderXRP).toBeNull();
    expect(orderBAD).toBeNull();
});

test('editOrder()-valid', async () => {
    const order = await exchange.editOrder(orderIdBTC, 'BTC/USDT', 200);
    expect(order).not.toBeNull();
    expect(Object.keys(order)).toEqual(orderKeys);
});
test('editOrder()-invalid', async () => {
    const badPair = await exchange.editOrder(orderIdBTC, 200);
    const badAmount = await exchange.editOrder(orderIdBTC, 'BTC/USDT', 2);
    const badPrice = await exchange.editOrder(orderIdBTC, 'BTC/USDT', undefined, 2);
    const badPriceAndAmount = await exchange.editOrder(orderIdBTC, 'BTC/USDT', 2, 3);
    const badTypes = await exchange.editOrder(orderIdBTC, 'BTC/USDT', '4', '5');

    expect(badPair).toBeNull();
    expect(badAmount).toBeNull();
    expect(badPrice).toBeNull();
    expect(badPriceAndAmount).toBeNull();
    expect(badTypes).toBeNull();
});

describe('Get open orders methods-valid', () => {
    test('getAllOrders()', async () => {
        const orders = await exchange.getAllOrders();
        expect(orders).not.toBeNull();
        expect(Object.keys(orders['BTC/USDT'][0])).toEqual(orderKeys);
    });
    test('getOrdersByPair()', async () => {
        const orders = await exchange.getOrdersByPair('BTC/USDT');
        expect(orders).not.toBeNull();
        expect(Object.keys(orders[0])).toEqual(orderKeys);
    });
    test('getOrderById()', async () => {
        const order = await exchange.getOrderById(orderIdETH, 'ETH/USDT');
        expect(order).not.toBeNull();
        expect(Object.keys(order)).toEqual(orderKeys);
    });
});
describe('Get open orders methods-invalid', () => {
    test('getOrdersByPair()', async () => {
        const badPair = await exchange.getOrdersByPair('123456');
        const badType = await exchange.getOrdersByPair(123456);

        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });
    test('getOrderById()', async () => {
        const badPair = await exchange.getOrderById('123456');
        const badType = await exchange.getOrderById(123456);

        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });
});

describe('Cancel Order methods-invalid', () => {
    test('cancelOrderById()', async () => {
        const badId = await exchange.cancelOrderById('123456');
        const badType = await exchange.cancelOrderById(123456);

        expect(badId).toBeNull();
        expect(badType).toBeNull();
    });
    test('cancelOrderByPair()', async () => {
        const badId = await exchange.cancelOrderByPair('123456');
        const badType = await exchange.cancelOrderByPair(123456);

        expect(badId).toBeNull();
        expect(badType).toBeNull();
    });
});
describe('Cancel Order methods-valid', () => {
    test('cancelOrderById()', async () => {
        const order = await exchange.cancelOrderById(orderIdETH, 'ETH/USDT');
        expect(order).not.toBeNull();
        expect(Object.keys(order)).toEqual(orderKeys);
    });
    test('cancelOrderByPair()', async () => {
        const orders = await exchange.cancelOrderByPair('BTC/USDT');
        expect(orders).not.toBeNull();
        expect(Object.keys(orders[0])).toEqual(orderKeys);
    });
});

///make some market orders, test gettrades