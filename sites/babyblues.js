const helpers = require('./../helpers.js')
const df = require('dateformat')

//(webpagehtml) => {next: relative-url-to-next-comic-page, first: relative-url-to-first-comic-page, image: url-to-image, filename: filename-to-give-the-image}
function parseWebpage(page) {
	const obj = {}
	obj.first = "/comics/january-8-1995"


	//This went through a couple of iterations. I believe the meta tags may work on all pages, but I haven't tested.
	//The original match attempts match pre Jan 7th 1996. Afterwards, they no longer do. Very strange

	obj.filename = page.match(/input type=\"hidden\"\s*name=\"featureDate\"\s*value=\"(\S+)\"/)
	if(obj.filename) {
		obj.filename = obj.filename[1]
	} else {
		obj.filename = df(new Date(page.match(/og:title\"\s*content=\"([^\"]*)\"/)[1]), "yyyymmdd")
	}
	obj.filename = obj.filename + ".gif"
	obj.image = page.match(/featureName\"\s*value=\"Baby Blues\"\s*\/\>\s*\<img src=\"(\S*)\"/)
	if(obj.image) {
		obj.image = obj.image[1]
	} else {
		obj.image=page.match(/og:image\"\s*content=\"([^\"]*)\"/)[1]
	}
	

	obj.next = page.match(/href=\"(\S*)\"\s*rel=\"next\"/)
	if(obj.next) {
		obj.next = obj.next[1]
		obj.next = obj.next.replace(getDomain(), "")
	}
	return obj
}

//Maps from the comic name to the URL of the first page for the comic
function nameToFirstPage(name) {
	return getDomain() + "/comics/http://babyblues.com/comics/january-8-1995/"
}

//Required if update functionality is to be supported. Can be left out, but will throw in such a case
function filenameToUrl(name, date) {
	date = date.replace(".gif", "");
	date = date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8)  + " 12:00" //Not portable. Need to create it in current timezone
	ds = df(new Date(date), "mmmm-d-yyyy")
	return getDomain() + "/comics/" + ds
}


function getDomain() {
	return "http://babyblues.com"
}

function ls() {
	console.log("Baby Blues - babyblues")
}

module.exports = {parseWebpage: parseWebpage, nameToFirstPage: nameToFirstPage, filenameToUrl: filenameToUrl, getDomain: getDomain, ls: ls}