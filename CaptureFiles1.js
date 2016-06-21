/**********************************************************************
This Selenium job is called by Node  job and reads  the data on what to capture from  a JSON file

Read through JSON and for each file noted, open phantom browser and render image to output folder

Parameters : 
Folder to check for .html files  (with trailing slash)
Folder to which to write .png  files (with trailing slash)
Name of file to write transient JSON data store

**********************************************************************/

var RenderUrlsToFile, arrayOfUrls, system;
system = require("system");
outputfolder = "c:\\tmp\\";         //Default
infolder = "c:\\tmp\\";         //Default
var urlfile = "jsonoutput.json"
var childProcess = require('child_process');
var renderedImages;

var fs = require('fs');

/*Not required now
var env = system.env;
var nodepath; 

Object.keys(env).forEach(function (key) {
    //console.log(key + '=' + env[key]);
    //Get the Node Path (we do assume it was installed under nodejs, got to start somewhere)
    if (key == 'Path') {
        var nodeindex = env[key].indexOf("nodejs");
        var nodepathstart = env[key].lastIndexOf(';', nodeindex);
        nodepath = env[key].substring(nodepathstart + 1, nodeindex + 7);
        //Should really check if there is a slash at the end
        //console.log(nodepath);
    }
});
*/

var height = 768;
var width = 1024;
/*
Render given urls
@param array of URLs to render
*/
var arrayOfUrls = null;
console.log(process.argv.length);
console.log(process.argv);
if (process.argv.length == 5 ) {
    inputfolder = process.argv[2].replace(",", "");
    outputfolder = process.argv[3].replace(",", "");
    urlfile = process.argv[4].replace(",", "");
    console.log("inputfolder : " + inputfolder);
    console.log("outputfolder : " + outputfolder);
    console.log("urlfile : " + urlfile);
    console.log("+++++++++++++++++++++++++++++++++++++++++");
    //Add some file error handling here!
    var urldata = fs.readFileSync(urlfile);
  //  console.log('URLs' + urldata);
    jsondata = JSON.parse(urldata);
//    console.log('Number of URLs: ' + jsondata.length);
    //fs.changeWorkingDirectory(outputfolder);  
} else {
    console.log("Usage: CaptureFiles1.js [sourcefolder], [outputfolder], [jsonfile.json]");
    process.exit();
}

//console.log('JSON Data : ');
//console.log(jsondata);
//console.log(jsondata[0]);

//Log each file requested from the json 

for (i = 0; i < jsondata.length; i++) {
 //   console.log(jsondata[i].filepath);
}

var pageindex = 0;


var webdriver = require('selenium-webdriver');

var keyword = "Nooob";

var driver = new webdriver.Builder().forBrowser('chrome').build();
    
//driver.get('http://www.google.com');
//driver.findElement(webdriver.By.name('q')).sendKeys(keyword);
//driver.findElement(webdriver.By.name('btnG')).click();

var mobile_emulation = { "deviceName": "iPad" }
//var chrome_options = driver.ChromeOptions();


//driver.wait(function () {return 
/*
driver.takeScreenshot().then(function (data) {
    var base64Data = data.replace(/^data:image\/png;base64,/, "")
    fs.writeFile(outputfolder + "\\out.png", base64Data, 'base64', function (err) {
        if (err) console.log(err);
        console.log("Wrote to " + outputfolder + "\\out.png");
        process.exit();
        return true;
    });
});
*/
    //);}, 2000);

console.log("async ran");
console.log(jsondata.length);

var loadInProgress = false;

var interval = setInterval(function () {

    //If no other page is being loaded during this tick, and we have not reached the end of the requested files

    if (!loadInProgress && pageindex < jsondata.length) {
        //while (pageindex < jsondata.length) {
        //        console.log("Load image " + (pageindex + 1));
        //for (var pageindex = 0; pageindex < jsondata.length;) {
        var prefix = "";
        //Get the file path and the page id (matched pair of data)		
        var thisFile = jsondata[pageindex].filepath;
        var thisFileID = jsondata[pageindex].filename;
        //If file path starts with a "/" don't add another one
        if (thisFile.indexOf("/") == 0) {
            prefix = "file://"
        } else {
            prefix = "file:///"
        }
        console.log("Open ID " + thisFileID + " location " + prefix + thisFile)
        //Don't render non index html files
        if (thisFile.indexOf("index") > 0) {
            console.log("driver get");
            loadInProgress = true;
            driver.get(prefix + thisFile);
            console.log("Get File " + thisFile);
            driver.takeScreenshot().then(function (data) {
                console.log("Screen Shot ");
                var base64Data = data.replace(/^data:image\/png;base64,/, "")
                fs.writeFile(outputfolder + "\\" + thisFileID + ".png", base64Data, 'base64', function (err) {
                    if (err) console.log(err);
                    console.log("Wrote to " + outputfolder + "\\" + thisFileID + ".png");
                    loadInProgress = false;
                    pageindex++;
                    //return true;
                });
            });
            //            driver.wait(function () {  return              }, 2000);
        } else {
            console.log("Not an Index File");
            loadInProgress = false;
            pageindex++;
        }
    }
    }, 250);

        //}

/*
if (pageindex >= jsondata.length) {
        console.log("image render complete!");
        driver.exit();
        process.exit();
    }
*/
//}

//If page starts loading, set load in progress flag to true (to stop timer ticks from trying to load another page)
/*

var chromedriver = require('chromedriver');

args = [
	// optional arguments
];
chromedriver.start(args);
// run your tests
chromedriver.stop();



page.onLoadStarted = function () {
    loadInProgress = true;
    //page.settings.userAgent = "Phantom.js bot";
    console.log('page ' + (pageindex + 1) + ' load started');
};

//When page load finishes, just log it (originally render event ran from here but caused problems with sync)

page.onLoadFinished = function () {
    console.log('page ' + (pageindex + 1) + ' load finished');
};

page.onConsoleMessage = function(msg) {
  system.stderr.writeLine( 'console: ' + msg );
};
*/

