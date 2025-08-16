const https = require('https'
);
/**
 * Searches for datasets on the Hugging Face Hub.
 * @param {string} keywords - The search keywords.
 * @returns {Promise<Array>} A promise that resolves to an array of dataset objects.
 */
function searchHuggingFace(keywords) {
    return new Promise((resolve, reject) => {
        // The Hugging Face API uses a 'search' parameter for keywords and 'limit' to control result count.
        const encodedKeywords = encodeURIComponent(keywords);
        const url = `https://huggingface.co/api/datasets?search=${encodedKeywords}&limit=15&full=true`;

        // The API may sometimes require a standard User-Agent header to prevent being blocked.
        const options = {
            headers: {
                'User-Agent': 'Node.js-Client/1.0'
            }
        };

        https.get(url, options, (res) => {
            // Check for non-200 status codes
            if (res.statusCode !== 200) {
                return reject(new Error(`Hugging Face API responded with status code: ${res.statusCode}`));
            }

            let rawData = '';

            // The 'data' event streams in the response body in chunks.
            res.on('data', (chunk) => {
                rawData += chunk;
            });

            // The 'end' event is fired when the entire response has been received.
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    // The datasets are directly in the root array of the response
                    if (Array.isArray(parsedData)) {
                        resolve(parsedData);
                    } else {
                        // This case handles unexpected API response formats.
                        reject(new Error('Hugging Face API did not return the expected array format.'));
                    }
                } catch (e) {
                    // This catches errors if the response body is not valid JSON.
                    console.error("Failed to parse JSON from Hugging Face API:", e);
                    reject(e);
                }
            });

        }).on('error', (err) => {
            // This catches fundamental network errors (e.g., no internet connection).
            console.error("Error making HTTPS request to Hugging Face API:", err);
            reject(err);
        });
    });
}

module.exports = {
    searchHuggingFace
};