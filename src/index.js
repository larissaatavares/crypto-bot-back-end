import app from './server.js';
import './controllers/index.js';
import StrategyManager from './strategies/StrategyManager.js';

StrategyManager.startAll();
app.listen(3000);