const axios = require('axios');

// Function to fetch Clinical Trials
async function fetchClinicalTrials(disease, location) {
    try {
        console.log(`Fetching Clinical Trials for: ${disease}...`);
        
        // Base API URL from your hackathon doc (Focusing on RECRUITING trials)
        // Note: Location filter is sometimes tricky in this API, so we fetch by disease first
        const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(disease)}&filter.overallStatus=RECRUITING&pageSize=10&format=json`;

        const response = await axios.get(url);
        
        // Extracting only the useful data we need for the UI (Cards)
        const trialsData = response.data.studies || [];
        
        const formattedTrials = trialsData.map(trial => {
            const protocol = trial.protocolSection;
            return {
                id: protocol.identificationModule?.nctId || "Unknown",
                title: protocol.identificationModule?.briefTitle || "No Title",
                status: protocol.statusModule?.overallStatus || "Unknown",
                phase: protocol.designModule?.phases?.join(", ") || "Phase Not Specified",
                summary: protocol.descriptionModule?.briefSummary || "No summary available.",
                url: `https://clinicaltrials.gov/study/${protocol.identificationModule?.nctId}`
            };
        });

        console.log(`✅ Found ${formattedTrials.length} active trials.`);
        return formattedTrials;

    } catch (error) {
        console.error("❌ Error fetching Clinical Trials:", error.message);
        return []; // Agar API fail ho jaye, toh khali array return karo taaki app crash na ho
    }
}

module.exports = { fetchClinicalTrials };