// server/services/ckanService.js
const https = require('https');

function searchCkan(keywords, id = null) {
  return new Promise((resolve, reject) => {
    let url;
    if (id) {
      // If an ID is provided, use the package_show endpoint
      const params = new URLSearchParams({ id });
      url = `https://catalog.data.gov/api/3/action/package_show?${params.toString()}`;
    } else {
      // Otherwise, use the package_search endpoint
      const params = new URLSearchParams({ q: keywords, rows: 9 });
      url = `https://catalog.data.gov/api/3/action/package_search?${params.toString()}`;
    }

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success) {
            // The structure is different for show vs. search
            resolve(id ? parsed.result : parsed.result.results);
          } else {
            reject(new Error('CKAN API returned an error.'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { searchCkan };