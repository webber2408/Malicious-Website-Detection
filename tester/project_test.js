var fs = require('fs'),
    esprima = require('esprima'),
    estraverse = require('estraverse'),
    request = require('request');
    cheerio = require('cheerio');

//     const mongoose = require('mongoose');
//     var thingSchema = new mongoose.Schema({}, { strict: false });
//     var Thing = mongoose.model('Thing', thingSchema);
 
// mongoose.connect('mongodb://localhost:27017/major', { useNewUrlParser: true }).catch(function (reason) {
//     console.log('Unable to connect to the mongodb instance. Error: ', reason);
// });

function analyzeCode(code, analysis_object) {
    //to parse the js code
    try {
        var ast = esprima.parseScript(code);
    } catch (e) {
       // console.log(e);
        // throw e;
    }
    // var analysis_object = {};
    var dict= {};
   //console.log(ast);
    console.log(JSON.stringify(ast, null, 4));
    //to add the stats to the analysis object
    var addStatsEntry = function (obj_name) {
        if (!analysis_object[obj_name]) {
            analysis_object[obj_name] = { count: 0};
        }
    };
    

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
            if(node.type === 'CallExpression'){
                if(functions.includes(node.callee.name)){
                    addStatsEntry(node.callee.name);
                    analysis_object[node.callee.name].count++;                               
                }
            }
            
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
                //var re_octa=new RegExp("[0-7]{1,3}");
                if(node.raw != undefined){
                      //to match no of special char within a raw in literal
                      for(var i=0;i< node.raw.length;i++){
                        if(to_match_array.includes(node.raw[i])){
                            //console.log(node.raw[i]);
                            addStatsEntry(node.raw[i]);
                            analysis_object[node.raw[i]].count++;
                        }
                        else if(node.raw[i]== " "){
                            //to match no of spaces within a raw in literal
                            addStatsEntry("space_count_in_raw");
                            analysis_object["space_count_in_raw"].count++;
                        }
                      } 
                      

                    //count of hexadecimal matching string within raw-litereal
                    if(node.raw.match(re_hexa)){                        
                        //console.log(node.raw);
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

   // console.log(analysis_object);
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
  
    var relativeLinks = $("script[src^='/']");
    relativeLinks.each(function() {
        allRelativeLinks.push($(this).attr('src'));
        console.log($(this).attr('src'));
        visitScripts($(this).attr('src'),rootpageURL);
    });
  
    var absoluteLinks = $("a[href^='http']");
    absoluteLinks.each(function() {
        allAbsoluteLinks.push($(this).attr('href'));
        console.log($(this).attr('href'));
    });
  
    console.log("Found " + allRelativeLinks.length + " relative links");
    console.log("Found " + allAbsoluteLinks.length + " absolute links");
  }
  
  function visitScripts(result,rootpageURL){
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
  }
  var scriptUptill;
  


function visit_page(pageToVisit,rootpageURL){
    //pageToVisitNow= pageToVisit+i.toString();
    console.log("Visiting page " + pageToVisit);
    request(pageToVisit, function(error, response, body) {
        if(error) {
            console.log("Error: " + error);
            console.log("visited but error "+pageToVisit);
        }else{
            // Check status code (200 is HTTP OK)
            // console.log("Status code: " + body);
                if(response.statusCode === 200) {
                    // Parse the document body
                    var $ = cheerio.load(body);
                    // console.log("Page title:  " + $('title').text());
                    collectInternalLinks($,rootpageURL);
                    var analysis_object = {};
                        $('script').each(function(i, ele) {
                            if(ele.children[0]!=undefined){
                                var str=ele.children[0].data;
                                scriptUptill = scriptUptill + str;
                                
                            }
                        });
                        //console.log(scriptUptill.length);
                        analyzeCode(scriptUptill,analysis_object);
                        console.log("ANALYSIS OBJECT");
                        console.log(analysis_object);
                        analysis_object.page = pageToVisit;

                        console.log("above visited"+pageToVisit);
                        
                        var keysin = Object.keys(analysis_object);
                        console.log("TOTAL KEYS FETCHED : "+ keysin.length);
                        //console.log(keysin.length);
                        analysis_object.feature_length = keysin.length-1;
                        // var thing = new Thing(analysis_object).save();
        
                }
        }
       
    });

}


//to read the initial file
if (process.argv.length < 3) {
    console.log("usage: index.js file.js");
    process.exit(1);
}

var link = process.argv[2];
// console.log(link);
function fetchRootURL(link){

    return 'http://'+link;

    //for malicious
   //  return url.split(/[\/\/]/)[0]+'//'+url.split(/[\/\/]/)[2];
}
var root_url = fetchRootURL(link);
console.log(root_url);
visit_page(root_url,root_url);