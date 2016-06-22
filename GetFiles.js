/**********************************************************************
Read file system for list of Files
Generate a screenshot for each matched file pair
Resize Screenshots to Thumbnail size
Copy Thumbnails to each folder as "Thumb.png"
Zip up each folder and move to Build Folder

//TO DO - Create the CTL file for each Zip
//TO DO - Automate the FTP upload for each Zip

//TO DO - MASSIVE REFACTORING NEEDED!  Done in drubs as drabs as worked out on the fly

This NODE job calls a second PHANTOM job and passes the data by writing a JSON file
to the output folder where the screenshots go
Then calls back to itself and does the resize and zip

Parameters : 
Folder to check for .html files  (with trailing slash)
Folder to which to write .png  files (with trailing slash)
Name of file to write transient JSON data store
Build Directory to target for final zips
Presentation Name
Whether or not to create thumbnails
Whether or not to create zip files


Dependencies :

Underscore
Path
FS
ChildProcess
PhantomJS
Must have Graphicsmagick installed first
https://sourceforge.net/projects/graphicsmagick/files/graphicsmagick-binaries/1.3.23/

If Using CaptureFiles1 (Chrome Selenium) must have Selenium ChromeDriver installed
https://sites.google.com/a/chromium.org/chromedriver/

Routine :

Iterate through input folder passed in and extract only those files which have .html extension and have "index" in their path
Write matched files out to JSON data store in the output folder

Functions :

scan 

Iterates over the input folder given checking for files

getIDsAndNames(files)

parameters : receives the files retived by Scan

main function (inline)

Executes SCAN then retrieves list of ids from the database
Performs cross match then calls child process to fire off phantom job
Then performs resizing to thumbnail size

**********************************************************************/
var usephantom = false;         //Use PhantomJS

var underscore = require('underscore');
var path = require('path');
var fs = require('fs');
var async = require('async');
var childProcess = require('child_process');
var phantomjs = require('phantomjs');
var settings = require('./config');
var gm = require('gm');
var archiver = require('archiver');
var outputfile, infolder, outputfolder, buildir;
var binPath = phantomjs.path;
var args = process.argv.slice(2);       //Start cutting into an array at 2, this eliminate "node" and the name of the script from the argument list used
var filename = "index";		//Filename must contain this to be included in the output list for screenshots (and zipping), as well as the extension.  This eliminates other folders, like git.  Haven't found the "file hidden" flag yet
var fileextension = ".html";    //Filename must have this extension, so we don't try to screenshot css, js or similar files
var jsonoutput = "[";           //Need a carrier for the JSON file output list
var filejson = "[";
var presname = "mypres", thumbnails = "yes", zips = "yes";               //Overall presentaiton name, whether to create thumbnails, whether to create zip files

//Sanity kill after 10 minutes
setTimeout(function(){ 
	console.log('Timed out, quitting');
	process.exit(1); 
}, 360000);

//Sanity Kill if something goes wrong and isn't handled
process.on('uncaughtException', function(err) {
	console.log('Uncaught Exception ' + err + ' , quitting');	
	process.exit(1);
});

//Debugging statements
console.log("Args Length");
console.log(args.length);       //Need to check actual argument lenght, leave it for now
if (args.length > 0) {
    infolder = args[0];
    outputfolder = args[1];
    buildir = args[2];
    presname = args[3];
    thumbnails = args[4];
    zips = args[5];
} else {
    console.log("Usage: node.js GetFiles.js [infolder] [outputfolder] [Buildfolder] [Presentation Name] [Thumbnails] [Zips]");
    //Might rewrite this to always use config settings and not take arguments - depends how it ends up being used. Should also make this a function as duplicating all these read and checks
    infolder = settings.infolder;
    outputfolder = settings.outputfolder;
    buildir = settings.buildir;
    presname = settings.presname;
    thumbnails = settings.thumbnails;
    zips = settings.zips;

    if (typeof (infolder) === "undefined") { infolder = path.normalize(path.resolve(__dirname) + path.sep) };
    if (typeof (outputfolder) === "undefined") { outputfolder = path.normalize(phantomjs.path.replace('phantomjs.exe', '')) };
    if (typeof (buildir) === "undefined") { buildir = infolder + "\build" }; //Need to create if does not exist
    if (typeof (presname) === "undefined") { presname = "DefaultPresentation" }; //Need to create if does not exist
    if (typeof (thumbnails) === "undefined") { thumbnails= "yes" }; 
    if (typeof (zips) === "undefined") { zips = "yes" }; 

}
outputfile = outputfolder + "jsonoutput.json";

