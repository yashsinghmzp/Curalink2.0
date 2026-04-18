const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // NAYA
require('dotenv').config();

const { fetchClinicalTrials } = require('./services/clinicalTrials');
const { fetchPublications } = require('./services/openAlex');
const { fetchPubMed } = require('./services/pubmed'); 
const { generateSummary } = require('./services/llmServices');
const { rankAndFilterData } = require('./services/ranking'); 
const ChatHistory = require('./models/chatHistory'); // NAYA

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('📦 MongoDB Connected!'))
    .catch(err => console.log('MongoDB Error:', err));

app.use(cors());
app.use(express.json());

app.post('/api/research', async (req, res) => {
   try {
        let { sessionId, disease, location, userQuery } = req.body;
        
        if (!sessionId) sessionId = `session_${Date.now()}`;

        // 🧠 1. Smart Disease Detection
        let detectedDisease = disease || "";
        
        // 👉 YEH LINE MISSING THI! 👈
        let chatHistory = []; 

        let sessionData = await ChatHistory.findOne({ sessionId });
        
        if (sessionData) {
            // Agar user ne naya disease mention kiya hai query mein
            if (disease && disease.toLowerCase() !== sessionData.diseaseContext.toLowerCase()) {
                sessionData.diseaseContext = disease;
                await sessionData.save();
                detectedDisease = disease;
            } else {
                detectedDisease = sessionData.diseaseContext;
            }
            chatHistory = sessionData.messages || [];
        } else {
            // Pehli baar save kar rahe hain
            if (!detectedDisease) return res.status(400).json({ error: "What disease are we researching?" });
            await ChatHistory.create({ sessionId, diseaseContext: detectedDisease, messages: [] });
            // Naye patient ke liye history empty rahegi jo humne upar define kar di hai
        }
        

       console.log(`\n--- 🚀 RESEARCHING: ${detectedDisease} ---`);

        // 🔍 2. Keyword Cleaning (APIs ke liye sirf bimari ka naam bhejo)
        // Maine isme 'past', 'years', 'months' bhi add kar diya hai!
        const stopWords = /\b(hi|hello|hey|i|am|have|has|had|what|do|is|a|an|the|my|problem|problems|related|to|from|in|india|issues|with|help|me|how|can|treat|cure|treatment|for|past|years|months|days|since)\b/gi;
        
        // Pehle stop words hatao, phir extra spaces (numbers hatane ke liye hum regex nahi laga rahe taaki Type 2 diabetes jaisi query kharab na ho)
        let searchKeyword = detectedDisease.replace(stopWords, "").replace(/\s+/g, " ").trim();
        
        // Failsafe: Agar cleaning ke baad keyword khali ho gaya, toh context se uthao
        if (!searchKeyword || searchKeyword.length < 2) {
            searchKeyword = sessionData ? sessionData.diseaseContext : detectedDisease;
        }

        let expandedSearchQuery = searchKeyword;
        if (detectedDisease && !searchKeyword.toLowerCase().includes(detectedDisease.toLowerCase())) {
            expandedSearchQuery = `${searchKeyword} ${detectedDisease}`;
        }
        console.log(`--- 🚀 EXPANDED QUERY: "${expandedSearchQuery}" ---`);

        // 3. Fetch with CLEAN keyword
        const [clinicalTrials, openAlexPubs, pubMedPubs] = await Promise.all([
            fetchClinicalTrials(expandedSearchQuery, location),
            fetchPublications(expandedSearchQuery),
            fetchPubMed(expandedSearchQuery)
        ]);

        const { topTrials, topPublications } = rankAndFilterData(clinicalTrials, openAlexPubs, pubMedPubs);

        // 4. Summarize
        const aiSummary = await generateSummary(detectedDisease, userQuery, topTrials, topPublications, chatHistory);

        // 5. Update DB History
        await ChatHistory.findOneAndUpdate(
            { sessionId },
            { $push: { messages: { $each: [{ role: 'user', content: userQuery }, { role: 'assistant', content: aiSummary }] } } }
        );

        res.json({
            status: "success",
            sessionId,
            disease: detectedDisease,
            results: { aiSummary, clinicalTrials: topTrials, publications: topPublications }
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
});


// --- NAYE ROUTES FOR CHAT HISTORY ---

// 1. Saari purani chats ki list laane ke liye (Sidebar ke liye)
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await ChatHistory.find({}, 'sessionId diseaseContext')
            .sort({ _id: -1 }) // Latest pehle
            .limit(20);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});

// 3. Chat history ko delete karne ke liye
app.delete('/api/sessions/:sessionId', async (req, res) => {
    try {
        const deletedSession = await ChatHistory.findOneAndDelete({ sessionId: req.params.sessionId });
        if (!deletedSession) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json({ message: "Chat deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete session" });
    }
});




// 2. Kisi specific purani chat ka poora data laane ke liye
app.get('/api/sessions/:sessionId', async (req, res) => {
    try {
        const session = await ChatHistory.findOne({ sessionId: req.params.sessionId });
        if (!session) return res.status(404).json({ error: "Session not found" });
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch session details" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});