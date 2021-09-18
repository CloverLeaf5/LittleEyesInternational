//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const axios = require("axios");
const helmet = require("helmet");


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
//const path = require('path')
//app.use('/static', express.static(path.join(__dirname, 'public')))
//app.use(express.static(path.join(__dirname, 'public')))
app.use(helmet.contentSecurityPolicy({
				 directives:{
				   defaultSrc:["'self'"],
           imgSrc: ["'self'", '*'],
				   scriptSrc:["'self'",'donorbox.org','maxcdn.bootstrapcdn.com','cdn.jsdelivr.net'],
				   styleSrc:["'self'",'maxcdn.bootstrapcdn.com', "'unsafe-inline'", '*'],
           frameSrc:['donorbox.org'],
				   fontSrc:["'self'",'*']}}));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/signup", function(req, res) {
  res.render("signup");
})

app.get("/donate", function(req, res) {
  res.render("donate");
})


app.post("/subscribe", function(req, res) {
  const fName = req.body.firstName;
  const lName = req.body.lastName;
  const email = req.body.emailInput;

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

  const options = {
    method: "post",
    url: `${process.env.MAILCHIMP_API_URL}/lists/${process.env.MAILCHIMP_LIST_ID}`,
    auth: {
      username: "anystring",
      password: process.env.MAILCHIMP_API_KEY
    },
    data: dataToSend
  };

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



app.listen(3000, function(){
  console.log("Server started on port 3000.");
});
