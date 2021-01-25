const axios = require("axios");
const fs = require("fs");

exports.sendRequestToVerify = async function sendRequestToVerify(ip,port,proxyIp,proxyPort) {
    const addr = `http://${ip}:${port}`;
    try {
        const res = await axios.get(addr, {
            timeout: 7500,
            proxy: {
                host: proxyIp,
                port: proxyPort,
            }
        });
        if (res && res.data) {
            console.log(`succeeded in contacting to verify: ${res.data}`);
            return res.data;
        } else {
            console.error(`failed in contacting to verify: ${res.status}`);
        }
    } catch (e) {
        console.error(`Error while verifying: ${e}`);
    }
}