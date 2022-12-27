import request from 'supertest';
import app from '../../src/server.js';
import '../../src/controllers/index.js';
import { jest } from '@jest/globals';
import User from '../../src/database/User.js';
import sequelize from '../../src/database/connection.js';
import config from '../../config.json' assert { type: 'json' }; // use .auth

jest.setTimeout(10000);

let userId;

afterAll(async () => {
    await sequelize.close();
});

test('Register user', async () => {
    const res = await request(app).post('/auth/register').send({
        email: 'test@gmail.com',
        password: 'lame password'
    });    
    expect(res.status).toBe(200);
    expect(res.text.length).toBe(36)
    userId = res.text;
});

test('Login', async () => {
    const res = await request(app).post('/auth/login').send({
        email: 'test@gmail.com',
        password: 'lame password'
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe('Logged in!');
});

test('Set exchange auth - test', async () => {
    const res = await request(app).post('/auth/setExchangeAuth').send({
        userId, 
        type: 'test', 
        exchange: 'binance',
        auth: config.auth.test
    });
    expect(res.status).toBe(200);
    const user = await User.findByPk(userId);
    expect(user.exchangeAuthTest).toBe('{"binance":{"apiKey":"h6vJrpFcIOn9UBb1S1O6Omqqelgq4TMhnSiRRbjzyK50ailGpDPib1E75WUW962e","secret":"ArNn838RWAjWbtr0RVTDegw4M0JOH5BDIjI6HICzBvMDYYguGp7gEXa8bRXDdsex"}}');
});

test('Set exchange auth - prod', async () => {
    const res = await request(app).post('/auth/setExchangeAuth').send({
        userId, 
        type: 'prod',
        exchange: 'binance',
        auth: config.auth.prod
    });
    expect(res.status).toBe(200);
    const user = await User.findByPk(userId);
    expect(user.exchangeAuthProd).toBe('{"binance":{"apiKey":"qhZKoJlvYzLBexksIjBx5nPdZx4ZTcb0OQ2TpagMDb28BKR88RZVNA5wmNHHGVIK","secret":"bA3ypSuJljU4d3mBVOkk4SvieBnuXaV5nQEa3UlDMPMk0llOnEKDIiahVUAYRj0C"}}');
});

test('Delete user', async () => {
    const res = await request(app).delete('/auth').send({ id: userId });
    const user = await User.findByPk(userId);
    expect(user).toBeNull();
});