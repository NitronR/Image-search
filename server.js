// server.js
// where your node app starts

// init project
var express = require('express');
var mongodb=require('mongodb');
var image_search = require('google-images');
var searcher=new image_search(process.env.CSE_ID,process.env.API_KEY);
var app = express();
var db_url=process.env.DB_URL;

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/search",function(request,response){
  mongodb.MongoClient.connect(db_url,function(err,db){
    if(err) throw err;
    
    var collectn=db.collection('image_search');
    collectn.count(function(err,count){
      if(err ) throw err;
      var docs=[];
      collectn.find().each(function(err,doc){
        if(err) throw err;
        if(doc!=null && docs.length<count){
          delete doc['_id'];
          docs.unshift(doc);
          if(docs.length==count){
            response.send(docs);
          }
        }
      });
    });
  });
});

function insertSearch(search){
  mongodb.MongoClient.connect(db_url,function(err,db){
    if(err) throw err;
    var collectn=db.collection('image_search');
    collectn.count(function(err,count){
      if(err) throw err;
      if(count==10){
        var first=null;
        collectn.find().each(function(err,doc){
          if(err) throw err;
          if(doc!=null && first==null){
            first=doc;
            collectn.removeOne(doc,function(err,result){
              if(err) throw err;
            });
          }
        });
      }
      var time=new Date();
      collectn.insertOne({"search_term":search.replace("%20"," "),"time":time.toString()},function(err,result){
        if(err) throw err;
        db.close();
      });
    });
  });
}

app.get("/search/*",function(request,response){
  var quer=request.path.substring(8);
  var query=request.query;
  var offset=1;
  insertSearch(quer);
  if(query.offset){
    offset=query.offset;
    if(!(0<offset && offset<=91)){
      response.send({"error":"offset should be from 1 to 91"});
      return;
    }
  }
  
  searcher.search(quer,{page:offset}).then(function(results){
    var images=new Array(results.length);
    for(var i=0;i<results.length;i++){
      images[i]={};
      images[i].url=results[i].url;
      images[i].title=results[i].description;
      images[i].thumbnail=results[i].thumbnail.url;
      images[i].page_url=results[i].parentPage;
    }
    response.send(images);
  });
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
