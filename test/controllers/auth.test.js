import request from 'supertest';
import app from '../../src/server.js';
import '../../src/controllers/index.js';
import { jest } from '@jest/globals';
import User from '../../src/database/User.js';
import sequelize from '../../src/database/connection.js';
import config from '../../config.json' assert { type: 'json' }; // use .auth

jest.setTimeout(10000);

let userId;
let cookie;

afterAll(async () => {
    await User.destroy({ where: { email: 'test@gmail.com' }});
    await sequelize.close();
});

test('Register user', async () => {
    const res = await request(app).post('/auth/register').send({
        email: 'test@gmail.com',
        password: 'lame password'
    });    
    expect(res.status).toBe(200);
    expect(res.text.length).toBe(36);
    userId = res.text;
});

test('Login', async () => {
    const res = await request(app).post('/auth/login').send({
        email: 'test@gmail.com',
        password: 'lame password'
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe('Logged in!');
    expect(res.headers['set-cookie']).toBeDefined();
    cookie = res.headers['set-cookie'][0];
    
});

test('Set exchange auth - test', async () => {
    const res = await request(app).post('/auth/setExchangeAuth')
    .set('Cookie', [cookie])
    .send({
        userId, 
        type: 'test', 
        exchange: 'binance',
        auth: config.auth.test
    });
    expect(res.status).toBe(200);
    const user = await User.findByPk(userId);
});

test('Set exchange auth - prod', async () => {
    const res = await request(app).post('/auth/setExchangeAuth')
    .set('Cookie', [cookie])
    .send({
        userId, 
        type: 'prod',
        exchange: 'binance',
        auth: config.auth.prod
    });
    expect(res.status).toBe(200);
    const user = await User.findByPk(userId);
});

test('Delete user', async () => {
    const res = await request(app).delete('/auth')
    .set('Cookie', cookie)
    .send({ id: userId });
    const user = await User.findByPk(userId);
    expect(user).toBeNull();
});