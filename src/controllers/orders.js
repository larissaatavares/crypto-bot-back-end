import express from 'express';
import ExchangeManager from '../exchanges/ExchangeManager.js';

const router = express.Router();

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