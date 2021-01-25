const http = require("http");
const https = require("https");
const requestIp = require("request-ip");
const fs = require("fs");

const httpPort = 8081;
const httpsPort = 8082;

let verifiedProxies;
if (fs.existsSync("./verifiedProxies.txt")) {
    const alreadyVerified = JSON.parse(fs.readFileSync("./verifiedProxies.txt","utf8"));
    if (Array.isArray(alreadyVerified)) {
        verifiedProxies = new Set(alreadyVerified.map((p) => p.host));
    } else {
        verifiedProxies = new Set();
    }
} else {
    verifiedProxies = new Set();
}

const httpServer = new http.createServer((req,res) => {
    process(req,res,"http");
});
const httpsServer = new https.createServer((req,res) => {
    process(req,res,"https");
});

httpServer.listen(httpPort);
httpsServer.listen(httpsPort);

function process(req,res,protocol) {
    const proxyIp = getIp(req);
    console.log(`Received connection to ${protocol} server from ${proxyIp}`);
    verifiedProxies.add(proxyIp);
    for (const verifiedProxyIp of verifiedProxies) {
        const stats = {
            host: verifiedProxyIp,
            verifiedAt: +Date.now(),
        };
        verifiedProxies.push(stats);
    }
    const verifiedProxiesStr = JSON.stringify(verifiedProxies);
    fs.writeFileSync("./verifiedProxies.txt",verifiedProxiesStr);
    console.log("Updated verified proxies file.")
    res.end("Success!");
}

function getIp(req) {
    let ip = requestIp.getClientIp(req);
    ip = ip.split(":").slice(-1).join("");
    return ip;
}