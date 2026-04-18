// A simple ranking algorithm to filter the BEST papers and trials
function rankAndFilterData(clinicalTrials, openAlexPubs, pubMedPubs) {
    console.log("Applying Ranking Algorithm to reduce payload...");

    // 1. Combine both publication sources
    let allPublications = [...openAlexPubs, ...pubMedPubs];

    // 2. Sort Publications (Try to push newest/2024-2026 to the top)
    allPublications.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA; // Descending order
    });

    // 3. Keep only the absolute TOP 5 Publications (Saves LLM tokens and prevents hallucination)
    const topPublications = allPublications.slice(0, 5);

    // 4. Keep only the TOP 3 Clinical Trials (Preferably "RECRUITING")
    const topTrials = clinicalTrials
        .filter(trial => trial.status.toUpperCase() === "RECRUITING")
        .slice(0, 3);

    console.log(`✅ Ranked and Selected: ${topPublications.length} Pubs & ${topTrials.length} Trials for LLM.`);
    
    return { topTrials, topPublications };
}

module.exports = { rankAndFilterData };