const express =  require('express')
const cors = require('cors')
const request = require('request')
const app = express()
const Feed = require('rss-to-json');
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


app.get('/api/votingrecord', (req, res) => {
	
	request(`https://commonsvotes-api.parliament.uk/data/divisions.json/membervoting?queryParameters.memberId=${req.query.member}`, (err, response, body) => {
		if (err) return 
		res.send(body)
	})
})


app.get('/api/member', (req, res) => {
	request(`https://members-api.parliament.uk/api/Members/Search?Name=${req.query.name}&skip=0&take=20`, (err, response, body) => {
		res.send(JSON.parse(body))

		
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


app.get('/api/bills', (req, res) => {
	Feed.load('https://services.parliament.uk/Bills/AllPublicBills.rss', function(err, rss){
   		res.send(JSON.parse(rss.items));
	});
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