console.log("In = " + infolder);
console.log("Output to " + outputfolder);
console.log("Build Folder " + buildir);
console.log("Presentation Name " + presname);
console.log("Thumbnails " + thumbnails);
console.log("Zips " + zips);
checkDirectorySync(buildir) //Do a trailing slash check!
console.log("JSON File " + outputfile);

//Change this to use a different sub process for the file rendering (e.g. if wanted to use Casper, Slimer or Selenium)

//    //If require node binary, use this
//    var nodeindex = process.env.path.indexOf("nodejs");
//    var nodepathstart = process.env.path.lastIndexOf(';', nodeindex);
//    var nodepath = process.env.path.substring(nodepathstart + 1, nodeindex + 7);
//    binPath = "\"" + nodepath + "node\" " +  path.join(__dirname, 'CaptureFiles1.js')

var childArgs = [
    //path.join(__dirname, 'multipath.js'), URLs
    path.join(__dirname, 'CaptureFiles.js'), infolder, outputfolder
];


//Function Definition
//To iterate over the entire input folder recursively for files with specified extension  and containing "index" in their path
//Need to rewrite this using Q library to avoid having everything in the callback to scan, which blocks further access to the file system via fs (makes things very hard)

var scan = function (dir, suffix, callback) {

    console.log("Checking for " + suffix + " content in " + dir);
    try {
        fs.readdir(dir, function (err, files) {
            var returnFiles = [];
            async.each(files, function (file, next) {
                var filePath = dir + '/' + file;
                fs.stat(filePath, function (err, stat) {
                    if (err) {
                        console.log("Error " + err);
                        return next(err);
                    }
                    if (stat.isDirectory()) {
                        console.log("Checking Directory");
                        scan(filePath, suffix, function (err, results) {
                            if (err) {
                                return next(err);
                            }
                            returnFiles = returnFiles.concat(results);
                            next();
                        });
                    }
                    else if (stat.isFile()) {
                        console.log("Is File" + file);
                        try {
                            if (file.indexOf(suffix, file.length - suffix.length) !== -1) {
                                if (filePath.indexOf(filename) > 0) {
                                    returnFiles.push(path.normalize(filePath).replace(/\\/g, '/'));
                                } else {
                                    console.log("Not " + suffix + " or  " + filename);
                                }
                            }
                        } catch (e) { console.log(e); }
                        next();
                    }
                });
            }, function (err) {
                //WHen all done, call here
                console.log("Any Read Directory Errors = " + err);
                callback(err, returnFiles);
            });
        });
    } catch (err){
        console.log(err);
    }
    
};


function generateImages() {
    try {
        console.log("This will take around ten minutes, standby");
        console.log(binPath + " " + childArgs);
        if (!usephantom) {
            //C:\\code\\psa_uk_2016_august\\ C:\\code\\screens3\\ C:\\code\\screens3\\jsonoutput.json
                childProcess.exec("node CaptureFiles1.js " + infolder + " " +  outputfolder + " " + outputfile, function (err, stdout, stderr) {
                    console.log(stdout);
                    console.log(stderr);
                    console.log(err);
                    sortoutzips(function () { console.log("Completed"); process.exit() })
                }); 
        }
        else {
                    childProcess.execFile(binPath, childArgs, function (err, stdout, stderr) {
                        // handle results
                        console.log(stdout);
                        console.log(stderr);
                        console.log(err);
                        sortoutzips(function () { console.log("Completed"); process.exit() })
                    });
            }
    } catch (err) {
        console.log('Error running phantom job');
        console.log(err);
    }	

}

function produceFileList(files) {
    // Do something with files that ends in '.html'.
    console.log("Found files");
    console.log(files);
    //Once files are gathered output them to disk
    getIDsAndNames(files);
    //Set up the child job 
    childArgs.push(outputfile);
    console.log("Set up for execute " + binPath + " " + childArgs);
}

//Call the function defined above (note scan= declaration is runtime not compile time - needs to be up there as won't be hoisted)
scan(infolder, fileextension, function (err, files) {
    produceFileList(files);
//Call the Phantom Process (or not), pass it sortout zips (or not)
    generateImages();
});

