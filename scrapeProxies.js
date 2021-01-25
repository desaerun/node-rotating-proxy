const request = require('request');
const cheerio = require('cheerio');
const fs = require("fs");
const tcpp = require("tcp-ping");
const util = require("util");

const tcpPing = util.promisify(tcpp.ping);

let ip_addresses = [];
let port_numbers = [];

let proxiesList = JSON.parse(fs.readFileSync("./proxies.txt","utf8"));
let knownProxyStrings = proxiesList.map((p) => `${p.host}:${p.port}`);
let proxies = [];

//read in the file containing the verified proxies
let verifiedProxies = JSON.parse(fs.readFileSync("./verifiedProxies.txt","utf8"));
console.log(verifiedProxies);
let verifiedProxyHosts = verifiedProxies.map((p) => p.host);

//scrape the website, get list of host:ip for proxies
//discard any we already know about
scrapeProxies();

exports.scrapeProxies = scrapeProxies;

async function scrapeProxies () {
    await request("https://sslproxies.org/", async function (error, response, html) {
        if (!error && response.statusCode === 200) {
            console.log("Got HTTP 200");
            const $ = cheerio.load(html);

            $("td:nth-child(1)").each(function (index, value) {
                ip_addresses[index] = $(this).text();
            });

            $("td:nth-child(2)").each(function (index, value) {
                port_numbers[index] = $(this).text();
            });
        } else {
            console.log("Error loading proxy, please try again");
        }

        for (let i = 0; i < ip_addresses.length; i++) {
            const verifiedDataIndex = verifiedProxyHosts.findIndex((p) => p.host === ip_addresses[i]);
            const proxy = {
                host: ip_addresses[i],
                port: port_numbers[i],
                ping: 0,
            }
            if (verifiedProxies[verifiedDataIndex]) {
                proxy.verifiedAt = verifiedProxies[verifiedDataIndex].verifiedAt;
            }
            proxies.push(proxy);
        }
        console.log(proxies);

        //ping all and wait for the result before moving on
        const promises = proxies.map(pingPort);
        proxies = await Promise.all(promises);

        //filter out any with errors or 0 ping
        proxies = proxies.filter((p) => (p.error !== true && p.ping !== 0));

        //filter out any that are not unique
        proxies = proxies.filter((p,i,a) => {
            return a.findIndex(t => (t.host === p.host)) === i;
        });

        //sort the proxies list by verified and ping
        proxies = proxies.sort((a, b) => {
            if (a.verified === b.verified) {
                return a.ping - b.ping;
            }
            if (a.verified) {
                return -1;
            }
            return 1;
        });
        console.log(proxies);

        //add verifiedAt to proxies list for verified proxies;
        proxies = proxies.map((p) => {
            if (verifiedProxyHosts.includes(p.host)) {
                const verifiedProxyIndex = verifiedProxies.findIndex(t => {
                    console.log(`t: ${t} | p: ${p}`);
                    return t.host === p.host;
                });
                console.log(`index: ${verifiedProxyIndex}`);
                return p;
                // return {
                //     ...p,
                //     verifiedAt: verifiedProxies[verifiedProxyIndex].verifiedAt,
                // };
            }
        })
        console.log(proxies);

        fs.writeFile("./proxies.txt", JSON.stringify(proxies), (err) => {
            if (err) throw err;
            console.log("Wrote proxies file successfully");
        });
    });
}

async function pingPort(proxy) {
    console.log(`Pinging ${proxy.host}`);
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
        console.log(`Avg ping: ${proxy.host}:${proxy.port} :: ${proxy.ping}ms`);
    } else {
        console.log(`Proxy ${proxy.host}:${proxy.port} was dead, not adding.`);
        proxy.error = true;
    }
    return proxy;
}