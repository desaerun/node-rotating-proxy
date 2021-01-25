const {scrapeProxies} = require("./tools/scrapeProxies");
const {startVerifyServers} = require("./verifyingServer");
const {sendRequestToVerify} = require("./tools/sendRequestToVerify");
const {getExternalIp} = require("./tools/getExternalIp");
const {createRotatingProxyServer} = require("./rotatingProxyServer");

const mainProxyPort = 8080;
const secondaryProxyPort = 38080;

const verifyServerPort = 8081;

async function main() {
    //scrape proxies
    await scrapeProxies();
    //and again every 5 minutes
    setInterval(scrapeProxies, (5 * 60 * 1000));

    //create main proxy server, only uses verified proxies:
    createRotatingProxyServer(mainProxyPort, 15,true, 5);

    //create secondary server, for us to send requests through using ALL proxies
    //in order to update the verified proxies list.
    createRotatingProxyServer(secondaryProxyPort, 15,false);

    //start the servers which will catch the request and update the verified proxies list
    const verifyServerPorts = startVerifyServers();


    const extIp = await getExternalIp();
    console.log(`Got external IP as ${extIp}`);

    //send requests thru to the verify server, using the proxy specified
    setInterval(() => { sendRequestToVerify(extIp, verifyServerPorts.httpPort, "127.0.0.1", secondaryProxyPort); },8000);
}
main();