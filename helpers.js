
//Just a helper function to retrieve a webpage.
const http = require('follow-redirects').http;
const https = require('follow-redirects').https;
const fs = require('fs')
function retrieveWebpage(address, callback) {
	let req;
	if(address.match(/https/)) {
		req = https
	} else {
		req = http
	}

	req.get(address, (res) => {
		if(res.statusCode != 200) {
			callback(res.statusCode)
		}
	  	let rawData = '';	
		res.on('data', (chunk) => { rawData += chunk; });
		res.on('end', () => { 
			callback(null, rawData)
		})
	}).on('error', function(err) {
		callback(err)
	})
}

//Downloads an image to a file
function copyImage(address, filename, callback) {
	const file = fs.createWriteStream(filename)
	let req;
	if(address.match(/https/)) {
		req = https
	} else {
		req = http
	}
	req.get(address, (response) => {
		response.pipe(file);
		file.on('finish', function() {
	      file.close(callback);
	    });
	}).on('error', function(err) {
		fs.unlink(filename)
		callback(err)
	})
}

module.exports = {copyImage: copyImage, retrieveWebpage: retrieveWebpage}