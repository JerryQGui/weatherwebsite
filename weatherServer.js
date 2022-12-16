"use strict";
const path = require("path");
const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const app = express();
const port = 3000; // Might need to change later, idk how the hosting site works
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') });
const { MongoClient, ServerApiVersion } = require('mongodb');
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
 /* Our database and collection */
 const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION};
console.log(userName);
const uri = `mongodb+srv://${userName}:${password}@cluster0.3iw4t9p.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const apiSessionToken = "372e45d92c864f9dbd8235755221512";

app.set("views", "templates");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("static"));
app.use(cookieParser());

// Initial Load/Restart
app.get("/", (request, response) => {
  response.render("index");
});

// Submitting username/starting
app.post("/", async (request, response) => {
  // PLACEHOLDER, REPLACE WITH RETRIEVAL FROM API
  let searched_city = request.body.city.charAt(0) + request.body.city.substring(1).toLowerCase();
   // PLACEHOLDER QUESTION - FROM API REQUEST I NEED "question", "correct_answer", and "incorrect_answers"
   const url = `http://api.weatherapi.com/v1/forecast.json?key= ${apiSessionToken} &q=${searched_city}&days=1&aqi=no&alerts=no`
   const localResp = await fetch(url);
   var data = await localResp.json();
   console.log(data);
  if(data.error != null){
    response.redirect("error");
  } else {
    
    let result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection)
    .updateOne({city: searched_city}, {$inc: {number: 1}});
    if (result.matchedCount == 0) {
      let record = {
        city: searched_city,
        number: 1
      };
      await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection)
      .insertOne(record);
    }
  let text = data.forecast.forecastday[0].day.condition.text;
  //response.cookie("username", request.body.username, {httpOnly: true});
  response.render("weather", {city: searched_city, weather:text});
  }
  
 
 
   // let apiResponse = JSON.parse('{"category":"Entertainment: Video Games","type":"multiple","difficulty":"easy","question":"In what year was Hearthstone released?","correct_answer":"2014","incorrect_answers":["2011","2013","2012"]}');
   // let {question, correct_answer, incorrect_answers} = apiResponse;
   
});



// Render Leaderboard
app.get("/leaderboard", async (request, response) => {

  
  // get top 5 cities, by score
  let top5 = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection)
  .find().sort({number: -1}).limit(5).toArray();
  
  console.log(top5);

  let table;
  if (top5 && top5.length > 0) {
    table = "<table class=\"leaderboard\">\n<tr><th>City</th><th>Number of Searches</th></tr>";
    top5.forEach(obj => {
      table += `\n<tr><td>${obj.city}</td><td>${obj.number}</td></tr>`;
    });
    table += `\n</table>`;
  } else {
    table = "There are no cities searched yet! Search up a city first!";
  }

  // Do whatever manipulation of the data to return the response table
  response.render("leaderboard", {top:table});
});

app.get("/remove", (request, response) => {

  response.render("remove");
  
  }); 
app.post("/removeConfirm", async (request, response) => {
      
  clear().then((num)=>{
    const variables = {
      num: num
    };
    response.render("removeConfirm", variables);


  });



}
);
app.get("/error", (request, response) => {

  response.render("error");
  
  }); 

async function clear() {
  const uri = `mongodb+srv://${userName}:${password}@cluster0.3iw4t9p.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

  try {
      await client.connect();
      console.log("***** Clearing Collection *****");
      const result = await client.db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .deleteMany({});
      return (`Deleted documents ${result.deletedCount}`);
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}







app.listen(port);



// Command Line Interpreter
console.log("Web server started and running at http://localhost:" + port);
process.stdout.write("Type stop to shutdown the server: ");
process.stdin.setEncoding("utf8");
process.stdin.on("readable", () => {
  let command = process.stdin.read();
  if (command !== null) {
    command = command.trim();
    if (command === "stop") {
      console.log("Shutting down the server");
      process.exit(0);
    } else {
      console.log("Invalid command: \"" + command + "\"");
    }
  }
  process.stdout.write("Type stop to shutdown the server: ");
  process.stdin.resume();
});