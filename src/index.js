import app from './server.js';
import './controllers/index.js';

// start all strategies
//import Strategy from './database/Strategy.js';
//const strategies = await Strategy.findAll();
//strategies.filter() // everyone that isn't a test and run them

app.listen(3000);