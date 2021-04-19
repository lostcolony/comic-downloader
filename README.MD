# Comic Downloader
This is a simple utility intended to download free (i.e., no authentication) comics from online sources.  

### Usage
1. After downloading, change out comics.json. It's a list of JSON objects containing the following attributes -
- 'name' is the name of the comic (user friendly name)
- 'start' is the comic to begin on (URL to the first comic)
- 'end' is the comic to finish with (URL to the last comic you want to download, in the event a run ends but continues as reprints or similar)
- 'imageXpath' is the xpath to the string URL for the comic image
- 'nextXpath' is the xpath to the string URL for the next comic
- 'titleXpath' is OPTIONAL, and is the xpath to the name for this particular image (i.e., the date, the numerical order, etc). If left off, comics will be named 000001, 000002, etc. Use only if you prefer date, and it's retrievable from the website.

2. Run `node index`

### Notes
This leverages an xpath parser to parse webpages. This is slow, but intentional; I found it a little more natural to write xpath syntax to select what I wanted than regexes, and the CPU to parse the page automatically induces latency so I didn't have to implement a timer to prevent DOS protections from kicking in.

Also, as comics are downloaded, the state is stored back into comics.json, so the start field will be automatically updated. This also means don't run the script and make edits to comics.json; they will be overwritten. It also means you're free to interrupt the script at any time, to resume later, without issue.
