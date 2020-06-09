const express =  require('express')
const cors = require('cors')
const request = require('request')
const app = express()
const Feed = require('rss-to-json');
const Twitter = require('twitter')
var bodyParser = require('body-parser')
var path = require('path')
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(path.resolve(__dirname, '..', 'build')));  
app.get('/api/', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});
const PORT = process.env.PORT || 9000
require('dotenv').config({path: '.env'})

 
var TwitterClient = new Twitter({
  consumer_key: process.env.TWITTER_KEY,
  consumer_secret: process.env.TWITTER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET
});
 


app.get('/api/twittertrends', (req, res) => {
	TwitterClient.get('trends/place', {id: req.query.s}, function(error, tweets, response) {
	  if (!error) {
	    res.send(tweets[0].trends)
	  }
	});
})

app.get('/api/twittersearch', (req, res) => {
	console.log('search')
	TwitterClient.get('search/tweets.json', {q: req.query.s}, function(error, tweets, response) {
	  if (!error) {
	  	
	    res.send(tweets.statuses)
	  }
	});
})


app.get('/api/votingrecord', (req, res) => {
	request(`https://commonsvotes-api.parliament.uk/data/divisions.json/membervoting?queryParameters.memberId=${req.query.member}`, (err, response, body) => {
		if (err) return 
		res.send(body)
	})
})


app.get('/api/member', (req, res) => {
	request(`https://members-api.parliament.uk/api/Members/Search?Name=${req.query.name}&skip=0&take=20`, (err, response, body) => {
		res.send(JSON.parse(body))
		console.log('ate')
	})
})


app.get('/api/newssources', (req, res) => {
	request(`https://newsapi.org/v2/sources?country=gb&apiKey=${process.env.NEWS_KEY}`, (err, response, body) => {
		res.send(JSON.parse(body))
	})
})

app.get('/api/news', (req, res) => {
	let url = req.query.s ? 
	`https://newsapi.org/v2/everything?q=${req.query.s}&sortBy=popularity&pageSize=100&apiKey=${process.env.NEWS_KEY}`:
	`https://newsapi.org/v2/top-headlines?country=gb&pageSize=100&apiKey=${process.env.NEWS_KEY}`
	request(url, (err, response, body) => {
		if (err) return 
		else{
			
			res.send(JSON.parse(body))
		}
	})
})

app.get('/api/postcode', (req, res) => {
	request(`https://api.postcodes.io/postcodes/${req.query.postcode}`, (err, response, body) => {
		body = JSON.parse(body)
		if (body.result.parliamentary_constituency){
			request(`https://members-api.parliament.uk/api/Location/Constituency/Search?searchText=${body.result.parliamentary_constituency}`, (err2, response2, body2) => {
				res.send(JSON.parse(body2))
			})
		}
		
	})
})


app.get('/api/divisions', (req, res) => {
	
	let now = new Date()
	// request(`https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.endDate=${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate() + 1}`, (err, response, body) => {
	request(`https://commonsvotes-api.parliament.uk/data/divisions.json/groupedByParty?queryParameters.endDate=${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate() + 1}`, (err, response, body) => {

		
		res.send(JSON.parse(body))
	})

})

app.get('/api/division', (req, res) => {
	request(`https://commonsvotes-api.parliament.uk/data/division/${req.query.id}.json`, (err, response, body) => {
		res.send(JSON.parse(body))
	})

})

app.get('/api/memberbyid', (req, res) => {
	request(`https://members-api.parliament.uk/api/Members/${req.query.id}`, (err, response, body) => {
		res.send(JSON.parse(body))
	})
})

app.get('/api/bills', (req, res) => {
	Feed.load('https://services.parliament.uk/Bills/AllPublicBills.rss', function(err, rss){
   		res.send(JSON.parse(rss.items));
	});
})


app.get('/api/photos', (req, res) => {
	let uri = req.query.s ? `https://api.unsplash.com/search/photos/?per_page=100&query=${req.query.s}&client_id=${process.env.UNSPLASH_ACCESS}`:
	`https://api.unsplash.com/photos/?per_page=100&client_id=${process.env.UNSPLASH_ACCESS}`
	request(uri, (err, response, body) => {
		if(err) return
			else{
		res.send(body)
		}
	})
})



app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
});



// request(`https://api.postcodes.io/postcodes/${'e13at'}`, (err, response, body) => {
// 		body = JSON.parse(body)
// 		if (body.result.parliamentary_constituency){
// 			request(`https://members-api.parliament.uk/api/Location/Constituency/Search?searchText=${body.result.parliamentary_constituency}`, (err2, response2, body2) => {
// 				let a = JSON.parse(body2)
// 				
// 				let newResponse = {
// 					constituency: a.items[0].name,
// 					memberFrom: a.items[0].startDate,
// 					memberTo: a.items[0].endDat
					
// 					member: {
// 						value: a.items[0].value.currentRepresentation.value,
						
// 					},
// 				}
// 				
// 				// res.send(JSON.parse(body2))
// 			})
// 		}
		
// 	})





app.listen(PORT, () =>{
	
})