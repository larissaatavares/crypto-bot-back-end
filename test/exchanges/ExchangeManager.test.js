import sequelize from '../../src/database/connection.js';
import ExchangeManager from '../../src/exchanges/ExchangeManager.js';
import { jest } from '@jest/globals';
import config from '../../config.json' assert { type: 'json' }; // use .auth
import User from '../../src/database/User.js';
import { PrivateExchange } from '../../src/exchanges/PrivateExchange.js';
import { PublicExchange } from '../../src/exchanges/PublicExchange.js';

jest.setTimeout(10000);
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
});

const name = 'binance';
let Public;
let PrivateProd;
let PrivateTest;

describe('Create exchange', () => {
    test('public', async () => {
        Public = await ExchangeManager.getPublic(name);
        expect(Public).toBeInstanceOf(PublicExchange);
    });

    test('private prod', async () => {
        PrivateProd = await ExchangeManager.getPrivate(name, userId);
        expect(PrivateProd).toBeInstanceOf(PrivateExchange);
    });

    test('private test', async () => {
        PrivateTest = await ExchangeManager.getPrivate(name, userId, true);
        expect(PrivateTest).toBeInstanceOf(PrivateExchange);
    });
});

describe('Get existing exchange', () => {
    test('public', async () => {
        const exchange1 = await ExchangeManager.getPublic(name);
        const exchange2 = await ExchangeManager.getPublic(name);
        expect(exchange1).toBe(exchange2);
    });

    test('private prod', async () => {
        const exchange1 = await ExchangeManager.getPrivate(name, userId);
        const exchange2 = await ExchangeManager.getPrivate(name, userId);
        expect(exchange1).toBe(exchange2);
    });

    test('private test', async () => {
        const exchange1 = await ExchangeManager.getPrivate(name, userId, true);
        const exchange2 = await ExchangeManager.getPrivate(name, userId, true);
        expect(exchange1).toBe(exchange2);
    });
});

describe('Count of exchanges', () => {
    test('public', () => {
        const count = ExchangeManager.count('public');
        expect(count).toBe(1);
    });

    test('private', () => {
        const count = ExchangeManager.count('private');
        expect(count).toBe(2);
    });
});