import { parentPort, workerData } from 'worker_threads';
import { STRATEGY_CLASSES } from '../strategies/StrategyManager.js';
import fs from 'fs';
import path from 'path';

const { interval, exchange, pair, type } = workerData;
const strategyObject = new STRATEGY_CLASSES[type](workerData);
const filePath = path.resolve(`./historicalData/${exchange}-${pair.replace('/', '_')}-${interval.amount+interval.unit[0]}.csv`);
const file = await fs.promises.open(filePath);

console.time('Time');

for await (const line of file.readLines()) {
    const items = line.split(',').map(val => Number(val));
    if(isNaN(items[0])) continue;
    const candle = {
        date: items[0],
        open: items[1],
        high: items[2],
        low: items[3],
        close: items[4],
        volume: items[5]
    }
    if(candle.date < strategyObject.start) continue;
    if(candle.date > strategyObject.end) exit();
    strategyObject.run({ candle });
}

exit();

async function exit() {
    console.timeEnd('Time');
    strategyObject.terminate();
    const result = strategyObject.report();
    parentPort.postMessage({ type: 'report', result, id: strategyObject.ID });
    await file.close()
    process.exit();
}

parentPort.on('message', async msg => {
    if(msg === 'terminate') await exit();
});