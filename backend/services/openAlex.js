const axios = require('axios');

// Function to fetch Research Publications from OpenAlex
async function fetchPublications(disease) {
    try {
        console.log(`Fetching OpenAlex Publications for: ${disease}...`);
        
        // Sorting by newest and most relevant
        // URL aisi honi chahiye:
const url = `https://api.openalex.org/works?default.search="${encodeURIComponent(query)}"&sort=relevance_score:desc&per-page=10`;

        const response = await axios.get(url);
        
        const works = response.data.results || [];
        
        const formattedPublications = works.map(work => {
            const authors = work.authorships?.map(a => a.author.display_name).join(', ') || "Unknown";
            return {
                id: work.id,
                title: work.title || "No Title",
                year: work.publication_year || "Unknown",
                authors: authors,
                source: "OpenAlex",
                url: work.doi || work.id,
                // NAYA: Supporting Snippet (Requirement 8)
                snippet: work.abstract_inverted_index ? "Abstract available in source link" : "View full research in link"
            };
        });

        console.log(`✅ Found ${formattedPublications.length} publications.`);
        return formattedPublications;

    } catch (error) {
        console.error("❌ Error fetching OpenAlex Publications:", error.message);
        return []; // Fail-safe
    }
}

module.exports = { fetchPublications };