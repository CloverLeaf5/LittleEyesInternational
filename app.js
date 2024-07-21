//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const axios = require("axios");
const helmet = require("helmet");
const AWS = require("aws-sdk");

// GLOBAL TIME VARIABLE AND CACHE OF DB DATA
// ONLY UPDATES ONCE PER HOUR UNLESS DYNAMODB IS UPDATED
let lastUpdateTime = 0;
let lastDBData = {
	title: "Under construction",
	date: "July 10, 2024",
	bodyArray: ["Check back soon!"],
	photoURLs: []
}


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
//const path = require('path')
//app.use('/static', express.static(path.join(__dirname, 'public')))
//app.use(express.static(path.join(__dirname, 'public')))
// Helmet sets security policies in HTTP responses
app.use(helmet.contentSecurityPolicy({
				 directives:{
				   defaultSrc:["'self'"],
           imgSrc: ["'self'", '*'],
				   scriptSrc:["'self'",'donorbox.org','maxcdn.bootstrapcdn.com','cdn.jsdelivr.net','kit.fontawesome.com'],
				   styleSrc:["'self'",'maxcdn.bootstrapcdn.com', "'unsafe-inline'", '*'],
           frameSrc:['donorbox.org'],
				   fontSrc:["'self'",'*']}}));

// Page gets
app.get("/", function(req, res){
  res.render("home");
});

app.get("/signup", function(req, res) {
  res.render("signup");
})

app.get("/donate", function(req, res) {
  res.render("donate");
})

app.get("/about", function(req, res) {
  res.render("about");
})

// Fetch data from DynamoDB and S3 prior to returning page
app.get("/blog", async function(req, res) {
	if ( lastUpdateTime > (Date.now() - (60*60*1000)) ) { // Updated within last hour
		res.render("blog", {
			title: lastDBData.title,
			date: lastDBData.date,
			bodyArray: lastDBData.bodyArray,
			photoURLs: lastDBData.photoURLs
		});
		return;
	}

	// Has not updated in the last hour
	AWS.config.update({ region: "us-east-1" });
	// DynamoDB Query
	const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
  const response = await ddb
    .scan({
      TableName: `${process.env.TABLE_NAME}`,
			ProjectionExpression: "postID, title, displayDate, body, photoFolder, photoNames",
			FilterExpression: "isActive = :a",
		  ExpressionAttributeValues: {
		    ":a": { BOOL: true },
		  },

    })
    .promise().catch((error) => console.error(JSON.stringify(error, null, 2)));

	const mostRecent = response.Items.reduce(
		(prev, current) => {
			return parseInt(prev.postID.N) > parseInt(current.postID.N) ? prev : current
		}
	);

	console.log(mostRecent);

	// Get data from DynamoDB Query
	const title = mostRecent.title.S;
	const date = mostRecent.displayDate.S;
	const bodyArray = mostRecent.body.S.split("&&&&&");
	let photoNames;
	let photoFolder;
	if (mostRecent.photoNames) {
		photoNames = mostRecent.photoNames.SS;
	} else {
		photoNames = [];
	}
	if (mostRecent.photoFolder) {
		photoFolder = mostRecent.photoFolder.S;
	} else {
		photoFolder = "";
	}


	// Get photo URLs from S3
	let photoURLs = [];
	if (photoNames.length > 0) {
		const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
		for (let photoName of photoNames){
			const params = {Bucket: `${process.env.S3_BUCKET}`, Key: `${photoFolder}/${photoName}`};
	    const url = await s3.getSignedUrlPromise('getObject', params).catch((err) => console.error(err));
			photoURLs.push(url);
		}
	}

	// Update the cache
	lastUpdateTime = Date.now();
	lastDBData = {
		title: title,
		date: date,
		bodyArray: bodyArray,
		photoURLs: photoURLs
	}

	res.render("blog", {
		title: title,
		date: date,
		bodyArray: bodyArray,
		photoURLs: photoURLs
	});
});


// Post request to subscribe to Mailchimp mail list
app.post("/subscribe", function(req, res) {
  const fName = req.body.firstName;
  const lName = req.body.lastName;
  const email = req.body.emailInput;

	// Create the data that was pulled from the post body
  const dataToSend = {
    members: [
      {
        email_address: email,
        status: "subscribed",
        merge_fields: {
          FNAME: fName,
          LNAME: lName
        }
      }
    ]
  };

	// Create the options for the axios HTTP post request
  const options = {
    method: "post",
    url: `${process.env.MAILCHIMP_API_URL}/lists/${process.env.MAILCHIMP_LIST_ID}`,
    auth: {
      username: "anystring",
      password: process.env.MAILCHIMP_API_KEY
    },
    data: dataToSend
  };

	// Make the post request with axios
  axios(options)
  .then((response) => {
    console.log(response.data);
    console.log(response.status);
    res.render("success");
  })
  .catch(error => {
    console.log(error);
    res.render("failure");
  });

});


// Called by AWS if DynamoDB is updated.
// Allows backend to immediately request updated data from DynamoDB
// Otherwise, it only requests new data up to once per hour
app.post("/resetDBTimer", function(req, res) {
	const authCode = req.body.authCode;
	if (authCode === process.env.DB_AUTH_CODE) {
		lastUpdateTime = Date.now() - (60*60*1000);
		res.sendStatus(200);
	} else {
		res.sendStatus(401);
	}
});


// Start the server
app.listen(3000, '0.0.0.0', function(){
  console.log("Server started on port 3000.");
});
