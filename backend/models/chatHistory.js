const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    diseaseContext: { type: String, required: true }, // Yaad rakhega ki kis bimari pe baat ho rahi hai
    messages: [
        {
            role: { type: String, enum: ['user', 'assistant'] },
            content: { type: String }
        }
    ]
});

module.exports = mongoose.model('ChatHistory', chatSchema);