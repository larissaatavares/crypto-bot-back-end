import express from 'express';
import bcrypt from 'bcrypt';
import User from '../database/User.js';

const router = express.Router();

router.post('/register', (req, res) => {
    const { email } = req.body;

    if(User.findOne({ where: { email }})) 
        return res.status(400).send({ error: 'Email already in use' });

    const user = User.create(req.body);
    user.password = undefined;

    return res.send(user);
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    // get password from db
    // check user exists

    if(!await bcrypt.compare(password, user.password))
        return res.status(400).send({ error: 'Invalid password' });
});

router.post('/logout', (req, res) => {});

router.post('/setExchangeAuth', (req, res) => {});

router.delete('/:userId', (req, res) => {
    
});

export default router;

// should '/:x' be used or it all goes into req.body?