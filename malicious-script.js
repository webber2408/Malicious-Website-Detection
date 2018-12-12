var fs = require('fs'),
    esprima = require('esprima'),
    estraverse = require('estraverse')
     es = require('event-stream');
    // var each = require('async-each');
    // var lineNr = 0;
   
// var async = require('async');



const mongoose = require('mongoose');
var thingSchema = new mongoose.Schema({}, { strict: false });
var Thing = mongoose.model('malicious', thingSchema);

mongoose.connect('mongodb://localhost:27017/major', { useNewUrlParser: true }).catch(function (reason) {
console.log('Unable to connect to the mongodb instance. Error: ', reason);
});


var finalcount=0;
// List all files in a directory in Node.js recursively in a synchronous fashion
var walkSync = function(dir, filelist) {
    var fs = fs || require('fs'),
    files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
      if (fs.statSync(dir + '/' + file).isDirectory()) {
        filelist = walkSync(dir + '/' + file, filelist);
      }
      else {
        //console.log(dir);
        //console.log(dir+file);
        var final_path  = dir+'/'+file;
        //console.log(final_path);
        //finalcount += 1;
        //console.log("c->"+finalcount);
    //  filelist.push(file);
        
        //  fs.createReadStream(final_path)
        //       .on('data', function(data) {
        //         finalcount += 1;
        //         if(finalcount == 1){
        //           console.log(data.length);
                  
        //           console.log(typeof(data));
        //           var data_string = data.toString();
        //           console.log(data);
        //           analyze_code(data_string);
        //           console.log('c=>'+finalcount);
        //         }
                  
                 
        //       })
        //       .on('error',function() {
        //         console.log("error");
        //     });


          //method 2 files total => 2527
            if(final_path.includes('.js')){
                    fs.readFile(final_path, {encoding: 'utf-8'}, function(err,data){
                      if (!err) {
                          
                          finalcount += 1;
                         // if(finalcount == 1){
                            console.log('received data: ' + data.length);
                            console.log('c=>'+finalcount);
                            console.log(typeof(data));
                            //console.log(data);
                            analyze_code(data,finalcount,edit_save);
                         // }
                          
                          
                      } else {
                          console.log(err);
                      }
                  });
            }

      }
    });
    return filelist;
  };

var filelist1=[];
walkSync("C:/Users/hp/Desktop/MajorFinal/project/javascript-malware-collection",filelist1);
//console.log(filelist1.length);
//end of listing all files 




function analyze_code(code,counter,callback){
  console.log('hey');
  var analysis_object={};
  try{
    var dict= {};
    var ast = esprima.parseScript(code);
    var addStatsEntry = function (obj_name) {
        if (!analysis_object[obj_name]) {
            analysis_object[obj_name] = { count: 0};
        }
    };


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


        var final_object={};
        var total = 0;

        for(let key in analysis_object){
            total = total + analysis_object[key].count;
        }
        for(let key in analysis_object){
            //console.log(key);
            final_object[key] = analysis_object[key].count/total;
        }
        final_object["name"]= 'JS-22-'+counter;
       
        
        console.log('done-'+counter);
        console.log(final_object);
        callback(final_object);
  }catch(e){
    console.log(e);
  }
}
function edit_save(final_object){
    var thing = new Thing(final_object).save();
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