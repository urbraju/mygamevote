const https = require('https');
const token = process.env.GITHUB_TOKEN; // Attempt to use env token if available, or just get runs
const options = {
  hostname: 'api.github.com',
  path: '/repos/urbraju/mygamevote/actions/runs?branch=dev&status=success&per_page=1',
  headers: { 
      'User-Agent': 'Node.js',
      // 'Authorization': `Bearer ${token}` // Optional if public repo
  }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const runs = json.workflow_runs;
    if (runs && runs.length > 0) {
      console.log(`Latest successful run ID: ${runs[0].id}`);
      // Sleep a bit and check again if we need the latest one just pushed
    } else {
      console.log("No successful runs found on dev.");
    }
  });
});
