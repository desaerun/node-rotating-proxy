const proxyChain = require('proxy-chain');
const fs = require("fs");
const randomUseragent = require("random-useragent");
const {scrapeProxies} = require("./tools/scrapeProxies");

var currentProxy;
var proxiesList;
var verifiedProxiesList;

exports.createRotatingProxyServer = function createRotatingProxyServer(listenPort,rotateTimeout, requireVerified,maxVerifiedAgoMinutes) {
    getProxiesList();
    getVerifiedProxiesList();

    setProxy(requireVerified,maxVerifiedAgoMinutes);
    setInterval(() => { setProxy(requireVerified,maxVerifiedAgoMinutes); }, (rotateTimeout * 1000));

    const server = new proxyChain.Server({
        // Port where the server will listen. By default 8000.
        port: listenPort,

        // Enables verbose logging
        verbose: true,

        // Custom function to authenticate proxy requests and provide the URL to chained upstream proxy.
        // It must return an object (or promise resolving to the object) with the following form:
        // { requestAuthentication: Boolean, upstreamProxyUrl: String }
        // If the function is not defined or is null, the server runs in simple mode.
        // Note that the function takes a single argument with the following properties:
        // * request      - An instance of http.IncomingMessage class with information about the client request
        //                  (which is either HTTP CONNECT for SSL protocol, or other HTTP request)
        // * username     - Username parsed from the Proxy-Authorization header. Might be empty string.
        // * password     - Password parsed from the Proxy-Authorization header. Might be empty string.
        // * hostname     - Hostname of the target server
        // * port         - Port of the target server
        // * isHttp       - If true, this is a HTTP request, otherwise it's a HTTP CONNECT tunnel for SSL
        //                  or other protocols
        // * connectionId - Unique ID of the HTTP connection. It can be used to obtain traffic statistics.
        prepareRequestFunction: ({request, username, password, hostname, port, isHttp, connectionId}) => {
            const randomProxy = currentProxy;
            console.log(`Random proxy chosen: ${JSON.stringify(randomProxy)}`);
            const protocol = isHttp ? "http" : "https";

            const proxyServer = `http://${randomProxy.host}:${randomProxy.port}`;
            return {

                // Sets up an upstream HTTP proxy to which all the requests are forwarded.
                // If null, the proxy works in direct mode, i.e. the connection is forwarded directly
                // to the target server. This field is ignored if "requestAuthentication" is true.
                upstreamProxyUrl: proxyServer,
            };
        },
    });

    server.listen(() => {
        console.log(`Proxy server is listening on port ${server.port}`);
    });

// Emitted when HTTP connection is closed
    server.on('connectionClosed', ({connectionId, stats}) => {
        console.log(`Connection ${connectionId} closed`);
        console.dir(stats);
    });

// Emitted when HTTP request fails
    server.on('requestFailed', ({request, error}) => {
        console.log(`Request ${request.url} failed`);
        console.error(error);
    });

    //watch the proxies.json and verifiedProxies.json file for changes, update the arrays if they change.
    fs.watchFile("./data/proxies.json", () => {
        console.log("Proxies file changed, updating proxies list.")
        getProxiesList();
    });
    fs.watchFile("./data/verifiedProxies.json", () => {
        console.log("Verified proxies file changed, updating verified proxies list.")
        getVerifiedProxiesList();
    });
}
function getProxiesList() {
    proxiesList = JSON.parse(fs.readFileSync("./data/proxies.json","utf8"));
    return proxiesList;
}
function getVerifiedProxiesList() {
    verifiedProxiesList = proxiesList.filter(p => p.verified !== 0);
    return verifiedProxiesList;
}

function setProxy(requireVerified,maxVerifiedMinutesAgo) {
    console.log("Rotating proxy.");
    currentProxy = getRandomProxy(800,requireVerified,maxVerifiedMinutesAgo);
}

function getRandomProxy(maxPing = 500,requireVerified = false,maxVerifiedMinutesAgo = 60) {
    let validProxies;
    if (requireVerified) {
        const maxVerifiedMsAgo = maxVerifiedMinutesAgo * 60 * 1000;
        validProxies = verifiedProxiesList.filter(p => {
            const verifiedMsAgo = (+Date.now() - p.verifiedAt);
            return (p.verifiedAt !== 0 && verifiedMsAgo <= maxVerifiedMsAgo);
        });
        if (validProxies.length === 0) {
            console.error("No verified working proxies were found, defaulting to whole list.");
            validProxies = proxiesList;
        }
    } else {
        validProxies = proxiesList;
    }
    const lowPingProxies = validProxies.filter(p => {
        return p.ping < maxPing;
    });

    const randomProxy = getRandomArrayMember(lowPingProxies);
    console.log(`random proxy: ${randomProxy.host}:${randomProxy.port}`);
    return {
        host: randomProxy.host,
        port: randomProxy.port,
        ping: randomProxy.ping,
        verified: randomProxy.verifiedAt,
    };
}
function getRandomUserAgent() {
    return randomUseragent.getRandom();
}
function getRandomArrayMember(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}