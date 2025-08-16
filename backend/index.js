const express = require('express');
const fs = require('fs');
const path = require('path'); 
const cors = require('cors');
const { exec } = require('child_process');
require('dotenv').config();

// --- Import ALL our data source services ---
const { parseQueryForApi } = require('./services/aiService');
const { searchCkan } = require('./services/ckanService');
const { searchHuggingFace } = require('./services/huggingFaceService');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post('/api/search', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const { source, keywords } = await parseQueryForApi(query);
    console.log(`AI determined: Source -> ${source}, Keywords -> '${keywords}'`);

    if (!source || !keywords) {
      throw new Error("The AI failed to determine a valid data source or keywords from your query. Please try rephrasing.");
    }

    let results = [];
    const lowerCaseSource = source.toLowerCase();

    // --- UPDATED: New routing logic ---
    if (lowerCaseSource === 'kaggle') {
      results = await new Promise((resolve, reject) => {
        const command = `kaggle datasets list -s "${keywords}"`; 
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`Kaggle CLI Error: ${stderr}`);
            return reject(new Error('Failed to fetch from Kaggle.'));
          }
          try {
            const lines = stdout.trim().split('\n');
            if (lines.length < 3) return resolve([]);
            
            const headers = lines[0].split(/\s{2,}/).map(h => h.trim());
            const dataRows = lines.slice(2);

            const parsedJson = dataRows.map(row => {
              const values = row.split(/\s{2,}/).map(v => v.trim());
              let rowObject = {};
              headers.forEach((header, index) => {
                const key = (header === 'ref') ? 'ref' : header;
                rowObject[key] = values[index];
              });
              return rowObject;
            });
            resolve(parsedJson);
          } catch (parseError) {
            console.error("Failed to parse Kaggle's text output.", parseError);
            reject(new Error('Failed to parse Kaggle API text response.'));
          }
        });
      });
    } else if (lowerCaseSource === 'huggingface') {
        // --- NEW: Handle Hugging Face source ---
        results = await searchHuggingFace(keywords);
    }
    else { // Default to CKAN
      results = await searchCkan(keywords);
    }
    
    const normalizedResults = results.map(item => normalizeData(item, lowerCaseSource));
    res.json({ source, results: normalizedResults });

  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/details', async (req, res) => {
  const { id, source } = req.body;
  if (!id || !source) {
    return res.status(400).json({ error: 'Dataset ID and source are required' });
  }

  console.log(`Fetching details for ${id} from ${source}...`);

  try {
    let details = {};
    const lowerCaseSource = source.toLowerCase();

    if (lowerCaseSource === 'kaggle') {
      const tempDir = path.join('/tmp', id.replace('/', '_'));
      
      details = await new Promise((resolve, reject) => {
        const command = `kaggle datasets metadata "${id}" -p "${tempDir}"`;
        
        exec(command, (error, stdout, stderr) => {
          if (error) {
            return reject(new Error(`Kaggle metadata fetch failed: ${stderr}`));
          }
          
          const filePath = path.join(tempDir, 'datapackage.json');

          // --- THIS IS THE NEW, ROBUST LOGIC ---
          // First, check if the file even exists.
          if (fs.existsSync(filePath)) {
            // If it exists, read it.
            fs.readFile(filePath, 'utf8', (err, data) => {
              // Clean up the directory in the background
              fs.rm(tempDir, { recursive: true, force: true }, () => {});
              
              if (err) {
                return reject(new Error(`Failed to read metadata file: ${err.message}`));
              }
              resolve(JSON.parse(data));
            });
          } else {
            // If the file does NOT exist, resolve with a specific message.
            // This is a successful outcome, not an error.
            fs.rm(tempDir, { recursive: true, force: true }, () => {});
            resolve({ 
              name: id,
              resources: [], // Send an empty array for resources
              message: "This Kaggle dataset does not have a detailed datapackage.json metadata file." 
            });
          }
          // --- END OF NEW LOGIC ---
        });
      });
    } else if (lowerCaseSource === 'data.gov (ckan)') {
      // (This part remains the same)
      const ckanDetails = await searchCkan(null, id);
      details = ckanDetails;
    } else {
      details = { message: "Detailed view is not yet available for this source." };
    }

    res.json(details);

  } catch (error) {
    console.error('Error in details endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});



// --- UPDATED: New normalizeData function ---
const normalizeData = (item, source) => {
  if (source === 'kaggle') {
    return {
      id: item.ref,
      title: item.title,
      source: 'Kaggle',
      author: item.ownerName || 'N/A', 
      url: `https://www.kaggle.com/datasets/${item.ref}`,
      lastUpdated: 'N/A',
      tags: [],
    };
  }
  
  if (source === 'huggingface') {
    // --- NEW: Handle Hugging Face data structure ---
    return {
      id: item.id,
      title: item.id, // HF API doesn't provide a clean "title", so we use the ID
      source: 'Hugging Face',
      author: item.author || 'N/A',
      url: `https://huggingface.co/datasets/${item.id}`,
      lastUpdated: item.lastModified.split('T')[0],
      tags: item.tags || [],
    };
  }

  // Default is CKAN
  return {
    id: item.id,
    title: item.title,
    source: 'data.gov (CKAN)',
    author: item.organization?.title || 'N/A',
    url: `https://catalog.data.gov/dataset/${item.name}`,
    lastUpdated: item.metadata_modified.split('T')[0],
    tags: item.tags.map(tag => tag.display_name),
  };
};

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});