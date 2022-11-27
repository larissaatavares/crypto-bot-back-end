import express from 'express';
import StrategyManager from '../strategies/StrategyManager.js';

const router = express.Router();

router.get('/:userId', (req, res) => {
    const result = StrategyManager.getByUser(req.params.userId);
    return res.send(result);
});

router.post('/', (req, res) => {
    var result = StrategyManager.create(req.body);
    return res.send(result);
});

router.put('/:strategyId', (req, res) => {
    var result = StrategyManager.edit();
    return res.send(result);
});

router.delete('/:strategyId', (req, res) => {
    StrategyManager.delete(req.params.strategyId);
});

export default router;