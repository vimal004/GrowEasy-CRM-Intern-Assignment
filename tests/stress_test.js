const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8080';
const CONCURRENT_REQUESTS = 5;

async function runStressTest() {
  console.log(`🚀 Starting concurrent upload stress test against ${BACKEND_URL}...`);
  
  // Create a temporary small CSV file for uploading
  const csvContent = 'Name,Email,Phone,Company\n' +
    'Test Person 1,test1@example.com,9876543210,Test Corp\n' +
    'Test Person 2,test2@example.com,9876543211,Test Corp';
  const filePath = path.join(__dirname, 'stress_temp.csv');
  fs.writeFileSync(filePath, csvContent);

  try {
    const promises = Array.from({ length: CONCURRENT_REQUESTS }).map(async (_, index) => {
      console.log(`[Request ${index + 1}] Sending upload request...`);
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      
      const header = `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="stress_temp.csv"\r\n` +
        `Content-Type: text/csv\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;

      const body = Buffer.concat([
        Buffer.from(header),
        Buffer.from(csvContent),
        Buffer.from(footer)
      ]);

      const response = await fetch(`${BACKEND_URL}/api/import`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
      });

      console.log(`[Request ${index + 1}] Received response status: ${response.status}`);
      if (response.status !== 200) {
        const text = await response.text();
        throw new Error(`Request ${index + 1} failed with status ${response.status}. Response: ${text}`);
      }
      const data = await response.json();
      return data;
    });

    const start = Date.now();
    const results = await Promise.all(promises);
    const elapsed = Date.now() - start;

    console.log(`✅ All ${CONCURRENT_REQUESTS} concurrent requests succeeded in ${elapsed}ms!`);
    console.log(`Metrics first result:`, results[0].metrics);
  } catch (error) {
    console.error('❌ Stress test failed:', error);
    process.exit(1);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

runStressTest();
