/**
 * Gets timestamp from interval object.
 * @param {{unit:String,amount:Number}} interval - { unit: 'minute', amount: 5 }
 * @returns {Number} timestamp
 */
function getMilliseconds(interval) {
    const time = {
        second: 1000,
        minute: 60 * 1000,
        hour: 60 * 60 * 1000
    }
    return time[interval.unit] * interval.amount;
}

export { getMilliseconds };