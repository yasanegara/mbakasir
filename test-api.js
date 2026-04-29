const https = require('https');
https.get('https://world.openfoodfacts.org/api/v0/product/8992761166318.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 200)));
});
