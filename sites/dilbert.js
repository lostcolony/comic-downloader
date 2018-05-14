const helpers = require('./../helpers.js')


//(webpagehtml) => {next: url-to-next-comic-page, first: url-to-first-comic-page, image: url-to-image, filename: filename-to-give-the-image}
function parseWebpage(page) {
	const obj = {}
	obj.first = "/strip/1989-04-16"

	let lines = page.split("\n")
	
	lines = lines.filter(x => x.match(/og:image|Next Strip|article:publish_date/))
	
	lines.forEach(line => {
		if(line.match(/Next Strip/)) {
			obj.next = line.match(/href=\"(\/[\S\/-]*)\"/)[1]
		} else if(line.match(/og:image/)) {
			obj.image = line.match(/content=\"(.*)\"/)[1]
		} else if(line.match(/article:publish_date/)) {
			obj.filename = new Date(line.match(/content=\"(.*)\"/)[1]).toISOString().split("T")[0] + ".gif"
		}
	})
	return obj
}

//Maps from the comic name to the URL of the first page for the comic
function nameToFirstPage(name) {
	const dateStr = new Date(new Date().getTime() - 24*60*60000).toISOString().split("T")[0]
	return getDomain() + "/strip/" + dateStr
}

//Required if update functionality is to be supported. Can be left out, but will throw in such a case
function filenameToUrl(name, date) {
	date = date.replace(".gif", "")
	const d = new Date(date)
	return getDomain() + "/strip/" + d.toISOString().split("T")[0]
}


function getDomain() {
	return "http://dilbert.com"
}

function ls() {
	console.log("Dilbert - dilbert")
}

module.exports = {parseWebpage: parseWebpage, nameToFirstPage: nameToFirstPage, filenameToUrl: filenameToUrl, getDomain: getDomain, ls: ls}