function sortoutzips(callback) {
    console.log("Now Ready to Resize");
    console.log("This will take around fifteen minutes, standby");
    //Now Resize them all into Thumbnails - copy back to the original input folder
    try {
        //fileextension = ".PNG";
        //For some reason you cannot iterate over this folder again here, probably because you are in the call back to the previous file iteration
        //Being in the scan callback means the fs object doesn't work - even if you create a new one
        //scanimages(outputfolder, fileextension, function (err, files) {
        //For each file that the scan loop found, call the changeFile function, use the jsondata that was output.  Bit hacky.
        var jsondata = JSON.parse(filejson);
        //var newjsondata = jsondata.substring(0, jsondata.length - 1);
        //newjsondata = newjsondata + ",{\"filename\" : \"shared\",\"filepath\":" + infolder + "\\index.html\"}]";

        console.log('Number of URLs: ' + jsondata.length);
        for (var i = 0; i < jsondata.length; i++) {
            var filename = jsondata[i].filename;
            theFile = outputfolder + "slideThumbnail-" + filename + ".PNG";
            console.log("Correcting file " + theFile);
            changeFile(theFile, filename);
        }
        console.log("For Loop Complete, Process Shared Folder");
        //Hard coded
        filename = "shared";

        //Hacky, add in the shared folder that should be there too.  Do a file exists later.
        var outfile = outputfolder + filename + "\\";
        outfile = buildir + presname + ".zip";
        zipfolder = infolder + filename;
        console.log("Zipping " + zipfolder + " into " + outfile);
        writeZip(zipfolder, outfile, callback);

    } catch (err) {
        console.log('Error running Resize job');
        console.log(err);
        callback();
    }
}

var getIDsAndNames = function (files) {

    /*Produce JSON list of actual physical files - for each file retrieved by the directory search (passed in here )*/
	//JSON from here (filejson) is temproary in memory only 
    for (var i = 0; i < files.length; i++) {
		//Extract the folder name above the index.html, e.g. edge_4, edge_12
		//Use that name to name the json and put full path out as paired variable
		var thisFile = files[i];
        var endfile = thisFile.lastIndexOf("/");
        var endslash = thisFile.lastIndexOf("/", endfile-1);
        var edgename = thisFile.substring(endslash+1, endfile);
        console.log(thisFile + " Last slash= " + endfile + " ,next slash= " + endslash + " ,giving " + edgename);
        filejson += "{\"filename\":\"" + edgename + "\", \"filepath\":\"" + thisFile + "\" },";
    }
	//Chop off last bracket
    filejson = filejson.substring(0, filejson.length - 1);
    filejson += "]";
    fs.writeFileSync(outputfile, filejson);
    //Needs to be synchronous, I think this is what was breaking the whole fs object access and thus resulted in the hacky "read the JSON file" approach to the screenshot resizing.
    //Which actually isn't a bad thing, as just resizing all PNGs wouldn't have worked anyway ...  would have been resizing background images and all sorts
};

//Convert graphics
//Write to original input folder as thumbs.jpg
//This is a bit hard coded to a standard directory structure but will do the job

var changeFile = function (someFile, filename) {
    var infile = someFile;
    var outfile = someFile.replace("slideThumbnail-", "thumb").replace(filename, "").replace(outputfolder, infolder + filename + "\\");
    console.log("Writing back to " + outfile);
    gm(infile)
        .resize(250, 150, '!')
        .write(outfile, function (err) {
            if (typeof (err) === 'undefined')
            {
                console.log("success");
                //Now zip up that output folder and add it to the build - do it here or you don't get the thumb, async!
                outfile = buildir + filename + ".zip";
                zipfolder = infolder + filename;
                console.log("Zipping " + zipfolder + " into " + outfile);
                writeZip(zipfolder, outfile, function () { });
            }
            else
            { console.log(err); }
        });
}

//Zip Packages
//Defined this way to ensure it is hoisted
function writeZip(dir, filename, cb) {
    var output = fs.createWriteStream(filename);
    var archive = archiver('zip');
    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        cb();
    });
    archive.on('error', function (err) {
        throw err;
    });
    archive.pipe(output);
    archive.bulk([
        { expand: true, cwd: dir, src: ['**'] }
    ]);
    archive.finalize();
};


//Check folder exists, if it doesn't, create it.
function checkDirectorySync(directory) {
    try {
        fs.statSync(directory);
    } catch (e) {
        fs.mkdirSync(directory);
    }
}