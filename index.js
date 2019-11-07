// loading env vars from file
require('dotenv').config()
const puppeteer = require('puppeteer');
const { WebClient } = require('@slack/web-api');
const { Parser } = require('json2csv');

(async () => {
  //open browser and navigate to craigslist
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  await page.goto('https://atlanta.craigslist.org' , {waitUntil: 'networkidle2'});

  // input search and press enter
  await page.type('#query', 'canon 6d mark ii');
  await page.keyboard.press('Enter')
  
  // wait for 1 sec
  await page.waitFor(1000)
  
  // get data from dom
  let results = await page.evaluate(() => {
    // get the results
    const resultRows = Array.from(document.querySelector('.rows').children)
    // clean up the results by creating objects
    const cleanedData = resultRows.map(el => {
        return {
            price: el.querySelector('.result-price').innerHTML,
            desc: el.querySelector('.result-title').innerText,
        }
    })
    // sort the result asc
    cleanedData.sort((a, b) => {
        return (
          parseInt(a.price.replace('$', '')) -
          parseInt(b.price.replace('$', ''))
        );
      });
    
    // return the data to node context
    return cleanedData;
  })

  // convert json to csv
  const fields = ['price', 'desc'];
  const parser = new Parser({fields});
  let csv = parser.parse(results);
  csv = csv.replace(/\"/g,'');

  // An access token (from your Slack app or custom integration - xoxp, xoxb)
  const token = process.env.SLACK_TOKEN;
  const web = new WebClient(token);

  // This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
  const conversationId = process.env.CHANNEL_ID;

  (async () => {
    // See: https://api.slack.com/methods/chat.postMessage
    const res = await web.chat.postMessage({ channel: conversationId, text:csv });
  
    // `res` contains information about the posted message
    console.log('Message sent: ', res.ts);

    await browser.close();
  })();

})();
