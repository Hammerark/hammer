const fs = require('fs');
const res = [];
function findFiles(d) {
  try {
    for(const item of fs.readdirSync(d, {withFileTypes: true})) {
      if(item.name === 'node_modules' || item.name === 'dist') continue;
      const path = d + '/' + item.name;
      if (item.isDirectory()) { findFiles(path); }
      else if (path.includes('Ovre') || path.includes('Smestadvei')) { res.push(path); }

    }
  } catch(e) {}
}
findFiles('/app');
console.log(res);
