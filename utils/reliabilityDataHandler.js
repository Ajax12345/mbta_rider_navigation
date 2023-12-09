const fs = require('fs');
const path = require('path');

const inputFilePath = path.resolve(__dirname, '../agg_datasets/reliability_year_line.csv');
const outputFilePath = path.resolve(__dirname, '../json_data/reliability_year_line.json');

const jsonData = {};
function removeDoubleQuotes(inputString) {
    if (typeof inputString !== 'string') {
        return '';
    }
    const result = inputString.replace(/"/g, '');

    return result;
}
const processLine = (line) => {
    let [year, name, reliability] = line.split(',');
    year = removeDoubleQuotes(year);
    name = removeDoubleQuotes(name);
    reliability = removeDoubleQuotes(reliability);
    if (!jsonData[year]) {
        jsonData[year] = [{ name, reliability }];
    } else {
        jsonData[year].push({ name, reliability });
    }
};

const readStream = fs.createReadStream(inputFilePath, { encoding: 'utf8' });

readStream.on('data', (chunk) => {
    const lines = chunk.split('\n');
    for (let i = 1; i < lines.length; i++) {
        processLine(lines[i]);
    }
});

readStream.on('end', () => {
    const jsonString = JSON.stringify(jsonData, null, 2);
    fs.writeFile(outputFilePath, jsonString, (err) => {
        if (err) throw err;
    });
});