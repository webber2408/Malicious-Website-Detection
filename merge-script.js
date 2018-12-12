var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("major");
  //Find all documents in the customers collection:
  dbo.collection("malicious").find({}).toArray(function(err, result) {
    if (err) throw err;
    //console.log(result);
    console.log(result.length);
    for(var i=0;i<result.length;i++){
        dbo.collection("combined").insertOne(result[i], function(err, res) {
            if (err) throw err;
            console.log(" document inserted =>"+i+1);
            db.close();
          });
    }
    db.close();
  });
});
