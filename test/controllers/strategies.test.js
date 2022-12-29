import request from 'supertest';
import app from '../../src/server.js';
import '../../src/controllers/index.js';
import User from '../../src/database/User.js';
import { jest } from '@jest/globals';
import config from '../../config.json' assert { type: 'json' }; // use .auth
import sequelize from '../../src/database/connection.js';

let idLive;
let idTick;
let idBack;
let userId;

function baseParams() {
    return {
        userId: userId,
        type: 'BaseStrategy',
        interval: { unit: 'minute', amount: 1 },
        exchange: 'binance',
        pair: 'BTC/USDT',
        isTest: true,
        claimed: { BTC: 0, USDT: 100 }
    }
}

jest.setTimeout(10000);

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

describe('Create', () => {
    test('tick', async () => {
        const params = Object.assign({ runtime: 'tick' }, baseParams());
        const res = await request(app).post('/strategy').send(params);
        idTick = res.text;
        expect(res.status).toBe(200);
    });
    test('live', async () => {
        const params = Object.assign({ runtime: 'live', propToListen: 'tickers' }, baseParams());
        const res = await request(app).post('/strategy').send(params);
        idLive = res.text;
        expect(res.status).toBe(200);
    });
    test('back', async () => {
        const params = Object.assign({ runtime: 'back' }, baseParams());
        const res = await request(app).post('/strategy').send(params);
        idBack = res.text;
        expect(res.status).toBe(200);
    });
});

describe('Edit', () => {
    test('tick', async () => {
        const res = await request(app).put('/strategy').send({
            id: idTick,
            params: [['pair', 'ETH/USDT'], ['exchange', 'coinbase']]
        });
        expect(res.body).toBe(true);
        const strat = (await request(app).get('/strategy').send({ userId })).body.find(item => item.id === idTick);
        expect(strat.pair).toBe('ETH/USDT');
        expect(strat.exchange).toBe('coinbase');
    });
    test('live', async () => {
        const res = await request(app).put('/strategy').send({
            id: idLive,
            params: [['pair', 'ETH/USDT'], ['newProp', 'notThereBefore']]
        });
        expect(res.body).toBe(true);
        const strat = (await request(app).get('/strategy').send({ userId })).body.find(item => item.id === idLive);
        expect(strat.pair).toBe('ETH/USDT');
        expect(strat.newProp).toBe('notThereBefore');
    });
});

describe('Delete', () => {
    test('tick', async () => {
        const res = await request(app).delete('/strategy').send({ id: idTick });
        expect(res.status).toBe(200);
    });
    test('live', async () => {
        const res = await request(app).delete('/strategy').send({ id: idLive });
        expect(res.status).toBe(200);
    });
    test('back', async () => {
        const res = await request(app).delete('/strategy').send({ id: idBack });
        expect(res.status).toBe(200);
    });
});