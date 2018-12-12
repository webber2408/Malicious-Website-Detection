var fs = require('fs'),
    esprima = require('esprima'),
    estraverse = require('estraverse'),
    request = require('request');
    cheerio = require('cheerio'),
    csv = require("fast-csv"), es = require('event-stream');
    // var each = require('async-each');
    // var lineNr = 0;
    var parse = require('csv-parse');
// var async = require('async');



const mongoose = require('mongoose');
var thingSchema = new mongoose.Schema({}, { strict: false });
var Thing = mongoose.model('Thing', thingSchema);

mongoose.connect('mongodb://localhost:27017/major', { useNewUrlParser: true }).catch(function (reason) {
console.log('Unable to connect to the mongodb instance. Error: ', reason);
});


function analyzeCode(code,pageToVisit,label, callback) {
    //to parse the js code
    var analysis_object={};
    try {
        var ast = esprima.parseScript(code);
    
    // var analysis_object = {};
    var dict= {};
   //console.log(ast);
  // console.log(JSON.stringify(ast, null, 4));
    //to add the stats to the analysis object
    var addStatsEntry = function (obj_name) {
        if (!analysis_object[obj_name]) {
            analysis_object[obj_name] = { count: 0};
        }
    };
    
    console.log('here');
    //to traverse the abstract syntax tree
    estraverse.traverse(ast, {
        enter: function (node) {
            var properties=['search','split','onbeforeunload','onload','onerror','onunload','onbeforeload','onmouseover','dispatchEvent','fireEvent','setAttribute','location','charAt','log','random','charCodeAt','decode','Quit','classid','classId','fromCharCode','concat','indexOf','substring','replace','addEventListener','attachEvent','createElement','getElementById','write','cookie','run'];
            var objects=['window','console','WScript','document','localStorage'];
            var functions=['eval','setTimeout','escape','unescape','parseInt'];
          
            if(node.type === 'Identifier' && node.name != undefined){
                var re_digit=new RegExp("^[0-9]$");
                var re_char=new RegExp("^[a-zA-Z]$");
                var re_hexa=new RegExp("0[xX][0-9a-fA-F]+");
                //var re_octa=new RegExp("[0-7]{1,3}");
                for(var i=0;i< node.name.length;i++){
                    if(re_digit.test(node.name[i])){
                        //to count digit in an identifier
                        addStatsEntry("digit_count_in_identifier");
                        analysis_object["digit_count_in_identifier"].count++;
                    }else if(re_char.test(node.name[i])){
                        //to count char in an identifier
                        addStatsEntry("char_count_in_identifier");
                        analysis_object["char_count_in_identifier"].count++;
                    }
                }
                if(node.name.match(re_hexa)){
                    //count of hexadecimal matching string within an identifier
                  //  console.log(node.name);
                    addStatsEntry("hexa_count");
                    analysis_object["hexa_count"].count++;
                }
            }
            if(node.property != undefined){
                if(properties.includes(node.property.name)){
                    addStatsEntry(node.property.name);
                    analysis_object[node.property.name].count++;
                }
            }
            if(node.object != undefined){
                if(objects.includes(node.object.name)){
                    addStatsEntry(node.object.name);
                    analysis_object[node.object.name].count++;
                }
            }
            if(node.type === 'VariableDeclaration'){
                addStatsEntry("var");
                analysis_object["var"].count++;
            }
            if(node.type === 'FunctionDeclaration'){
                addStatsEntry("function");
                analysis_object["function"].count++;
            }
            if(node.name === 'ActiveXObject'){
                addStatsEntry("ActiveXObject");
                analysis_object["ActiveXObject"].count++;
            }
            //
            if(node.type === 'CallExpression'){
                if(functions.includes(node.callee.name)){
                    addStatsEntry(node.callee.name);
                    analysis_object[node.callee.name].count++;                               
                }
            }
            //
            //divided URL
            if(node.type==='VariableDeclarator'){
                if(node.init!=null){
                    dict[node.id.name]=node.init.value;
                }
            }
            if(node.type==='CallExpression' && node.arguments!=undefined){
                var str={text: ""};
                inorder(node.arguments[0],str,dict);
                var res = str.text.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
                if(res!=null){
                    addStatsEntry("divided_url");
                    analysis_object["divided_url"].count++;
                }
            }
            var to_match_array = ['%','|','/','(',')',',','#','+','.','`','[',']','{','}'];
            if(node.type === "Literal"){
                var re_hexa=new RegExp("0[xX][0-9a-fA-F]+");
               // var re_octa=new RegExp("[0-7]{1,3}");
                if(node.raw != undefined){
                    // to match no of special char within a raw in literal
                      for(var i=0;i< node.raw.length;i++){
                        if(to_match_array.includes(node.raw[i])){
                            //console.log(node.raw[i]);
                            if(node.raw[i]=="."){
                                addStatsEntry("dot");
                                analysis_object["dot"].count++;
                            }else{
                                addStatsEntry(node.raw[i]);
                                analysis_object[node.raw[i]].count++;
                            }
                            
                        }
                        else if(node.raw[i]== " "){
                             // to match no of spaces within a raw in literal
                            addStatsEntry("space_count_in_raw");
                            analysis_object["space_count_in_raw"].count++;
                        }
                      } 
                      

                    //count of hexadecimal matching string within raw-litereal
                    if(node.raw.match(re_hexa)){                        
                     //   console.log(node.raw);
                        addStatsEntry("hexa_count");
                        analysis_object["hexa_count"].count++;
                    }//end of count of hexadecimal matching string within raw-litereal
                    // else if(node.raw.match(re_octa)){
                    //     //count of octal matching string within raw-litereal
                    //     console.log(node.raw);
                    //     addStatsEntry("octa_count");
                    //     analysis_object["octa_count"].count++;
                    // } // end of count of octal matching string within raw-litereal

                    //count of <iframe> or </iframe> matching string within raw-litereal
                    var count_start_iframe = node.raw.split("<iframe>").length-1;
                    var count_end_iframe = node.raw.split("</iframe>").length-1;
                    var count=count_start_iframe+count_end_iframe;
                    if(count>0){                 
                        addStatsEntry("iframe_count");
                        analysis_object["iframe_count"].count=analysis_object["iframe_count"].count+count;
                    }//end of count of <iframe> or </iframe> matching string within raw-litereal

                }
                else if(to_match_array.includes(node.value)){

                    addStatsEntry(node.value);
                    analysis_object[node.value].count++;
                }

                
            }
        }
    });
    //streami.resume();

    callback(pageToVisit,label,analysis_object);

} catch (e) {
   // console.log(e);
    // throw e;
    //streami.resume();
    callback(pageToVisit,label,analysis_object);
}
//console.log('here');
//    console.log(analysis_object);
//flag = 1;
}


