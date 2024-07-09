const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Load your credentials from a JSON file
const CREDENTIALS_PATH = 'credentials.json'; // Path to your credentials file
const TOKEN_PATH = 'token.json'; // Path to your token file
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

let drive;

// Authorize the client
fs.readFile(CREDENTIALS_PATH, (err, content) => {
    if (err) return console.error('Error loading client secret file:', err);
    authorize(JSON.parse(content), () => {
        console.log('Google Drive API authorized');
    });
});

function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        drive = google.drive({ version: 'v3', auth: oAuth2Client });
        callback();
    });
}

function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    // The user will need to manually get the token and save it to TOKEN_PATH
}

app.post('/upload', upload.array('files'), (req, res) => {
    const folderId = 'YOUR_FOLDER_ID'; // Replace with your folder ID
    const files = req.files;

    files.forEach((file) => {
        const filePath = path.join(__dirname, file.path);
        const fileMetadata = {
            name: file.originalname,
            parents: [folderId],
        };
        const media = {
            mimeType: file.mimetype,
            body: fs.createReadStream(filePath),
        };

        drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        }, (err, file) => {
            fs.unlinkSync(filePath); // Delete the file from the server after upload
            if (err) {
                console.error(err);
                res.status(500).send('Error uploading file');
            } else {
                console.log('File Id:', file.data.id);
            }
        });
    });

    res.send('Files uploaded successfully');
});

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
