const http = require("http");
const https = require("https");
const requestIp = require("request-ip");
const fs = require("fs");

const httpPort = 8081;
const httpsPort = 8082;

let verifiedProxies;
let verifiedProxyHosts;

exports.startVerifyServers = function startVerifyServers() {
    if (fs.existsSync("./data/verifiedProxies.json")) {
        verifiedProxies = JSON.parse(fs.readFileSync("./data/verifiedProxies.json", "utf8"));
        if (Array.isArray(verifiedProxies)) {
            verifiedProxyHosts = verifiedProxies.map((p) => p.host);
        } else {
            verifiedProxyHosts = [];
        }
    } else {
        verifiedProxyHosts = [];
    }

    const httpServer = new http.createServer((req, res) => {
        process(req, res, "http");
    });
    const httpsServer = new https.createServer((req, res) => {
        process(req, res, "https");
    });

    httpServer.listen(httpPort);
    console.log(`HTTP server listening on port ${httpPort}`);
    httpsServer.listen(httpsPort);
    console.log(`HTTPS server listening on port ${httpsPort}`);
    return {
        httpPort: httpPort,
        httpsPort: httpsPort,
    }
}
function process(req,res,protocol) {
    const proxyIp = getIp(req);
    console.log(`Received connection to ${protocol} server from ${proxyIp}`);
    if (verifiedProxyHosts.includes(proxyIp)) {
        console.log("We already knew this proxy was verified, but its verifiedAt was updated.");
        const verifiedProxy = verifiedProxies.find(p => p.host === proxyIp);
        if (verifiedProxy && verifiedProxy.verifiedAt) {}
            verifiedProxy.verifiedAt = +Date.now();
    } else {
        const newVerifiedProxy = {
            host: proxyIp,
            verifiedAt: +Date.now(),
        }
        verifiedProxies.push(newVerifiedProxy);
    }

    const verifiedProxiesStr = JSON.stringify(verifiedProxies);
    fs.writeFileSync("./data/verifiedProxies.json",verifiedProxiesStr);
    console.log("Updated verified proxies file.");

    res.end(`Success! Proxy IP: ${proxyIp} (Real IP is 73.68.105.242)`);
}

function getIp(req) {
    let ip = requestIp.getClientIp(req);
    ip = ip.split(":").slice(-1).join("");
    return ip;
}