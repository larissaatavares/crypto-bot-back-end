import fs from 'fs';

async function sortHistoricalData(fileName) {
    const filePath = `./historicalData/${fileName}.csv`; 
    const file = await fs.promises.open(filePath);
    const content = (await file.readFile())
        .toString()
        .split('\n')
        .map(row => {
            if(isNaN(Number(row.split(',')[0]))) return row.split(',');
            const array = row.split(',').map(val => Number(val));
            if(array.length === 1) return [0,0,0,0,0,0];
            return array;
        })
        .sort((a, b) => a[0] - b[0]);
    file.close();
    
    var string = '';
    content.forEach(row => {
        if(!row.every(v => v === 0))
            string = string.concat(row[0],',',row[1],',',row[2],',',row[3],',',row[4],',',row[5],'\n');
    });
    fs.promises.writeFile(filePath, string);
}

export default sortHistoricalData;