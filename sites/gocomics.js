const helpers = require('./../helpers.js')


//(webpagehtml) => {next: url-to-next-comic-page, first: url-to-first-comic-page, image: url-to-image, filename: filename-to-give-the-image}
function parseWebpage(page) {
	let lines = page.split("\n")
	//Running a matcher for the three cases I care about, just so I can iterate through every line once.
	lines = lines.filter(x => x.match(/fa btn btn-outline-default btn-circle fa-caret-right sm|fa btn btn-outline-default btn-circle fa-forward sm|fa btn btn-outline-default btn-circle fa fa-backward sm|data-image|article:published_time/))
	const obj = {}
	lines.forEach(line => {
		if(line.match(/fa btn btn-outline-default btn-circle fa-caret-right sm/)) {
			obj.next = line.match(/href=\'(\S*)'/)[1]
		} else if(line.match(/fa btn btn-outline-default btn-circle fa fa-backward sm/)) {
			obj.first = line.match(/href=\'(\S*)'/)[1]
		} else if(line.match(/data-image/)) {
			obj.image = line.match(/data-image=\"(.*)\"/)[1]
			if(obj.image == "//assets.gocomics.com/content-error-missing-image.jpeg") {
				obj.image = "ERROR"
			}
		} else if(line.match(/article:published_time/)) {
			obj.filename = line.match(/content=\"(.*)\"/)[1] + ".gif"
		}
	})
	return obj
}

//Maps from the comic name to the URL of the first page for the comic
function nameToFirstPage(name) {
	return getDomain() + "/" + name
}

//Required if update functionality is to be supported. Can be left out, but will throw in such a case
function filenameToUrl(name, date) {
	date = date.replace(".gif", "")
	const d = new Date(date)
	return getDomain() + "/" + name + "/" + d.toISOString().split("T")[0].replace(/-/g, '/')
}


function getDomain() {
	return "http://www.gocomics.com"
}

function ls() {
	helpers.retrieveWebpage("http://www.gocomics.com/comics/a-to-z", (err, data) => {
		if(err) {
			console.error(err)
			return
		}else {
			let lines = data.split("\n");
			lines = lines.filter(x => x.match(/media-heading|amu-media-item-link/))
			while(lines.length > 1) {
				url = lines.shift().match(/href=\"\/(.*)\"/)[1]
				name = lines.shift().match(/\'\>(.*)\<\/h/)[1]
				console.log(name, " - '" + url + "'")
			}
			return
		}
	})
}

module.exports = {parseWebpage: parseWebpage, nameToFirstPage: nameToFirstPage, filenameToUrl: filenameToUrl, getDomain: getDomain, ls: ls}