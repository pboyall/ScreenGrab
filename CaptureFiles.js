/**********************************************************************
This PHANTOM job is called by Node  job and reads  the data on what to capture from  a JSON file

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

page = require('webpage').create(), loadInProgress = false;
var fs = require('fs');
var curdir = fs.list(fs.workingDirectory);


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

page.viewportSize = {
    "width": width,
    "height": height
};

if (system.args.length == 4 ) {
    inputfolder = system.args[1].replace(",", "");
    outputfolder = system.args[2].replace(",", "");
    urlfile = system.args[3].replace(",", "");
    console.log("inputfolder : " + inputfolder);
    console.log("outputfolder : " + outputfolder);
    console.log("urlfile : " + urlfile);
    console.log("+++++++++++++++++++++++++++++++++++++++++");
//Add some file error handling here!
    var urldata = fs.read(urlfile)
    console.log('URLs' + urldata);
    jsondata = JSON.parse(urldata);

    console.log('Number of URLs: ' + jsondata.length);
    fs.changeWorkingDirectory(outputfolder);  
} else {
    console.log("Usage: phantomjs CaptureFiles.js [sourcefolder], [outputfolder], [jsonfile.json]");
    phantom.exit;
}

console.log('JSON Data : ');
console.log(jsondata);
console.log(jsondata[0]);

//Log each file requested from the json 

for (i = 0; i < jsondata.length; i++) {
    console.log(jsondata[i].filepath);
}

var pageindex = 0;

//Start an interval timer which runs every 0.25 seconds - this is the master "counter"
//A separate "page is loading" indicator is used to prevent this from firing off multiple jobs in sucession
//See the page start load and end load events hooked in for how the timer is managed

var interval = setInterval(function () {

//If no other page is being loaded during this tick, and we have not reached the end of the requested files

    if (!loadInProgress && pageindex < jsondata.length) {
        console.log("Load image " + (pageindex + 1));
        var prefix = "";
//Get the file path and the page id (matched pair of data)		
        var thisFile = jsondata[pageindex].filepath;
        var thisFileID = jsondata[pageindex].filename;
        //If file path starts with a "/" don't add another one
        if (thisFile.indexOf("/") == 0) {
            prefix = "file://"
        }else{
            prefix = "file:///"
        }

        console.log("Open ID " + thisFileID  + " location " + prefix + thisFile)

        //Don't render non index html files
         if(thisFile.indexOf("index")> 0){
            page.open(prefix + thisFile, function () {
				page.viewportSize = {
					"width": width,
					"height": height
				};
                console.log("second tock" + (pageindex + 1));
				page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js', function(){
					page.evaluate( function(h, w){
						$("#Stage").css("height", h); 
						$("#Stage").css("width",w);
						$("body").css("height", h); 
						$("body").css("width", w); 
					}, height, width);
				});
				//Use timeout of five seconds to ensure animation has completed prior to rendering page
				//Once rendered set loadinprogress flag to false and increment pageindex counter
                window.setTimeout(function () {
                    page.render("slideThumbnail-" + thisFileID + ".png");
                    console.log("Rendered Image " + thisFileID + ".png");
                    system.stdout.writeLine(thisFileID + ".png");
                    pageindex++;
                    loadInProgress = false;
                }, 5000);
            });
         } else {
             console.log("Not an Index File");
			 loadInProgress = false;
             pageindex++;
         }
    }
    if (pageindex >= jsondata.length) {
        console.log("image render complete!");
        phantom.exit();
        clearInterval(interval);
        
    }
}, 250);

//If page starts loading, set load in progress flag to true (to stop timer ticks from trying to load another page)

page.onLoadStarted = function () {
    loadInProgress = true;
    page.settings.userAgent = "Phantom.js bot";
    console.log('page ' + (pageindex + 1) + ' load started');
};

//When page load finishes, just log it (originally render event ran from here but caused problems with sync)

page.onLoadFinished = function () {
    console.log('page ' + (pageindex + 1) + ' load finished');
};

page.onConsoleMessage = function(msg) {
  system.stderr.writeLine( 'console: ' + msg );
};


