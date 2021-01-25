const fs = require("fs");
const moment = require("moment");

proxiesList = fs.readFileSync("./data/proxies.json","utf8");
proxies = JSON.parse(proxiesList);

proxyHosts = new Set(proxies.map((p) => p.host));

proxies = proxies.sort((a,b) => {
    if (a.verifiedAt === b.verifiedAt) {
        return a.ping - b.ping;
    } else {
        return b.verifiedAt - a.verifiedAt;
    }
});
for (const proxy of proxies) {
    let verifiedMark = "";
    let verifiedDateTimeStr = "";
    if (proxy.verifiedAt > 0) {
        verifiedMark = "* ";
        const verifiedDateTime = moment(proxy.verifiedAt).format("YYYY-MM-DD hh:mm:ssA");
        verifiedDateTimeStr = `\t| Verified: ${verifiedDateTime}`;
    }

    console.log(`${verifiedMark}Host: ${proxy.host}\t| Port: ${proxy.port}\t| Ping: ${proxy.ping}${verifiedDateTimeStr}`);
}
numVerified = proxies.filter((p) => p.verifiedAt > 0).length;
console.log(`Proxies count: ${proxies.length} (${numVerified} verified)`);

function intersection(setA,setB) {
    let intersectedSet = new Set();
    for (let elem of setB) {
        if (setA.has(elem)) {
            intersectedSet.add(elem);
        }
    }
    return intersectedSet;
}