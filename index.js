const fs = require('fs')
const path = require('path')
const asyncmap = require('async-map');
const helpers = require("./helpers")
//Runs the main parsing functionality
function execute(config, comicurl, callback, count) {
	console.log("Retrieving:", config.interface.getDomain() + comicurl)
	try {

		helpers.retrieveWebpage(config.interface.getDomain() + comicurl, (err, data) => {
			if(err && !count) {
				console.error("Please re-attempt on comic: ", comicurl)
				if(callback) {
					return callback(err)
				} else {
					process.exit(1)	
				}
			} 

			if(err && count) {
				console.error("Failure to retrieve comic:", err)
				console.log("RETRYING")
				setTimeout(() => execute(config, comicurl, callback, count-1),(4-count)*1000)
				return;
			} 
			let obj;
			try {
				obj = config.interface.parseWebpage(data);
			}catch(ex) {
				if(count) {
					console.log("Failure to parse:", ex)
					console.log("RETRYING")
					setTimeout(() => execute(config, comicurl, callback, count-1),1000)
					return
				} else {
					if(callback) {
						return callback(err)
					}else {
						process.exit(1)
					}
				}
			}
			if(obj.image == "ERROR") {
				console.error("Failure: Failed to retrieve image");
				console.error("Please re-attempt on comic: ", comicurl)
				if(callback) {
					return callback(err)
				} else {
					process.exit(1)	
				}
			}

			helpers.copyImage(obj.image, path.join(config.directory, obj.filename), (err) => {
				if(err && !count) {
					console.error("Failure: ", err)
					console.error("Please re-attempt on comic: ", comicurl)
					if(callback) {
						return callback(err)
					} else {
						process.exit(1)	
					}
				}

				if(err) {
					console.error("Failed to write image:", err)
					console.log("RETRYING")
					setTimeout(() => execute(config, comicurl, callback, count-1),1000)
					return
				}

				console.log("Wrote out: ", path.join(config.directory, obj.filename))

				if(config.end && comicurl == config.end) {
					console.log("Finished writing out", config.comicName)
					if(callback) {
						return callback()
					} else {
						process.exit()	
					}
				} else if(!obj.next) {
					console.log("Finished writing out", config.comicName)
					if(callback) {
						return callback()
					} else {
						process.exit()	
					}
				} else {
					setTimeout(() => execute(config, obj.next, callback, 3),1000)
				}

			})
		})
	} catch(ex) {
		if(!count) {
			console.error("Failure:", ex);
			if(callback) {
				callback(ex)
			} else {
				process.exit()
			}	
		} else {
			console.error(ex)
			console.log("Retrying")
			setTimeout(() => execute(config, comicurl, callback, count-1),1000)
		}
	}
}

//Returns an implementation interface for a given site
function siteToInterface(site) {
	if(!site) {
		return "ERROR: Site must be supplied"
	}
	const sites = fs.readdirSync("./sites")
	const matches = sites.filter(x => x == site + ".js")
	if(matches.length == 0) {
		return "ERROR: Site unsupported"
	}
	return require("./sites/" + matches[0])
}

//Runs the update functionality
function executeUpdates(objects) {
	if(!objects.length){
		console.log("Finished");
		process.exit()
	} else {
		const config = objects.pop()
		config.interface = siteToInterface(config.site)
		if(typeof(config.interface) == "string") {
			console.error(config.interface)
			process.exit(1)
		}

		const files = fs.readdirSync(config.directory).filter(x => x != ".DS_Store")
		asyncmap(files, (file, cb) => fs.stat(path.join(config.directory, file), cb), (err, stats) => {
			
			const zipped = []
			for(var i = 0;i<files.length;i++) {
				zipped.push([stats[i].birthtime, files[i]])
			}
			zipped.sort((a, b) => {
				if(a[0] < b[0]) {
					return -1
				} else if(a[0] > b[0]) {
					return 1
				} else {
					return 0
				}
			})
			const resume = zipped[zipped.length - 1][1] //We sorted by created time, took the last item created, took the second element, which is the file name
			config.firstComic = config.interface.filenameToUrl(config.comicName, resume).replace(config.interface.getDomain(), "/").replace("//", "/")
			console.log("Starting to write out:", config.comicName)
			execute(config, config.firstComic, (err) => {
				//Purposely ignoring errors to continue with other comics
				setTimeout(() => executeUpdates(objects), 1000)
			}, 3)
		})
	}
}

//Gets the selected site name from the command line arguments, and selects the relevant interface
function getSite(argv, config) {
	return new Promise(function(resolve, reject) {
		config.site = argv.site
		config.interface = siteToInterface(argv.site)
		if(typeof(config.interface) == "string") {
			reject(config.interface)
		} else {
			resolve()
		}
	})
}

//Gets the selected comic name from the command line arguments
function getComic(argv, config) {
	return new Promise(function(resolve, reject) {
		if(argv.comic) {
			config.comicName = argv.comic
			helpers.retrieveWebpage(config.interface.nameToFirstPage(argv.comic), (err, page) => {
				if(err) {
					console.error(err, page)
					return reject("ERROR: Comic does not exist")
				}

				const obj = config.interface.parseWebpage(page)
				config.firstComic = obj.first
				return resolve()
			})
		} else {
			return reject("Comic must be specified")
		}	
	})
}


