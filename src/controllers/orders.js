import express from 'express';
import ExchangeManager from '../exchanges/ExchangeManager.js';
import ccxt from 'ccxt';
import User from '../database/User.js';

const router = express.Router();
let userIds = await User.findAll({ attributes: ['id'] });
User.subscribe(Date.now(), newUserId => userIds.push(newUserId));

router.use((req, res, next) => {
    const { exchangeName, userId, orderId, pair, isTest, newAmount, newPrice } = req.body;

    let undefinedParams = [exchangeName, userId, isTest].filter(v => !Boolean(v));
    if(undefinedParams.length > 0){
        return res.status(401).send({ error: 'Obligatory param undefined.', undefinedParams });
    } else {
        if(!userIds.includes(userId)) 
            return res.status(401).send({ error: 'User doesn\t exist.' });
        if(!ccxt.exchanges.includes(exchangeName)) 
            return res.status(401).send({ error: 'Exchange isn\t supported.' });
        if(typeof isTest !== 'boolean')
            return res.status(401).send({ error: 'isTest isn\t a boolean.' });
    }

    if(req.method === 'DELETE') {
        if(typeof pair !== 'string' && !Array.isArray(pair))
            return res.status(401).send({ error: 'pair isn\r an array or string.' });
        if(typeof pair === 'string' && pair.length > 20)
            return res.status(401).send({ error: 'pair string length exceeds limit.' });
        if(Array.isArray(pair) && !pair.every(s => typeof s === 'string')) 
            return res.status(401).send({ error: 'pair array contains non-string items.' });
        if(Array.isArray(pair) && !pair.every(s => s.length < 20))
            return res.status(401).send({ error: 'pair array contains very long strings.' });
        if(typeof orderId !== 'string')
            return res.status(401).send({ error: 'orderId isn\t a string.' });
        if(orderId.length > 40)
            return res.status(401).send({ error: 'orderId length exceeds limit.' });
    } 

    if(req.method === 'PUT') {
        if(newAmount) {
            if(typeof newAmount !== 'number')
                return res.status(401).send({ error: 'newAmount isn\t a number.' });            
            if(newAmount <= 0)
                return res.status(401).send({ error: 'newAmount is below zero.' });            
        }
        if(newPrice) {
            if(typeof newPrice !== 'number')
                return res.status(401).send({ error: 'newPrice isn\t a number.' });            
            if(newPrice <= 0)
                return res.status(401).send({ error: 'newPrice is below zero.' });       
        }
    }

    return next();
});

router.get('/', async (req, res) => {
    const { exchangeName, userId, isTest } = req.body;
    const exchange = await ExchangeManager.getPrivate(exchangeName, userId, isTest);
    const allOrders = await exchange.getAllOrders();
    return res.send(allOrders);
});

router.post('/', async (req, res) => {
    const { exchangeName, userId, isTest } = req.body;
    const exchange = await ExchangeManager.getPrivate(exchangeName, userId, isTest);
    const newOrder = await exchange.sendOrder(req.body);
    return res.send(newOrder);
});

router.put('/', async (req, res) => {
    const { exchangeName, userId, orderId, pair, isTest, newAmount, newPrice } = req.body;
    const exchange = await ExchangeManager.getPrivate(exchangeName, userId, isTest);
    const editedOrder = await exchange.editOrder(orderId, pair, newAmount, newPrice);
    return res.send(editedOrder);
});

router.delete('/', async (req, res) => {
    const { exchangeName, orderId, userId, pair, isTest } = req.body;
    const exchange = await ExchangeManager.getPrivate(exchangeName, userId, isTest);
    await exchange.cancelOrderById(orderId, pair);
    return res.send();
});

export default router;