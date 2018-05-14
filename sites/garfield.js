const helpers = require('./../helpers.js')


//(webpagehtml) => {next: url-to-next-comic-page, first: url-to-first-comic-page, image: url-to-image, filename: filename-to-give-the-image}
function parseWebpage(page) {
	const obj = {}
	obj.first = "/comic/1978/06/19"

	let lines = page.split("\n")
	
	lines = lines.filter(x => x.match(/img class=\"img-responsive\" src=\"(\S*\.gif)\"|comicdatepicker/))

	
	//This is a little ugly, but it's multi-line, soooo, eh.
	const nextMatch = page.match(/href=\"(\S*)\"\s+class=\"btn btn-default btn-xs\"\>\s*Next/)
	if(nextMatch) {
		obj.next = nextMatch[1].replace("https://garfield.com", "")
	}
	
	lines.forEach(line => {
		if(line.match(/img class=\"img-responsive\" src=\"(\S*\.gif)\"/)) {
			obj.image = line.match(/src=\"(\S*)\"/)[1]
		} else if(line.match(/comicdatepicker/)) {
			obj.filename = line.match(/value=\"(\S*)\"/)[1] + ".gif"
		}
	})
	return obj
}

//Maps from the comic name to the URL of a fixed for the comic
function nameToFirstPage(name) {
	const dateStr = new Date(new Date().getTime() - 24*60*60000).toISOString().split("T")[0]
	console.log("Returning: ",  getDomain() + "/comic/" + dateStr)
	return getDomain() + "/comic/" + dateStr
}

//Required if update functionality is to be supported. Can be left out, but will throw in such a case
function filenameToUrl(name, date) {
	date = date.replace(".gif", "")
	const d = new Date(date)
	return getDomain() + "/comic/" + d.toISOString().split("T")[0]
}


function getDomain() {
	return "https://garfield.com"
}

function ls() {
	console.log("Garfield - garfield")
}

module.exports = {parseWebpage: parseWebpage, nameToFirstPage: nameToFirstPage, filenameToUrl: filenameToUrl, getDomain: getDomain, ls: ls}