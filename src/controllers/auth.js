import express from 'express';
import bcrypt from 'bcrypt';
import User from '../database/User.js';
import StrategyManager from '../strategies/StrategyManager.js';
import jwt from 'jsonwebtoken';
import config from '../../config.json' assert { type: 'json' };

const router = express.Router();
router.use((req, res, next) => {
    const allowedPaths = ['/login', '/register'];
    if(allowedPaths.includes(req.path)) return next();
    const tokenCookie = req.headers.cookie.split(';')[0].split('=')[1] || undefined;
    if(!tokenCookie) return res.status(401).send({ error: 'No token provided' });

    jwt.verify(tokenCookie, config.appSecret, (err, decoded) => {
        if(err) return res.status(401).send({ error: err.message });
        req.body.userId = decoded.id;
        return next(); 
    });
});

router.post('/register', async (req, res) => {
    const { email } = req.body;

    if(await User.findOne({ where: { email }})) 
        return res.status(400).send({ error: 'Email already in use' });

    const user = await User.create(req.body);
    return res.send(user.id);
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email }});

    if(!user) return res.status(400).send({ error: 'User not found' })

    if(!await bcrypt.compare(password, user.password))
        return res.status(400).send({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id }, config.appSecret, { expiresIn: 86400 });
    res.cookie('x-access-token', token, { secure: true, httpOnly: true, maxAge: 900000 });
    return res.send('Logged in!');
});

router.post('/logout', (req, res) => {});

router.post('/setExchangeAuth', async (req, res) => {
    const fields = {
        test: 'exchangeAuthTest',
        prod: 'exchangeAuthProd'
    }
    const { userId, type, auth, exchange } = req.body;
    const user = await User.findByPk(userId);
    let currentValue = JSON.parse(user[fields[type]]);
    currentValue[exchange] = auth;
    user[fields[type]] = JSON.stringify(currentValue);
    await user.save();
    return res.send();
});

router.delete('/', async (req, res) => {
    const strats = StrategyManager.getByUser(req.body.id);
    for(const strategy of strats) 
        await StrategyManager.delete(strategy.id);
    await User.destroy({ where: { id: req.body.id }});
    return res.send();
});

export default router;