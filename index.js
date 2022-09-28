const { scrapeEbay } = require('./scrapeEbay.js')
const cron = require('node-cron');
const reader = require('xlsx')
const fs = require('fs');

const inputFile = reader.readFile('./input/input.xlsx')
const proxies = fs.readFileSync('./input/proxies.txt').toString().split("\n");
  
// Helper website to setup Cron Schedule String --- https://crontab.guru/
cron.schedule('0 49 * * * *', () => {
  let date_ob = new Date();
  let date = ("0" + date_ob.getDate()).slice(-2);
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();
  console.log("Cron Job Started at: "+ year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);

  let inputData = []  // This contains the XLSX as a JSON array
  const sheets = inputFile.SheetNames
    
  // Read Input  - This accepts multiple Sheets with the same structure
  for(let i = 0; i < sheets.length; i++){
      const temp = reader.utils.sheet_to_json(
        inputFile.Sheets[inputFile.SheetNames[i]])
        temp.forEach((res) => {
          inputData.push(res)
        }
      )
  }


  // Process Input and Extract
  const pagesLimit = 1;           // How many pages do we want to iterate? It stops if the number is greater than the actual pages
  const screenshot_flag = true;  // Do we want a screenshot? true/false
  const fullPageScreenshot = true;
  const headless = false;
  const debugDetails = true;
  const useProxy = true;


  const forLoopAsync = async _ => {
    console.log('Start')
    for(let i = 0; i < inputData.length; i++){
      const randomProxy = proxies[Math.floor(Math.random()*proxies.length)];
      console.log("Current Random Proxy: "+randomProxy);
      const searchQuery = inputData[i].brand.trim()+" "+inputData[i].productName.trim()
      const processTask = async _ => {await scrapeEbay(searchQuery, pagesLimit, screenshot_flag, fullPageScreenshot, headless, debugDetails, randomProxy, useProxy).then(() =>{
          console.log("Scraper "+(i+1).toString()+" of "+inputData.length.toString()+" terminated!") 
        })
      }
      await processTask().then("Terminated!") 
    }
    console.log('End')
  }

  forLoopAsync()
});


