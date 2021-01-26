const fs = require("fs");
const read = fs.readFileSync("./data/proxies.json","utf8");
const readJson = JSON.parse(read);
console.log(read);
console.log(readJson);