var countuptill = 0;
function edit_save(pageToVisit,label,analysis_object){
        var final_object={};
        var total = 0;

        for(let key in analysis_object){
            total = total + analysis_object[key].count;
        }
        for(let key in analysis_object){
            //console.log(key);
            final_object[key] = analysis_object[key].count/total;
        }
        
        final_object.page = pageToVisit;
        final_object.label = label;
        
        console.log("above visited"+pageToVisit);
        var keysin = Object.keys(final_object);
        console.log("No of Keys:"+keysin.length);
        final_object.feature_length = keysin.length;  
        if(final_object.feature_length > 3){
            final_object.flag = 1;
        }else{
            final_object.flag = 0;
        }
        //console.log(final_object); 
          
        
        var thing = new Thing(final_object).save();
        countuptill += 1;
        console.log("Abhi tak itna hua hai : "+countuptill);
        streami.resume();
}

function inorder(node,str,dict){
    if(node!=undefined){
        if(node.type==='BinaryExpression' && node.operator!='+'){
            return;
        }
        if(node.left!=undefined){
            inorder(node.left,str,dict);
        }
        if(node.type=='Identifier'){
            str.text+=dict[node.name]; 
        }
        if(node.right!=undefined){
            inorder(node.right,str,dict);
        } 
    }   
}

/* code by rahul start */
function collectInternalLinks($,rootpageURL) {
  var allRelativeLinks = [];
  var allAbsoluteLinks = [];
  var scriptUptill="";
  var relativeLinks = $("script[src^='/']");
  relativeLinks.each(function() {
      allRelativeLinks.push($(this).attr('src'));
      //console.log($(this).attr('src'));
      scriptUptill+=visitScripts($(this).attr('src'),rootpageURL);
  });

  var absoluteLinks = $("a[href^='http']");
  absoluteLinks.each(function() {
      allAbsoluteLinks.push($(this).attr('href'));
      //console.log($(this).attr('href'));
  });
  return scriptUptill;
  //console.log("Found " + allRelativeLinks.length + " relative links");
  //console.log("Found " + allAbsoluteLinks.length + " absolute links");
}

function visitScripts(result,rootpageURL){
    var scriptUptill="";
    if(!result.includes(".com")){
        let final_url = rootpageURL+result;
        //console.log("Visiting page " + final_url);
        request(final_url, function(error, response, body) {
            if(error) {
                console.log("Error: " + error);
            }
            else{
                scriptUptill = scriptUptill + body;
                //console.log(body);
            }
        });
    }
    return scriptUptill;
}

//var scriptUptill="";

// end of code by rahul
// visit_page("http://ankitasharma.org","http://ankitasharma.org");

function visit_page(pageToVisit,rootpageURL,label){
    //pageToVisitNow= pageToVisit+i.toString();
    var scriptUptill=" ";
    console.log("Visiting page " + pageToVisit);


    try{
        request(pageToVisit, function(error, response, body) {
            if(error){
                console.log("Error: " + error);
                console.log("visited but error "+pageToVisit);
                //request.end();
            }
            else{
                // Check status code (200 is HTTP OK)
                // console.log("Status code: " + body);
                    if(response.statusCode === 200) {
                        // Parse the document body
                        var $ = cheerio.load(body);
                        // console.log("Page title:  " + $('title').text());
                        scriptUptill+=collectInternalLinks($,rootpageURL);
                        //var analysis_object = {};
                            $('script').each(function(i, ele) {
                                if(ele.children[0]!=undefined){
                                    var str=ele.children[0].data;
                                    scriptUptill = scriptUptill + str;
                                    
                                }
                            });
                           console.log(scriptUptill.length);
                           analyzeCode(scriptUptill,pageToVisit,label,edit_save);
                           //console.log(analysis_object);
                           return;
                    }
            }
           
        });
    }catch(e){

    }


   // return visit_page(pageToVisit,rootpageURL);

}

function fetchRootURL(url){
     return 'http://'+url;

     //for malicious
    //  return url.split(/[\/\/]/)[0]+'//'+url.split(/[\/\/]/)[2];
}

//function main(){
    var streami = fs.createReadStream("test1.csv")
    .pipe(parse({delimiter: ','}))
    .on('data', function(csvrow) {
        streami.pause();
        //console.log(csvrow[0]);
        setInterval(function(){
          
            //console.log("hey");
            
            streami.resume();
        },45000);

        console.log('here');
        let rootURL = fetchRootURL(csvrow[0]);
        console.log(rootURL);
        visit_page(rootURL,rootURL,csvrow[1]);
    })
    .on('end',function() {
        console.log("done");
    });
//}


// main();