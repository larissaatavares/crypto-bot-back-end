import express from 'express';
import ExchangeManager from '../exchanges/ExchangeManager.js';

const router = express.Router();

router.get('/', (req, res) => {
    const exchange = ExchangeManager.getPrivate();
    // get all orders
});

router.post('/', (req, res) => {
    const exchange = ExchangeManager.getPrivate();
    // post order
});

router.put('/:orderId', (req, res) => {
    const exchange = ExchangeManager.getPrivate();
    // edit order
});

router.delete('/:orderId', (req, res) => {
    const exchange = ExchangeManager.getPrivate();
    // delete order
});

export default router;