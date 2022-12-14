import PublicExchangeFactory, { PublicExchange } from '../../src/exchanges/PublicExchange';
import { jest } from '@jest/globals';
import sequelize from '../../src/database/connection.js';

jest.setTimeout(20000);
const name = 'binance';
let exchange;
const tickerKeys = [
    'symbol', 'timestamp', 'datetime', 'high', 'low', 'bid',
    'bidVolume', 'ask', 'askVolume', 'vwap', 'open', 'close',
    'last', 'previousClose', 'change', 'percentage', 'average',
    'baseVolume', 'quoteVolume', 'info'
];

afterAll(async () => {
    await sequelize.close();
});

test('PublicExchange.create()', async () => {
    exchange = await PublicExchangeFactory.create(name);
    expect(exchange).not.toBeNull();
    expect(exchange).toBeInstanceOf(PublicExchange);
});

describe('Fetch methods-valid', () => {
    test('getOrderbook()', async () => {
        const response = await exchange.getOrderbook('BTC/USDT');
        expect(Object.keys(response['BTC/USDT'])).toEqual([
            'symbol', 'bids', 'asks', 'timestamp', 'datetime', 'nonce'
        ]);
    });

    test('getTradeHistory()', async () => {
        const response = await exchange.getTradeHistory('BTC/USDT');
        expect(response['BTC/USDT']).toBeInstanceOf(Array);
    });

    test('getTicker()', async () => {
        const response = await exchange.getTicker('BTC/USDT');
        expect(Object.keys(response['BTC/USDT'])).toEqual(tickerKeys);
    });

    test('getCandles()', async () => {
        const response = await exchange.getCandles('BTC/USDT');
        expect(response['BTC/USDT']).toBeInstanceOf(Array);
    });
});

describe('Watch methods-valid', () => {
    test('watchOrderbook()', async () => {
        const response = await exchange.watchOrderbook('ETH/USDT');
        expect(Object.keys(response['ETH/USDT'])).toEqual([
            'bids', 'asks', 'timestamp', 'datetime', 'nonce', 'symbol'
        ]);
    });

    test('watchTradeHistory()', async () => {
        const response = await exchange.watchTradeHistory('ETH/USDT');
        expect(response['ETH/USDT']).toBeInstanceOf(Array);
    });

    test('watchTicker()', async () => {
        const response = await exchange.watchTicker('ETH/USDT');
        expect(Object.keys(response['ETH/USDT'])).toEqual(tickerKeys);
    });

    test('watchCandles()', async () => {
        const response = await exchange.watchCandles('ETH/USDT');
        expect(response['ETH/USDT']['1m']).toBeInstanceOf(Array);
    });
});

describe('Fetch methods-invalid', () => {
    test('getOrderbook()', async () => {
        const badPair = await exchange.getOrderbook('BAD/USDTee');
        const badType = await exchange.getOrderbook({ a: 'this is an object'});
        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });

    test('getTradeHistory()', async () => {
        const badPair = await exchange.getTradeHistory('BAD/USDTee');
        const badType = await exchange.getTradeHistory({ a: 'this is an object'});
        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });

    test('getTicker()', async () => {
        const badPair = await exchange.getTicker('BAD/USDTee');
        const badType = await exchange.getTicker({ a: 'this is an object'});
        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });

    test('getCandles()', async () => {
        const badPair = await exchange.getCandles('BAD/USDTee');
        const badType = await exchange.getCandles({ a: 'this is an object'});
        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });
});

describe('Watch methods-invalid', () => {
    test('watchOrderbook()', async () => {
        const badPair = await exchange.watchOrderbook('BAD/USDTee');
        const badType = await exchange.watchOrderbook({ a: 'this is an object'});
        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });

    test('watchTradeHistory()', async () => {
        const badPair = await exchange.watchTradeHistory('BAD/USDTee');
        const badType = await exchange.watchTradeHistory({ a: 'this is an object'});
        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });

    test('watchTicker()', async () => {
        const badPair = await exchange.watchTicker('BAD/USDTee');
        const badType = await exchange.watchTicker({ a: 'this is an object'});
        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });

    test('watchCandles()', async () => {
        const badPair = await exchange.watchCandles('BAD/USDTee');
        const badType = await exchange.watchCandles({ a: 'this is an object'});
        expect(badPair).toBeNull();
        expect(badType).toBeNull();
    });
});