require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Set up multer for file upload
const upload = multer({ storage: multer.memoryStorage() });

// Google Drive API setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

async function uploadToDrive(file, accessToken) {
    try {
      oauth2Client.setCredentials({ access_token: accessToken });
  
      const drive = google.drive({ version: "v3", auth: oauth2Client });
  
      const stream = require("stream");
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);
  
      const response = await drive.files.create({
        requestBody: {
          name: file.originalname,
          mimeType: file.mimetype,
        },
        media: {
          mimeType: file.mimetype,
          body: bufferStream, // ✅ Fix: Use a stream instead of a Buffer
        },
      });
  
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error("Google Drive upload failed: " + error.message);
    }
  }
  

// API route to upload file
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { accessToken } = req.body;
    console.log(accessToken, "555555555555");
    if (!accessToken) {
      return res.status(401).json({ error: "Access token required" });
    }

    const result = await uploadToDrive(req.file, accessToken);
    res.json({ success: true, fileId: result.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/files", async (req, res) => {
  try {
    const { accessToken } = req.query; // Get access token from request

    if (!accessToken) {
      return res.status(401).json({ error: "Access token required" });
    }

    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Fetch list of files
    const response = await drive.files.list({
      fields: "files(id, name, mimeType, webViewLink, webContentLink)",
    });

    // Format the file data
    const files = response.data.files.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      viewLink: file.webViewLink, // Link to view the file
      downloadLink: `https://drive.google.com/uc?id=${file.id}&export=download`, // Direct download link
    }));

    res.json({ success: true, files });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Error retrieving files" });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
