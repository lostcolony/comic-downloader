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
        })
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
        })
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

async function main() {
    let comics = JSON.parse(fs.readFileSync("./comics.json"))
    for(let i=0;i<comics.length;i++) {
        let comic = comics[i]
        let domain = new URL(comic.start).origin
        if(!fs.existsSync(comic.name)) {
            await fsp.mkdir(comic.name)
        }
        let finished = false
        while(comic.start && !finished) {
            //get start page
            let page = await getWebpage(comic.start)
            //parse it
            let parsedDom = new dom().parseFromString(page)
            let next = prependURL(domain, evaluate(comic.nextXpath, parsedDom))
            let image = evaluate(comic.imageXpath, parsedDom)
            let suffix = path.extname(image)
            let title;
            if(comic.titleXpath) {
                title = evaluate(comic.titleXpath, parsedDom)
            } else {
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
            } else {
                finished = true
            }
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