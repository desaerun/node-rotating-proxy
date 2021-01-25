const request = require('request');
const cheerio = require('cheerio');
const fs = require("fs");
const tcpp = require("tcp-ping");
const util = require("util");

const tcpPing = util.promisify(tcpp.ping);

let ip_addresses = [];
let port_numbers = [];
let proxies = [];
let verifiedProxies = JSON.parse(fs.readFileSync("./verifiedProxies.txt","utf8"));
let verifiedProxyHosts = verifiedProxies.map((p) => p.host);

exports.scrapeProxies = function () {
    request("https://sslproxies.org/", async function (error, response, html) {
        if (!error && response.statusCode === 200) {
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
            const verifiedDataIndex = verifiedProxyHosts.findIndex(ip_addresses[i]);
            const proxy = {
                host: ip_addresses[i],
                port: port_numbers[i],
                ping: 0,
            }
            if(verifiedProxies[verifiedDataIndex]) {
                proxy.verifiedAt = verifiedProxies[verifiedDataIndex].verifiedAt;
            }
            proxies.push(proxy);
        }

        const promises = proxies.map(pingPort);
        const proxiesWithPing = await Promise.all(promises);
        const proxiesWIthNoErrors = proxiesWithPing.filter((p) => (p.error !== true && p.ping !== 0));
        const uniqueProxies = proxiesWIthNoErrors.filter((p,i,a) => {
            return a.findIndex(t => (t.host === p.host)) === i;
        });
        const sortedProxies = uniqueProxies.sort((a, b) => a.ping - b.ping);

        fs.writeFile("./proxies.txt", JSON.stringify(sortedProxies), (err) => {
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