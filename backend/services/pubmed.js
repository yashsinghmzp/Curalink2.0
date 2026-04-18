const axios = require('axios');
const xml2js = require('xml2js');

async function fetchPubMed(disease) {
    try {
        console.log(`Fetching PubMed IDs for: ${disease}...`);
        
        // Step 1: Get top 20 Article IDs (Deep fetching)
        const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(disease)}+AND+clinical+trial&retmax=20&sort=pub+date&retmode=json`;
        const searchRes = await axios.get(searchUrl);
        const idList = searchRes.data.esearchresult.idlist;

        if (!idList || idList.length === 0) return [];

        console.log(`Found ${idList.length} PubMed IDs. Fetching details...`);

        // Step 2: Fetch details for those IDs using XML
        const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${idList.join(',')}&retmode=xml`;
        const fetchRes = await axios.get(fetchUrl);
        
        // XML to JSON conversion
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(fetchRes.data);
        
        // Extracting data safely
        const articles = result.PubmedArticleSet.PubmedArticle;
        const formattedArticles = (Array.isArray(articles) ? articles : [articles]).map(article => {
            const articleData = article.MedlineCitation.Article;
            return {
                id: article.MedlineCitation.PMID._ || article.MedlineCitation.PMID,
                title: articleData.ArticleTitle,
                year: articleData.Journal?.JournalIssue?.PubDate?.Year || "Recent",
                source: "PubMed",
                url: `https://pubmed.ncbi.nlm.nih.gov/${article.MedlineCitation.PMID._ || article.MedlineCitation.PMID}/`
            };
        });

        console.log(`✅ Formatted ${formattedArticles.length} PubMed articles.`);
        return formattedArticles;

    } catch (error) {
        console.error("❌ Error fetching PubMed:", error.message);
        return [];
    }
}

module.exports = { fetchPubMed };