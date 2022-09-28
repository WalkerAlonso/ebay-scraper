# ebay-scraper
## A scraper in NodeJS for Ebay - [Puppeteer, cronjobs, xlsx input, proxy rotation]

### Requirements:
- [NodeJS](https://nodejs.org/en/download/)

### Installation:
On the first run execute from console, in the same directory where index.js resides the following command
- nmp install

To run:
- node index.js

### Input
- A list of proxies in **proxies.txt**, using the format **IP:PORT**
- An **XLSX** file with columns **BRAND** and **PRODUCT NAME**

### Features 
In **index.js** we can set the following flags:
- **pageLimit**: (**int**) - how many pages we want to loop from the results we obtain
- **screenshot_flag**: (**boolean**) - enable screenshot during the scraping of each item in the results list
- **fullPageScreenshot**: (**boolean**) - experimental
- **headless**: (**boolean**) - enable headless mode
- **debugDetails**: (**boolean**) - enable extra logs
- **useProxy**: (**boolean**) - enable proxy rotation


### CronJob
More details on how to setup the custom job can be found in the following links:
- [The official NPM package](https://www.npmjs.com/package/cron)
- [A great website with many examples](https://crontab.guru/)

For the second link, keep in mind the examples use UNIX time, which means 5 arguments, in our case we can set an additional one, the **seconds**.
