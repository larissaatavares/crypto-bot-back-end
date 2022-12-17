import { parentPort, workerData } from 'worker_threads';
import STRATEGY_CLASSES from '../strategies/STRATEGY_CLASSES.js';
import fs from 'fs';
import path from 'path';
import { getMilliseconds } from './index.js';

const { interval, exchange, pair, type } = workerData;
const strategyObject = new STRATEGY_CLASSES[type](workerData);
const filePath = path.resolve(`./historicalData/${exchange}-${pair.replace('/', '_')}-1m.csv`);
const file = await fs.promises.open(filePath);
const defaultInterval = getMilliseconds({ unit: 'minute', amount: 1 });
const strategyInterval = getMilliseconds(interval);
const method = (() => {
    switch(interval.unit) {
        case 'second': return 'getSeconds';
        case 'minute': return 'getMinutes';
        case 'hour':   return 'getHours';
        case 'day':    return 'getDay';
        case 'month':  return 'getMonth';
        case 'year':   return 'getYear';
    }
})();

console.time('Time');

class Cache { // May stop being static if I ever need another one of those.
    static date = [];
    static open = [];
    static high = [];
    static low = [];
    static close = [];
    static volume = [];

    static increment(candle) {
        this.date.push(candle.date);
        this.open.push(candle.open);
        this.high.push(candle.high);
        this.low.push(candle.low);
        this.close.push(candle.close);
        this.volume.push(candle.volume);
    }

    static reset() {
        this.date = [];
        this.open = [];
        this.high = [];
        this.low = [];
        this.close = [];
        this.volume = [];
    }

    static getCandle() {
        return {
            date: this.date[0],
            open: this.open[0],
            high: Math.max(...this.high),
            low: Math.min(...this.low),
            close: this.close[this.close.length-1],
            volume: this.volume.reduce((acc, val) => acc + val)
        }
    }
}

parentPort.on('message', async msg => {
    if(msg === 'terminate') await exit();
});

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
    if(candle.date > strategyObject.end) await exit(); 

    if(strategyInterval > defaultInterval){     
        if(new Date(candle.date)[method]() % interval.amount === 0 && Cache.date.length){ 
            const largerCandle = Cache.getCandle(); 
            Cache.reset();
            strategyObject.run({ candle: largerCandle });
        }
        Cache.increment(candle); 
    } else {
        strategyObject.run({ candle });
    }
}

await exit();

async function exit() {    
    const result = strategyObject.report();
    console.log(result);
    parentPort.postMessage({ type: 'report', result, id: strategyObject.id });
    await file.close();
    await strategyObject.terminate();
    console.timeEnd('Time');
    process.exit();
}