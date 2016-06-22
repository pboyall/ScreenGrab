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
var fs = require('fs');
var loadInProgress = false;
var arrayOfUrls = null;
var webdriver = require('selenium-webdriver');
var until = webdriver.until;
var by = webdriver.By;

var chromeCapabilities = webdriver.Capabilities.chrome();
var COO = {
    mobileEmulation: {
        deviceName: 'Apple iPad'
    }
};
var COH = {
    mobileEmulation: {
        deviceMetrics: {
            width: 1024,
            height: 768,
            mobile: true,
            touch: true
        }
    }
};

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
    jsondata = JSON.parse(urldata);
} else {
    console.log("Usage: CaptureFiles1.js [sourcefolder], [outputfolder], [jsonfile.json]");
    process.exit();
}


//Function for waiting until a condition is triggered
var waiter = function (condFunc, readyFunc, checkInterval) {
    var checkFunc = function () {
        if (condFunc()) {
            readyFunc();
        }
        else {
            setTimeout(checkFunc, checkInterval);
        }
    };
    checkFunc();
};

//Alternative Setting Options
//chromeCapabilities.set('chromeOptions', chromeOptions);
//chromeCapabilities.set('chromeOptions.CAPABILITY', chromeOptions);
//Works but Portrait chromeCapabilities.set('chromeOptions', COO);
chromeCapabilities.set('chromeOptions', COH);

// If no capabilities needed, i.e. no emulation var driver = new webdriver.Builder().forBrowser('chrome').build();
var driver = new webdriver.Builder().withCapabilities(chromeCapabilities).build();
driver.manage().window().setSize(1024, 860);
//This is required to trigger the window resize.
driver.get('http://www.google.com');
driver.takeScreenshot().then(function (data) {
    console.log("async ran");
});

//Function to allow looping with an async function inside the loop without javascript's dodgy threading model breaking everything

function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function () {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function () {
            return index - 1;
        },

        break: function () {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}

asyncLoop(jsondata.length, doScreenShots, function () { console.log("complete")});

//Screenshots Function that actually does the work
function doScreenShots(loop) {
    var pageindex = loop.iteration();
    console.log(pageindex + loadInProgress);
    if (!loadInProgress && pageindex < jsondata.length) {
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

            var driver = new webdriver.Builder().withCapabilities(chromeCapabilities).build();
            driver.manage().window().setSize(1024, 860);

            driver.get('http://www.google.com');
            driver.wait(until.elementLocated(by.tagName('link')), 10000, 'Could not locate the child element within the time specified').then(
                function () {
                    driver.takeScreenshot().then(function (data) {
                        console.log("async ran");
                    });
                }
            );

            driver.get(prefix + thisFile);          //this should block
            console.log("Get File " + thisFile);
            driver.wait(until.elementLocated(by.tagName('link')), 10000, 'Could not locate the child element within the time specified').then(
                function () {
                    //Next line does not block and thus causing lots of trouble
                    driver.takeScreenshot().then(function (data) {
                        console.log("Screen Shot ");
                        var base64Data = data.replace(/^data:image\/png;base64,/, "")
                        try {
                            fs.writeFileSync(outputfolder + "\\slideThumbnail-" + thisFileID + ".png", base64Data, 'base64')
                        } catch (e) {
                            console.log(err);
                        }
                        console.log("Wrote to " + outputfolder + "\\" + thisFileID + ".png");
                        loadInProgress = false;
                        driver.quit();
                        loop.next();
                    })
                });
            //});
        } else {
            console.log("Not an Index File");
            loadInProgress = false;
            loop.next();
        }
    } else {
        //Block thread warning
        console.log("blocked");
    }
}
