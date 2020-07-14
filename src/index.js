const express = require('express')
const dotenv = require('dotenv')
// const { initializeDatabase } = require('./initialize')
const PORT = process.env.PORT || 4001
const cors = require('cors')
const request = require('request')
const Feed = require('rss-to-json');
const Twitter = require('twitter')
var bodyParser = require('body-parser')
var path = require('path')
dotenv.config({path:'.env'})
const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(path.resolve(__dirname, '..', 'build')));  
const dbqueries  = require('./dbqueries')


// console.log('looping', members.items.lenfth)
// let queries = []
// for (var i = 0; i < members.items.length; i++){
  
  
  
// }/

// dbqueries.getUnknownMembers()

// Promise.all(queries)
// .then((resolution) => {
//   console.log(resolution)
// })
// .catch((err) => {
//   console.log('error')
// })


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
    if (body){
      res.send(JSON.parse(body))
    
    } else {
      console.log('error')
    }
    
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
    let coords
    body = JSON.parse(body)
     if (body && body.result){
       coords = {longitude:body.result.longitude, latitude:body.result.latitude, latitudeDelta: 1, longitudeDelta: 1} 
     } else {
       res.status(500).send('error with postcode')
     }
    

    if (body && body.result && body.result.parliamentary_constituency){
      processPostcodes(body.result.parliamentary_constituency, coords)
      .then((toSend) => {
        
        // toSend.constituency = constituency
        // toSend.mp = person
        res.status(200).send(toSend)
      })
      .catch(() => {
        res.status(500).send('error')
      })
    }
    
  })
})



function processPostcodes(parliamentary_constituency, coords){

  
  return new Promise((resolve, reject) => {


  request(`https://members-api.parliament.uk/api/Location/Constituency/Search?searchText=${parliamentary_constituency}`, (err2, response2, body2) => {
        const constituencies= JSON.parse(body2)
        const toSend  = {
          constituency: {
            id: constituencies.items[0].value.id,
            name: constituencies.items[0].value.name,
            coords: coords,
          },
          mp:constituencies.items[0].value.currentRepresentation.member.value.id
        }
        resolve(toSend)


        // dbqueries.getPerson(constituencies.items[0].value.currentRepresentation.member.value.id)
        // .then((person) => {
        //   resolve({constituency, person})
        // })
        // .catch(() => {
        //   reject('error')
        // })
        
      })
 })
}


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


app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`)
})



