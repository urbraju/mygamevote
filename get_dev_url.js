const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/repos/urbraju/mygamevote/actions/runs?branch=dev&status=success&per_page=1',
  headers: { 'User-Agent': 'Node.js' }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const runs = JSON.parse(data).workflow_runs;
    if (runs && runs.length > 0) {
      console.log(`Latest successful run ID: ${runs[0].id}`);
      // Now fetch jobs to find the deploy step
      const jobsUrl = runs[0].jobs_url;
      https.get(jobsUrl, { headers: { 'User-Agent': 'Node.js' } }, (jRes) => {
        let jData = '';
        jRes.on('data', (c) => jData += c);
        jRes.on('end', () => {
            const jobs = JSON.parse(jData).jobs;
            const deployJob = jobs.find(j => j.name === 'Deploy to Firebase Hosting');
            if (deployJob) {
                 console.log(`Deploy Job ID: ${deployJob.id}`);
                 console.log("To view logs, user needs to check GitHub UI or we need auth token for logs API.");
            }
        });
      });
    } else {
      console.log("No successful runs found on dev.");
    }
  });
});
