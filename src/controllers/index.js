import app from '../server.js';
import strategy from './strategies.js';
import auth from './auth.js';
import orders from './orders.js';

app.use('/strategy', strategy);
app.use('/auth', auth);
app.use('/orders', orders);
// keep adding, unfortunately, a recursive import is only possible with the deprecated require