const fs = require("fs");

proxiesList = fs.readFileSync("./proxies.txt","utf8");
verifiedProxiesList = fs.readFileSync("./verifiedProxies.txt","utf8");
proxies = JSON.parse(proxiesList);
verifiedProxiesObj = JSON.parse(verifiedProxiesList);

proxyHosts = new Set(proxies.map((p) => p.host));
verifiedProxyHosts = new Set(verifiedProxiesObj.map ((p) => p.host));

verifiedProxies = [...intersection(proxyHosts,verifiedProxyHosts)];

for (const proxy of proxies) {
    proxy.verified = verifiedProxies.includes(proxy.host);
}
sortedProxies = proxies.sort((a,b) => {
    if (a.verified === b.verified) {
        return a.ping - b.ping;
    }
    if (a.verified) {
        return -1;
    }
    return 1;
});
for (const proxy of sortedProxies) {
    const verifiedStr = (proxy.verified) ? "* " : "";
    console.log(`${verifiedStr}Host: ${proxy.host}\t| Port: ${proxy.port}\t| Ping: ${proxy.ping}`);
}
numVerified = proxies.filter((p) => p.verified).length;
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