import express from 'express';
import StrategyManager from '../strategies/StrategyManager.js';

const router = express.Router();

router.get('/', (req, res) => {
    const { userId } = req.body;
    const strategies = StrategyManager.getByUser(userId);
    return res.send(strategies);
});

router.post('/', async (req, res) => {
    const strategyId = await StrategyManager.create(req.body);
    return res.send(strategyId);
});

router.put('/', async (req, res) => {
    const { id, params } = req.body;
    const result = await StrategyManager.edit(id, params);
    return res.send(result);
});

router.delete('/', async (req, res) => {
    const { id, params } = req.body;
    await StrategyManager.delete(id);
    return res.send();
});

export default router;