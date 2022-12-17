import StrategyManager from '../../src/strategies/StrategyManager.js';
import { jest } from '@jest/globals';
import sequelize from '../../src/database/connection.js';
import User from '../../src/database/User.js';
import config from '../../config.json' assert { type: 'json' }; // use .auth

jest.setTimeout(10000);
let userId;
let ids = [];

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
});


test('Create BaseStrategy live', async () => {
    const id = await StrategyManager.create({
        userId,
        type: 'BaseStrategy',
        runtime: 'live', 
        interval: { unit: 'minute', amount: 1 },
        exchange: 'binance', 
        pair: 'BTC/USDT',
        propToListen: 'tickers'
    });
    ids.push(id);
    expect(typeof id).toBe('string');
});

test('Create BaseStrategy back', async () => {
    const id = await StrategyManager.create({
        userId,
        type: 'BaseStrategy',
        runtime: 'back', 
        interval: { unit: 'minute', amount: 1 },
        exchange: 'binance', 
        pair: 'BTC/USDT'
    });
    ids.push(id);
    expect(typeof id).toBe('string');
});

test('Create BaseStrategy tick', async () => {
    const id = await StrategyManager.create({
        userId,
        type: 'BaseStrategy',
        runtime: 'tick', 
        interval: { unit: 'minute', amount: 1 },
        exchange: 'binance', 
        pair: 'BTC/USDT'
    });
    ids.push(id);
    expect(typeof id).toBe('string');
});

test('Edit strategies', async () => {
    const editLive = await StrategyManager.edit(ids[0], [['interval', { unit: 'hour', amount: 6 }]]);
    const editBack = await StrategyManager.edit(ids[1], [['interval', { unit: 'month', amount: 3 }]]);
    const editTick = await StrategyManager.edit(ids[2], [['interval', { unit: 'day', amount: 2 }]]);
    expect(editLive).toBe(true);
    expect(editTick).toBe(true);
    expect(editBack).toBe(false);
});

test('Get all strategies from one user', () => {
    const strategies = StrategyManager.getByUser(userId);
    const allExist = ids.every(id => strategies.map(strat => strat.id).includes(id));
    expect(allExist).toBe(true);
    expect(strategies[0].interval).toEqual({ unit: 'hour', amount: 6 });
    expect(strategies[2].interval).toEqual({ unit: 'day', amount: 2 });
});

test('Delete all strategies', async () => {
    for(const id of ids) await StrategyManager.delete(id);
    const strats = ids.map(id => StrategyManager.getById(id));
    const allNull = strats.every(item => item === null);
    expect(allNull).toBe(true);
});