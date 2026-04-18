const axios = require('axios');

async function generateSummary(disease, userQuery, clinicalTrials, publications, chatHistory = []) {
    try {
        console.log("Brain is working: Connecting to Groq LLM with Memory...");
        
        // Safety Check: API Key
        if (!process.env.GROQ_API_KEY) {
            console.error("❌ ERROR: GROQ_API_KEY is missing in your .env file!");
            return "Server configuration error.";
        }

        // 1. Data ko chote text mein convert kar rahe hain taaki LLM easily padh sake
        const trialsText = clinicalTrials.length > 0 
            ? clinicalTrials.map(t => `- [${t.status}] ${t.title} (${t.phase})`).join('\n')
            : "No active clinical trials found.";
            
        const pubsText = publications.length > 0 
            ? publications.map(p => `- ${p.title} (${p.year}) by ${p.authors}`).join('\n')
            : "No recent publications found.";

       // 2. The Final Prompt for the Current Question
        const currentPrompt = `
            You are Curalink, an expert medical research assistant.
            The user's main disease context is: ${disease}.
            The user is currently asking: "${userQuery}"
            
            Below are the latest Clinical Trials retrieved:
            ${trialsText}
            
            Below are the latest Research Publications retrieved:
            ${pubsText}
            
            Answer the user's question comprehensively using the provided data and chat history.
            CRITICAL INSTRUCTION: Do NOT start your response with phrases like "Based on the provided data" or "Based on our previous conversation". Just start answering directly and naturally like a human expert.
            Keep the tone professional yet accessible. Do NOT hallucinate.
        `;
        // 3. Formatting past chat history for the AI
        const safeHistory = Array.isArray(chatHistory) ? chatHistory : [];
        
        const previousMessages = safeHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // 4. Assembling the complete conversation for the AI
        const apiMessages = [
            { role: "system", content: "You are Curalink, a highly intelligent, evidence-based medical research assistant." },
            ...previousMessages, // Yahan purani chat history daal di (Context Awareness)
            { role: "user", content: currentPrompt } // Yahan naya data aur naya sawal daal diya
        ];

        // 5. Calling Groq API
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.1-8b-instant",
                messages: apiMessages,
                temperature: 0.2 
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("✅ LLM Summary Generated Successfully!");
        return response.data.choices[0].message.content;

    } catch (error) {
        if (error.response) {
            console.error("❌ Groq API Error Details:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("❌ Error:", error.message);
        }
        return "Sorry, I couldn't generate a summary at this time.";
    }
}

module.exports = { generateSummary };