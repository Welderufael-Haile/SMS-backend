const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const uploadDir = path.join(__dirname, 'test_uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Create a file with #
fs.writeFileSync(path.join(uploadDir, 'test_#.pdf'), 'test content');
// Create a file with encoded #
fs.writeFileSync(path.join(uploadDir, 'test_%23.pdf'), 'test content encoded');

app.use('/uploads', express.static(uploadDir));
app.use((req, res) => res.status(404).send('Not Found'));

const server = app.listen(5002, async () => {
  console.log('Server started');
  try {
    const fetch = require('node-fetch'); // or just use http
    const http = require('http');

    const testUrl = (url) => new Promise((resolve) => {
      http.get(url, (res) => {
        resolve(res.statusCode);
      });
    });

    console.log('Testing /uploads/test_#.pdf:', await testUrl('http://localhost:5002/uploads/test_#.pdf'));
    console.log('Testing /uploads/test_%23.pdf:', await testUrl('http://localhost:5002/uploads/test_%23.pdf'));
    console.log('Testing /uploads/test_%2523.pdf:', await testUrl('http://localhost:5002/uploads/test_%2523.pdf'));

  } catch (e) {
    console.error(e);
  } finally {
    server.close();
  }
});
