import request from 'supertest';
import app from '../../src/server.js';
import '../../src/controllers/index.js';
import User from '../../src/database/User.js';
import { jest } from '@jest/globals';
import config from '../../config.json' assert { type: 'json' }; // use .auth
import sequelize from '../../src/database/connection.js';

jest.setTimeout(10000);

let userId;
let orderId;

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
    await User.destroy({ where: { id: userId }});
    await sequelize.close();
});

test('Send limit order', async () => {
    const params = {
        exchangeName: 'binance',
        userId,
        isTest: true, 
        pair: 'BTC/USDT',
        type: 'limit',
        side: 'buy', 
        amount: 100,
        price: 15000
    }
    const res = await request(app).post('/orders').send(params);
    const newOrder = res.body;
    orderId = newOrder.id;
    expect(res.status).toBe(200);
    expect(newOrder.amount).toBeCloseTo(0.006666);
});

test('Get all orders', async () => {
    const params = { exchangeName: 'binance', userId, isTest: true };
    const res = await request(app).get('/orders').send(params);
    expect(res.status).toBe(200);
    const orders = res.body['BTC/USDT'];
    expect(orders.findIndex(o => o.id === orderId)).not.toBe(-1);
});

test('Edit order', async () => {
    const params = {
        exchangeName: 'binance',
        userId,
        orderId,
        isTest: true, 
        pair: 'BTC/USDT',
        newPrice: 14800
    }
    const res = await request(app).put('/orders').send(params);
    console.log(res.text, res.body, res.status);
});

test('Delete limit order', async () => {
    const params = { exchangeName: 'binance', orderId, userId, pair: 'BTC/USDT', isTest: true };
    const res = await request(app).delete('/orders').send(params);
    console.log(res.text, res.body, res.status);
    expect(res.status).toBe(200);
});