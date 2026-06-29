import fs from 'fs';
import https from 'https';

const urls = [
  "https://www.dropbox.com/scl/fo/5s8i9j60f2np5qu56haft/ADs6rN2WHb4Zi7oSwsRGpIM?rlkey=6gwxvyeoo12a97fmg5x8xwozy&st=vcd8z3m7&dl=1",
  "https://www.dropbox.com/scl/fo/5s8i9j60f2np5qu56haft/ADs6rN2WHb4Zi7oSwsRGpIM?rlkey=6gwxvyeoo12a97fmg5x8xwozy&st=j8v6qnax&dl=1",
  "https://www.dropbox.com/scl/fo/5s8i9j60f2np5qu56haft/ADs6rN2WHb4Zi7oSwsRGpIM?rlkey=6gwxvyeoo12a97fmg5x8xwozy&st=nz3eeors&dl=1",
  "https://www.dropbox.com/scl/fo/5s8i9j60f2np5qu56haft/ADs6rN2WHb4Zi7oSwsRGpIM?rlkey=6gwxvyeoo12a97fmg5x8xwozy&st=1hxgyrgh&dl=1",
  "https://www.dropbox.com/scl/fo/5s8i9j60f2np5qu56haft/ADs6rN2WHb4Zi7oSwsRGpIM?rlkey=6gwxvyeoo12a97fmg5x8xwozy&st=kuftmbug&dl=1"
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  fs.mkdirSync('src/assets/images/Holmenveien 9', { recursive: true });
  for (let i = 0; i < urls.length; i++) {
    console.log(`Downloading ${i}...`);
    await download(urls[i], `src/assets/images/Holmenveien 9/img${i + 1}.jpg`);
  }
}
run();
