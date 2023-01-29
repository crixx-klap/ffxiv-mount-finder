import google from 'googlethis';
import https from 'https';
import fs from 'fs';
import { parse } from 'csv-parse';
import path from 'path';
import { fileURLToPath } from 'url';
import Scraper from 'images-scraper';



// parse csv
async function parseData() {
    return new Promise((resolve, reject)=>{
        const records = [];
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const parser = parse({ delimiter: ',' });
        
        parser.on('readable', function () {
            let record;
            while ((record = parser.read()) !== null) {
                records.push(record);
            }
        });

        parser.on('error', function (err) {
            console.error(err.message);
            reject();
        });

        parser.on('end', function () {
            console.log("Parsing finished");
            resolve(records);
        });

        const p = path.join(__dirname,'data.csv'); 
        fs.createReadStream(p).pipe(parser);
    });
}
let data = await parseData();

// filter results
let filteredData = data.filter(x => x[1].length !== 0);

async function searchGoogle(filteredData) {
    const results = {};
    for (let index = 0; index < filteredData.length; index++) {
        const name = filteredData[index][1];
        console.log(name);
        try {
            //const images = await google.image(`${name} mount ffxiv`, { safe: false });
            const google = new Scraper({
                puppeteer: {
                  headless: true,
                },
            });
            const images = await google.scrape(`${name} mount ffxiv`, 10);
            results[name] = images;        
        } catch (error) {
            console.log(error);
        }
    }
    return results;
}

const cacheName = "googleSearchResults.json"; 
let googleResults;
if (fs.existsSync(cacheName)) {
    console.log(`The file ${cacheName} exists`);
    const jsonString = fs.readFileSync(cacheName, "utf8");
    googleResults = JSON.parse(jsonString);
} else {
/*  
    console.log(`The file ${cacheName} does not exist`);
    googleResults = await searchGoogle(filteredData);
    const jsonString = JSON.stringify(googleResults);
    fs.writeFileSync(cacheName, jsonString);
    console.log(googleResults);
*/
}

// download image and link to name of the mount
async function download (images, name, sample) {
    for (let index = 0; index < sample; index++) {
       await request(images[index].url, name, index);
    }
}

async function request (url, name, index) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let path = `./${name}_${index}.jpg`;
            if (response.statusCode === 200) {
                response.pipe(fs.createWriteStream(path));
                response.on('end', () => {
                    console.log("Image downloaded: " + path);
                    resolve();
                });
            } else {
                console.log(`Failed to download image with status code: ${response.statusCode}`);
                reject();
            }
        }).on('error', (err) => {
            console.log(`Error Occured: ${err.message}`);
            reject(); 
        })
    });
}

//download(images, name, 3);

function generateHtml(googleResults) {
    let images = '';

    for (const name in googleResults) {
        if (Object.hasOwnProperty.call(googleResults, name)) {
            const links = googleResults[name];
            images += `<h2>${name}</h2>`;
            for (let i = 0; i < 5; i++) {
                images += `<img src="${links[i].url}" width="200" height="200">`;
            }            
        }
    }

    let doc = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>title</title>
        <link rel="stylesheet" href="style.css">
        <script src="script.js"></script>
      </head>
      <body>
        ${images}
      </body>
    </html>`;
    return doc;
}

fs.writeFileSync('index.html', generateHtml(googleResults));