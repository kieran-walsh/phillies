//Node.js libraries
const request = require('request');
const cheerio = require('cheerio');
const express = require('express');
const path = require('path');
const port = 3000;
app = express();

//Variables to handle async function call
let salaryData;
let intID;
let asyncComplete;

//Get salary data via web scraping, clean it, and extract
//Relevant data
function getData() {
    //Uses the request module to scrape HTML from this URL
    request('https://questionnaire-148920.appspot.com/swe/data.html', function(err, resp, html) {
        //If no error, parse HTML
        if (!err) {
          //Use Cheerio to parse and find all <tr> elements
          const $ = cheerio.load(html);
          let result = [];
          let rows = $('tbody').find('tr');
          //Go through each row and then extract/clean salary
          rows.each(function(i, elm) {
              let salaryCol = $(elm).children()[1];
              let salary = $(salaryCol).text();
              //Use regex to remove $ and , 
              let cleaned = parseInt(salary.replaceAll(/[$,]*/g, ''));
              if (isNaN(cleaned) === false) { 
                  result.push(cleaned);
              }
          });

          //Get top salaries and find salient data points such
          //as min, max, median, and the ultimate qualifying offer
          let numSalaries = 125;
          let topSalaries = getTopSalaries(result, numSalaries);
          let min = topSalaries[numSalaries-1];
          let max = topSalaries[0];
          let med = topSalaries[(Math.floor(numSalaries/2))];
          let avg = topSalaries.reduce(function(a, b) { return a + b; }) / numSalaries;
          let salaries = topSalaries.map((num) => { return {'salary': num}})
          
          //Pack data into JSON and prepare to be sent
          let meta = {'min': min, 'max': max, 'med': med, 'avg': avg}
          let obj = {'meta': meta, 'salaries': salaries};
          salaryData = JSON.stringify(obj);
        }
        //If error, send error message
        else {
          let obj = {"error": err};
          salaryData = JSON.stringify(obj);
        }
        asyncComplete = true;
    })
}

//Takes in a list, sorts descending, and returns the first
//"numToReturn" elements
//@param list - list of numbers
//@param numToReturn - how large the resulting array should be
//@returns array of "numToReturn" elements, sorted desc.
function getTopSalaries(list, numToReturn) {
  list.sort(function(a, b) { return parseInt(b) - parseInt(a)});
  return list.slice(0, numToReturn);
}

// Express.js routes
// -----------------

//Endpoint for salary data
app.get('/data', (req, res) => {
  getData();
  //Wait for async call above to finish and then
  //send result
  asyncComplete = false;
  intID = setInterval(() => { if (asyncComplete) { 
    clearInterval(intID);
    res.send(salaryData);
  }}, 50);
  
})

//Route for index.html file
app.get('/', function(req, res) {
  //Consulted this source:
  //https://www.digitalocean.com/community/tutorials/use-expressjs-to-deliver-html-files
  res.sendFile(path.join(__dirname, '/index.html'));
});

app.listen(port, () => {
  console.log(`Example app listening for GET at http://localhost:${port}/`);
})