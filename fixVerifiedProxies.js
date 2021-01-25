const fs = require("fs");

const verifiedProxies = fs.readFileSync("./verifiedProxies.txt","utf8").split(",");
let newVerifiedProxies = [];
for (const proxyIp of verifiedProxies) {
    const proxyObj = {
        host: proxyIp,
        verifiedAt: 1,
    }
    newVerifiedProxies.push(proxyObj);
}
const verifiedProxiesStr = JSON.stringify(newVerifiedProxies);
fs.writeFileSync("./newVerifiedProxies.txt",verifiedProxiesStr);

