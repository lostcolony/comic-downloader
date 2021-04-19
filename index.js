const { http, https } = require('follow-redirects');
const xpath = require('xpath')
const dom = require('xmldom').DOMParser
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const mime = require('mime-types')

//xmldom is super chatty for any weird parsing. Rather than fork it,
//going to just silence them; will use console.log for anything internal here
console.error = () => {}
console.warn = () => {}

function getWebpage(url) {
    return new Promise( (resolve, reject) => {
        let req;
        if(url.match(/https/)) {
            req = https
        } else {
            req = http
        }

        req.get(url, (result) => {
            if(result.statusCode != 200) {
                reject(result.statusCode)
            }
            let rawData = '';	
            result.on('data', (chunk) => { rawData += chunk; });
            result.on('end', () => { 
                resolve(rawData)
            })
        }).on('error', function(err) {
            reject(err)
        }).on('timeout', (err) => {reject(timeout)
        }).setTimeout(5000)
    })
}

function copyImage(address, filename) {
    return new Promise((resolve, reject) => {
        let req;
        if(address.match(/https/)) {
            req = https
        } else {
            req = http
        }
        req.get(address, (response) => {
            const contentLength = response.headers['content-length']
            if(contentLength == 0) {
                return reject("Failed to download")
            }
            const contentType = response.headers['content-type']
            let extension = "."
            if(contentType) {
                extension += mime.extension(contentType)
                filename += extension
            }
            const file = fs.createWriteStream(filename)
            response.pipe(file);
            file.on('finish', function() {
              file.close(resolve);
            });
        }).on('error', function(err) {
            fs.unlink(filename)
            reject(err)
        }).on('timeout', (err) => {fs.unlink(filename), reject('timeout')
        }).setTimeout(5000)
    })
}

//Evaluates the xpath against the parsed dom tree.
function evaluate(toMatch, dom) {
    return xpath.select("string(" + toMatch + ")", dom)
}

//If we don't have the origin on the URL, prepend it.
function prependURL(origin, url) {
    if(!url) {
        return url
    } else if(url.match(/http/)) {
        return url
    } else {
        if(url[0] != "/") {
            url = "/" + url
        }
        return origin + url
    }
}

async function standardComicType(i, comics) {
    let comic = comics[i]
    let domain = new URL(comic.start).origin
    if(!fs.existsSync(comic.name)) {
        await fsp.mkdir(comic.name)
    }
    let finished = false
    while(comic.start && !finished) {
        let delayUntil = Date.now() + (comic.delay ? comic.delay : 0)
        let page = await getWebpage(comic.start)
        
        let parsedDom = new dom().parseFromString(page)
        let next = prependURL(domain, evaluate(comic.nextXpath, parsedDom))
        let image = evaluate(comic.imageXpath, parsedDom)
        let suffix = path.extname(image)
        let title;
        if(comic.titleXpath) {
            title = evaluate(comic.titleXpath, parsedDom)
        } else {
            //If we don't have a parsed title we're using numbers
            if(!comic.count) {
                comic.count = 1
            }
            title = comic.count.toString().padStart(6, '0')
        }
        await copyImage(image, comic.name + "/" + title + suffix)
        if(next && (!comic.end || comic.end != comic.start)) {
            if(comic.count) {
                comic.count += 1
            }
            comic.start = next
            comics[i] = comic
            fs.writeFileSync("./comics.json", JSON.stringify(comics, null, 2))
            await (new Promise(res => setTimeout(res, delayUntil - Date.now()))) //Inducing a delay so we don't overwhelm/trigger DOS preventions.
        } else {
            finished = true
        }
    } 
}

function kingGenerateURL(comic, date) {
    let year = date.getUTCFullYear()
    let month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
    let day = (date.getUTCDate()).toString().padStart(2, '0')
    let isSunday = date.getUTCDay() == 0
    let toEncode = comic.name 
        + "/" + year 
        + "/" + month
        + "/" + comic.midName + (isSunday ? comic.sundayExtension : "")
        + "." + year + month + day + "_1536.gif"
    return (comic.prefix + Buffer.from(toEncode).toString('base64'))
}

function kingFileName(comic, date) {
    return comic.name + "/" + date.toISOString().split("T")[0]
}

//Intentionally left out of README, and minimally documented.
//This isn't perfect; sufficiently early comics have a different naming scheme
//on the CDN, but it works going back to at least to 2000. Also assumes the
//end of the encoded file name is 1536, as it was on everything I was interested in.
//Specified as -
// {
//    "name" : "(meaningful; pulled from the decoded URL)",
//    "prefix" : "(everything in the API call to retrieve the image from the CDN)"
//    "sundayExtension" : "(_ht or _ntb or similar)"
// }

async function kingSyndicated(index, comics) {
    comic = comics[index]
    if(!comic.mostRecent) {
        comic.mostRecent = new Date()
        comic.mostRecent.setUTCSeconds = 0
        comic.mostRecent.setUTCMinutes = 0
        comic.mostRecent.setUTCHours = 0
        //Setting it back one day to avoid any timing issues
        comic.mostRecent.setDate(comic.mostRecent.getDate() - 1)
    } else {
        comic.mostRecent = new Date(comic.mostRecent)
    }
    if(!comic.next) {
        comic.next = new Date(comic.mostRecent)
    } else {
        comic.next = new Date(comic.next)
    }
    if(!fs.existsSync(comic.name)) {
        await fsp.mkdir(comic.name)
    }
    let finished = false
    while(comic.next && !finished) {
        try {
            await copyImage(kingGenerateURL(comic, comic.next), kingFileName(comic, comic.next))
            comic.next.setDate(comic.next.getDate() - 1)
            comics[index] = comic
            fs.writeFileSync("./comics.json", JSON.stringify(comics, null, 2))
            await (new Promise(res => setTimeout(res, 750))) //Inducing a delay so we don't overwhelm/trigger DOS preventions.
        } catch (ex) {
            console.log("Failed at trying to write - ", kingFileName(comic, comic.next), ex)
            finished = true
        }
    }
    finished = false
    while(comic.mostRecent && !finished) {
        try {
            await copyImage(kingGenerateURL(comic, comic.mostRecent), kingFileName(comic, comic.mostRecent))
            comic.mostRecent.setDate(comic.mostRecent.getDate() + 1)
            comics[index] = comic
            fs.writeFileSync("./comics.json", JSON.stringify(comics, null, 2))
            await (new Promise(res => setTimeout(res, 750))) //Inducing a delay so we don't overwhelm/trigger DOS preventions.
        } catch (ex) {
            console.log("Failed at trying to write - ", kingFileName(comic, comic.mostRecent), ex)
            finished = true
        }
    }
    //TODO: Refactor the above
}

async function main() {
    let comics = JSON.parse(fs.readFileSync("./comics.json"))
    for(let i=0;i<comics.length;i++) {
        let comic = comics[i]
        if(comic.type == "king") {
            await kingSyndicated(i, comics)
        } else {
            await standardComicType(i, comics)
        }
        
    }
}

(async () => {
    try {
        await main()
    } catch(ex) {
        console.log("Failed:", ex)
    }
    console.log("Done")
})()