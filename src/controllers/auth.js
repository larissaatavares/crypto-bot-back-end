import express from 'express';
import bcrypt from 'bcrypt';
import User from '../database/User.js';

const router = express.Router();

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
});

router.post('/logout', (req, res) => {});

router.post('/setExchangeAuth', async (req, res) => {
    const fields = {
        test: 'exchangeAuthTest',
        prod: 'exchangeAuthProd'
    }
    const { userId, type, auth } = req.body;
    const user = await User.findByPk(userId);
    user[fields[type]] = JSON.stringify(auth);
    await user.save();
    return res.send();
});

router.delete('/', async (req, res) => {
    const { userId } = req.body;
    await User.destroy({ where: { id: userId }});
    return res.send();
});

export default router;