import express from 'express';
import StrategyManager from '../strategies/StrategyManager.js';
import ccxt from 'ccxt';
import User from '../database/User.js';
import STRATEGY_CLASSES from '../strategies/STRATEGY_CLASSES.js';

const router = express.Router();
let userIds = await User.findAll({ attributes: ['id'] });
User.subscribe(Date.now(), newUserId => userIds.push(newUserId));

router.use((req, res, next) => {
    // Checks universal props, not strategy unique ones.

    if(req.method === 'POST') {
        const runtimes = ['live', 'tick', 'back'];
        const types = Object.keys(STRATEGY_CLASSES);

        if(!userIds.includes(req.body.userId)) 
            return res.status(401).send({ error: 'User doesn\t exist.' });
        if(!runtimes.includes(req.body.runtime))
            return res.status(401).send({ error: 'Bad runtime, must be: "live", "tick" or "back".' });
        if(!ccxt.exchanges.includes(req.body.exchange)) 
            return res.status(401).send({ error: 'Exchange isn\t supported.' });
        if(!types.includes(req.body.type))
            return res.status(401).send({ error: 'Strategy isn\t supported.' });        
    }

    return next();
});

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
    await StrategyManager.delete(req.body.id);
    return res.send();
});

export default router;