//TODO: Make dependent on having the comic first. A little non-trivial, and I just don't care since I don't see me calling this before getComic
//Gets the directory the downloaded comics will end up in (off the command line if provided)
function getDirectory(argv, config) {
	return new Promise(function(resolve, reject) {
		if(argv.directory) {
			config.directory = argv.directory
		} else {
			config.directory = __dirname + "/" + config.comicName
		}

		if(!fs.existsSync(config.directory))	{
			fs.mkdir(config.directory, (err) => {
				if(err) {return reject(err)}

				return resolve()
			})
		} else {
			return resolve()
		}	
	})
}

//If the user has chosen to download just a range of comics, will parse out the selected start of the range.
function getStart(argv, config) {
	return new Promise(function(resolve, reject) {
		if(argv.start) {
			if(config.interface.filenameToUrl) {
				config.firstComic = config.interface.filenameToUrl(config.comicName,argv.start).replace(config.interface.getDomain(), "/").replace("//", "/")
			} else {
				config.firstComic = argv.start
			}		
		} 
		resolve()
	})
}

//If the user has chosen to download just a range of comics, will parse out the selected end of the range.
function getEnd(argv, config) {
	return new Promise(function(resolve, reject) {
		if(argv.end) {
			if(config.interface.filenameToUrl) {
				config.end = config.interface.filenameToUrl(config.comicName,argv.end).replace(config.interface.getDomain(), "/").replace("//", "/")
			} else {
				config.end = argv.end
			}
		}

		resolve()
	})
}

function bailIfDownloadAlreadyStarted(argv, config) {
	return new Promise(function(resolve, reject) {
		if(fs.readdirSync(config.directory).length > 0) {
			reject("Files already started downloading; please either delete directory, or run update instead (and ensure comic is detailed in update.json)")
		} else {
			resolve()
		}
	})
}

//Writes out update.json to include a new downloaded strip if the user has selected one
function writeToJson(argv, config) {
	return new Promise(function(resolve, reject) {
		let updateJson;

		//Sync because this op has to happen before we do anything else anyway, and so might as well keep control flow simple
		if(!fs.existsSync("./update.json")) {
			updateJson = {}
		} else {
			updateJson = JSON.parse(fs.readFileSync("./update.json").toString())
		}

		let entry = updateJson.filter(x => x.site == config.site && x.comicName.toLowerCase() == config.comicName.toLowerCase())
		if(entry.length) {
			entry = entry[0]
			if(entry.directory != config.directory) {
				reject("Comic has been downloaded before to a different location; please either remove or update the entry in update.json")
			}else {
				resolve()
			}
		} else {
			entry = {
				site: config.site,
			    comicName: config.comicName,
			    directory: config.directory
			}
			if(config.end) {
				entry.end = config.end
			}
			updateJson.push(entry)
			fs.writeFileSync("./update.json", JSON.stringify(updateJson, null, 2));
			resolve()
		}
	})
}

//Reads update.json to prepare to update all downloaded strips
function readJSON(argv) {
	return new Promise(function(resolve, reject) {
		if(!fs.existsSync("./update.json")) {
			reject("No update.json file found in directory. Please run in download mode first")
		} else {
			updateJson = JSON.parse(fs.readFileSync("./update.json").toString())
			if(argv.site && argv.comic) {
				const updates = updateJson.filter(x => x.site == argv.site && x.comicName == argv.comic)
				if(!updates.length) {
					return reject("Unrecognized site/comic; please correct or download instead")
				} else {
					return resolve(updates)
				}
			}
			resolve(updateJson)
		}
	})
}


//Main functionality. Determines what operation mode and then chains together the relevant bits to activate it.
function main() {
	//Just declaring key names for clarity's sake
	const config = {
		interface: null, //Gets set to the actual domain specific implementation
		comicName: null, //Name as understood by the interface, in the event a site has more than one comic
		firstComic: null, //URL to the first comic
		directory: null, //Directory to save images to
		end: null //User supplied end if they wish to end prematurely. Not well tested, and not checked for validity
	}
	const argv = require('minimist')(process.argv.slice(2));
	if(argv._.length == 0) {
		console.error("Mode must be supplied; either ls, download, or update")
	}
	argv._.forEach(x => {
		if(x == 'ls') {
			if(argv.site) {
				const imp = siteToInterface(argv.site)
				if(typeof(imp) == "string") {
					console.error("Unrecognized site")
					return	
				} else {
					imp.ls()
				}
			} else {
				console.log("Possible site values:")
				fs.readdirSync("./sites").map(x => x.replace(".js", "")).forEach(x => console.log("\t", x))
			}
			return
		} else if(x == 'download') {
			//Since I'm mutating in place, I don't need to thread state through these functions, just pass the same reference
			//into each promise.
			getSite(argv,config).then(() => getComic(argv,config)).then(() => getDirectory(argv, config)).then(() => getStart(argv, config))
				.then(() => getEnd(argv, config)).then(() => writeToJson(argv, config)).then(() => bailIfDownloadAlreadyStarted(argv,config))
				.then(() => {
					execute(config, config.firstComic)
				}).catch((err) => {
					console.error("ERROR:", err);
					return
				})

			return
		} else if(x == "update") {
			readJSON(argv).then(executeUpdates).catch((err) => {
				console.error("ERROR: ", err);
				return
			})
		} else {
			console.error("Unrecognized mode")
			return
		}
	})
}

main()
