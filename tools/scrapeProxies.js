const request = require('request');
const cheerio = require('cheerio');
const fs = require("fs");
const tcpp = require("tcp-ping");
const util = require("util");
const axios = require("axios");

const tcpPing = util.promisify(tcpp.ping);

const proxiesFile = "./data/proxies.json";
const verifiedProxiesFile = "./data/verifiedProxies.json";

let proxyObjsArr = getProxiesFromJson(proxiesFile);
let verifiedProxies = getProxiesFromJson(verifiedProxiesFile);

//scrape the website, get list of host:ip for proxies
//discard any we already know about
exports.scrapeProxies = scrapeProxies;

async function scrapeProxies () {
    await importFromProxiesFile("../proxies.txt");
    await scrapeSslproxiesOrg();
    await validateProxies();
    writeProxiesFile(proxiesFile);
}
async function getProxiesFromJson(filename) {
    return JSON.parse(fs.readFileSync(filename,"utf8"));
}
async function importFromProxiesFile(filename) {
    let proxiesFromFile = fs.readFileSync(filename,"utf8").split("\n");
    let proxyRe = /\b(?:25[0-5]|2[0-4][0-9]|[01]?\d{1,2})\.(?:25[0-5]|2[0-4][0-9]|[01]?\d{1,2})\.(?:25[0-5]|2[0-4][0-9]|[01]?\d{1,2})\.(?:25[0-5]|2[0-4][0-9]|[01]?\d{1,2}):(?:6[0-5][0-5][0-3][0-5]|[1-4]?\d{1,4})\b/
    let proxyRegEx = new RegExp(proxyRe);
    proxiesFromFile = proxiesFromFile.filter(p => proxyRegEx.test(p));
    await createProxiesObj(proxiesFromFile);
}
async function scrapeSslproxiesOrg () {
    let ip_addresses = [];
    let port_numbers = [];
    let proxiesArr = [];
    try {
        const response = await axios.get("https://sslproxies.org/");
        if (response && response.data) {
            console.log(`Got HTTP 200 for proxies list.`);
            const $ = cheerio.load(response.data);

            $("td:nth-child(1)").each(function (index, value) {
                ip_addresses[index] = $(this).text();
            });

            $("td:nth-child(2)").each(function (index, value) {
                port_numbers[index] = $(this).text();
            });
        } else {
            console.log("Error loading proxy, please try again");
        }
    } catch (e) {
        console.error(`Error getting sslproxies.org: ${e}`);
    }
    for (let i = 0; i < ip_addresses.length; i++) {
        let proxy = `${ip_addresses[i]}:${port_numbers[i]}`;
        proxiesArr.push(proxy);
    }
    await createProxiesObj(proxiesArr);
}
async function createProxiesObj(proxiesArr) {
    return proxiesArr.map(p => {
        let [host, port] = p;

        let verifiedAt = 0;
        const verifiedProxyInfo = verifiedProxies.find(v => v.host === host);
        if (verifiedProxyInfo && verifiedProxyInfo.verifiedAt) {
            verifiedAt = verifiedProxyInfo.verifiedAt;
        }
        return {
            host: host,
            port: port,
            ping: 0,
            verifiedAt: verifiedAt,
        }
    });
}
async function validateProxies(proxyObjsArr) {
    //ping all and wait for the result before moving on
    const promises = proxyObjsArr.map(pingPort);
    proxyObjsArr = await Promise.all(promises);

    //filter out any with errors or 0 ping
    proxyObjsArr = proxyObjsArr.filter((p) => (p.error !== true || p.ping !== 0));

    //filter out any that are not unique
    proxyObjsArr = proxyObjsArr.filter((p,i,a) => {
        return a.findIndex(t => (t.host === p.host)) === i;
    });

    //sort the proxies list by verified and ping
    proxyObjsArr = proxyObjsArr.sort((a, b) => {
        if (a.verifiedAt === b.verifiedAt) {
            return a.ping - b.ping;
        }
        if (a.verifiedAt) {
            return -1;
        }
        return 1;
    });
    return proxyObjsArr;
}
function writeProxiesFile(filename) {
    fs.writeFile(filename, JSON.stringify(proxyObjsArr), (err) => {
        if (err) throw err;
        console.log("Wrote proxies file successfully");
    });
}

async function pingPort(proxy) {
    const ping = await tcpPing({
        address: proxy.host,
        port: proxy.port,
        timeout: 1000,
        attempts: 5,
    });
    proxy.ping = 0;
    if(ping.results.some((a) => (a.time !== undefined))) {
        proxy.ping = ping.results.reduce((acc, n) => {
            if (n.time) {
                acc.ping = Math.round((acc.ping * acc.entries + n.time) / (acc.entries + 1) * 100) / 100;
                acc.entries++;
            }
            return acc;
        }, {ping: 0, entries: 0}).ping;
    } else {
        proxy.error = true;
    }
    return proxy;
}