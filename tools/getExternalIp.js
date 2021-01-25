const axios = require("axios");

async function getExternalIp() {
    try {
        const res = await axios.get("http://ipv4bot.whatismyipaddress.com/");
        if (res && res.data) {
            return res.data;
        } else {
            console.log(res.status);
        }
    } catch (e) {
        console.error(e);
    }
}
exports.getExternalIp = getExternalIp;