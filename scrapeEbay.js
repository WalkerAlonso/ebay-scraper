async function scrapeEbay (searchQuery, pagesLimit, screenshot_flag, fullPageScreenshot, headless, debugDetails, randomProxy, useProxy){

  const FileSystem = require("fs");
  const puppeteer = require("puppeteer-extra");

  // Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
  const StealthPlugin = require('puppeteer-extra-plugin-stealth')
  puppeteer.use(StealthPlugin())

  // Add adblocker plugin to block all ads and trackers (saves bandwidth)
  const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
  puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

  const screenshot_folder = "screenshot/"   //Where to store our screenshots
  const outputPath = "output/"              //Where to store our output
  const errorPath = "error/"                //Where to store our errors in HTML

  let searchString = searchQuery;           // what we want to search
  let currentPage = 1;                      // current page of the search
  const URL = "https://www.ebay.com";

  async function waitForSelectorWithReload(page, selector) {
    const MAX_TRIES = 5;
    let tries = 0;
    while (tries <= MAX_TRIES) {
      try {
        const element = await page.waitForSelector(selector, {
          timeout: 5000,
        });
        return element;
      } catch (error) {
        console.log("Retry!")
        if (tries === MAX_TRIES) throw error;

        tries += 1;
        void page.reload();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
      }
    }
  }

  async function getResultsBySelector(page, selector) {
    const css = selector;
    let value = await page.evaluate((css) => document.querySelector(css)?.innerText || null, css);
    return value;
  }
  
  async function getResultsBySelectorOuterHTML(page, selector) {
    const css = selector;
    let value = await page.evaluate((css) => document.querySelector(css)?.outerHTML || null, css);
    return value;
  }

  async function getPageDetails(page, parent, id, outputFileName) {
    //[class="ux-image-filmstrip-carousel"] > button > img  // In case you want more images focus all these elements first
    // The site loads the images ONLY if focused, you can check yourself the HTML changing live

    const pageDetails = await page.evaluate(() => {
      const tmp = {};
      let tmpString = "";
     
      tmp["categories"] = Array.from(document.querySelectorAll('nav[class="breadcrumbs"] ul li:last-child')).map(el => el?.textContent?.trim()||null); 
      tmp["itemNumber"] = document.querySelector('[id="descItemNumber"]')?.textContent?.trim()||null;
      tmp["title"] = document.querySelector('h1[class*="mainTitle"]')?.textContent?.trim()||null;  //GET IT FROM PARENT IT'S EASIER
      tmp["subTitle"] = document.querySelector('div[class*="subTitle"]')?.textContent?.trim()||null;
      tmp["whyToBuy"] = Array.from(document.querySelectorAll('[id="why2buy"] span')).map(el => el?.textContent?.trim()||null);
      tmp["price"] = document.querySelector('[itemprop="price"]')?.getAttribute("content")||null;
      try {
        tmp["price"] = parseFloat(tmp["price"])
      } catch (error) {

      }
      tmp["priceWithCurrency"] = document.querySelector('[itemprop="price"] ')?.textContent?.trim()||null;

      tmpString = document.querySelector('[class="vi-originalPrice"]')?.textContent?.trim() || null;
      if(tmpString!=null&&tmpString.includes(":")){
        tmpString = tmpString.slice(tmpString.indexOf(":")+1).trim();
        tmp["wasPriceWithCurrency"] = tmpString;   // CHECK SELECTOR IN OTHER CASES
        tmp["wasPrice"] = tmpString.replace(/[^0-9\.]/g, '');  // FLOAT
        try {
          tmp["wasPrice"] = parseFloat(tmp["wasPrice"])
        } catch (error) {

        }
      }
      

      tmp["availableText"] = document.querySelector('[class="vi-quantity-wrapper"] [aria-live="polite"] [id="qtySubTxt"]')?.textContent?.trim() || null; 
      tmp["available"] = tmp["availableText"]?.replace( /^\D+/g, '')||null; // INT
      try {
        tmp["available"] = parseInt(tmp["available"])
      } catch (error) {

      }
      tmp["sold"] = document.querySelector('[class="soldwithfeedback"] a[href*="purchase"]')?.textContent?.trim()?.replace(/[^0-9\.]/g, '')||null; //INT
      try {
        tmp["sold"] = parseInt(tmp["sold"])
      } catch (error) {

      }
      tmp["images"] = Array.from(document.querySelectorAll('[data-testid="ux-main-image-carousel"] img[src]')).map(el => el?.getAttribute("src")||null)
      tmp["seller"] = document.querySelector('[class$="--seller"] a:first-child')?.textContent?.trim()||null;
      tmp["itemLocation"] = document.querySelector('[class$="--legalShipping"] > div:last-child > div > div:last-child')?.textContent?.replace("Located in:","")?.trim()||null;

      const finalDetails = ["ean","mpn","upc","brand","type"] //Used to filter which items we want on the first level of our obj

      // List of Details Item Specific
      let rows = document.querySelectorAll('[class$="about-this-item"] [class="ux-layout-section__row"]')
      let extra = {}
      if (rows?.length){
        for (let i=0;i<rows.length;i++) {
          if(rows[i].children?.length){
            let size = rows[i].children.length
            let data1 = rows[i].querySelectorAll('[class$="__labels"]')
            let data2 = rows[i].querySelectorAll('[class$="__values"]')
            for(let k=0;k<size;k++){
              let label = "";
              let value = "";

              try {
                label = data1[k]?.textContent?.trim()?.toLowerCase()||"";
              } catch (error) {

              }

              try {
                value = data2[k]?.textContent?.trim()||"";
              } catch (error) {

              }

              if(label!=""){
                label = label.replace(":","").trim()
                if(finalDetails.includes(label)){
                  // To the main object
                  tmp[label] = value
                }
                else{
                  // Extra information Object
                  extra[label] = value
                }
              }
            }
          } 
        }
      }
      if(Object.keys(extra).length !== 0){
        tmp["extra_item_specifics"]=extra  
      }


      // List of About This Product
      rows = document.querySelectorAll('[class$="-product-details"] [class="ux-layout-section__row"]')
      extra = {}
      if (rows?.length){
        for (let i=0;i<rows.length;i++) {
          if(rows[i].children?.length){
            let size = rows[i].children.length
            let data1 = rows[i].querySelectorAll('div > div > [class*="__labels"]')
            let data2 = rows[i].querySelectorAll('div > div > [class*="__values"]')
            for(let k=0;k<size;k++){
              let label = "";
              let value = "";

              try {
                label = data1[k]?.textContent?.trim()?.toLowerCase()||"";
              } catch (error) {

              }

              try {
                value = data2[k]?.textContent?.trim()?.toLowerCase()||"";
              } catch (error) {

              }

              if(label!=""){
                label = label.replace(":","").trim()
                // Extra information Object
                extra[label] = value
              }
            }
          } 
        }
      }
      if(Object.keys(extra).length !== 0){
        tmp["extra_about_this_product"]=extra  
      }
      return tmp;
    });


    pageDetails.url = parent.link?.slice(0, parent.link.indexOf("?"));
    pageDetails.parent = parent;
    if(screenshot_flag){
      await snapScreenshot(page, screenshot_folder+outputFileName.trim().replace(" ","_")+"_"+id.toString()+"_screenshot.png")
      pageDetails.screenshot = screenshot_folder+outputFileName.trim().replace(" ","_")+"_"+id.toString()+"_screenshot.png"
    }
    pageDetails.id = id;
    
    return pageDetails;
  }

  async function getPageResults(page) {
    const pageResults = await page.evaluate(function () {
      return Array.from(document.querySelectorAll('ul[class^="srp-results"] li[class^="s-item s-item__"]')).map((el) => ({
        link: el.querySelector('[class^="s-item__link"]')?.getAttribute("href"),
        title: el.querySelector('[class^="s-item__title"]')?.textContent?.trim(),
        condition: el.querySelector('[class^="SECONDARY_INFO"]')?.textContent?.trim() || "No condition data",
        price: el.querySelector('[class^="s-item__price"]')?.textContent?.trim() || "No price data",
        shipping: el.querySelector('[class^="s-item__shipping"]')?.textContent?.trim() || "No shipping data",
        thumbnail: el.querySelector('[class^="s-item__image-img"]')?.getAttribute("src") || "No image",
      }));
    });
    return pageResults;
  }

  async function snapScreenshot(page, imagePath) {
    try {
      await page.screenshot({ path: imagePath, captureBeyondViewport: fullPageScreenshot }) // if true get's the fullpage screenshot
    } catch (error) {
      console.error(error)
    }
  }

  async function getOrganicResults() {
    const browser = await puppeteer.launch({
      headless: headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox", useProxy?'--proxy-server='+randomProxy:"--no-proxy-server"],
    });


    // Search
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.goto(URL);
    await page.waitForSelector("#gh-ac");
    await page.focus("#gh-ac");
    await page.keyboard.type(searchString);
    await page.waitForTimeout(1000);
    await page.click("#gh-btn");
    await page.waitForTimeout(1000);

    const organicResults = [];

    console.log("Displaying Listing for --< "+searchString+" >--")
    // Get Listings
    while (true) {
      //await page.waitForSelector('ul[class^="srp-results"]');
      await waitForSelectorWithReload(page, 'ul[class^="srp-results"]')
      await page.waitForTimeout(300);
      const isNextPage = await page.$(".pagination__next");
      if(!isNextPage){
          // If there is no next page, but there are some results, process them
          const resultsCurrentPage = await getResultsBySelector(page, 'ul[class^="srp-results"] li[class^="s-item s-item__"]')
          if(resultsCurrentPage){
            organicResults.push(...(await getPageResults(page)));
          }
      }
      if (!isNextPage || currentPage > pagesLimit) break;
      const actualCurrentPage = await getResultsBySelector(page, '[class="pagination__item"][aria-current="page"]')
      if(actualCurrentPage!=null && parseInt(actualCurrentPage)!=currentPage) break;
      organicResults.push(...(await getPageResults(page)));
      await page.click(".pagination__next");
      currentPage++;
    }
    
    // Get the items details from the listings
    const outputFileName = searchString.trim().replace(" ","_")
    const organicResultsDetails = [];
    const errDetailsURLS = [];

    if(organicResults===null){
      // In case of error for a listing, get the HTML of the page to debug comfortably
      const actualCurrentPage = await getResultsBySelectorOuterHTML(page, 'html')
      console.log("ERROR FOR "+searchString)
      FileSystem.writeFile(errorPath+outputFileName+'.html', actualCurrentPage, (error) => {
        if (error) throw error;
      });
    }else{
      // Getting Details
      for (let i = 0; i < organicResults.length; i++) {
        if(debugDetails){
          console.log("["+(i+1).toString()+"/"+organicResults.length+"]  Processing Details of: "+organicResults[i].title);
        }
        try{
          if('link' in organicResults[i] && organicResults[i].link!=null){
            await page.goto(organicResults[i].link);
            //await page.waitForSelector('h1[class*="mainTitle"]');
            await waitForSelectorWithReload(page, 'h1[class*="mainTitle"]')
            organicResultsDetails.push(await getPageDetails(page, organicResults[i], i+1, outputFileName));           
          }
        }catch(error){
          errDetailsURLS.push(organicResults[i].link)
          console.log("[ERROR] "+organicResults[i].link)
          console.log("[ERROR] Detail: ")
          console.log(error)
        }
      }

      if(organicResults.length!=0){
        // Output Full Data
        FileSystem.writeFile(outputPath+outputFileName+'.json', JSON.stringify(organicResultsDetails, null, "\t"), (error) => {
          if (error) throw error;
        });
      }
    }

    // In case of error for an item
    if(errDetailsURLS.length>0){
      FileSystem.appendFile(errorPath+"error_details_urls"+'.txt', errDetailsURLS.join("\r\n"), (error) => {
        if (error) throw error;
      });
    }

    await browser.close();
  }

  await getOrganicResults().then(()=>{
    console.log("Task Completed with Success!")
  })
}

module.exports = { scrapeEbay }