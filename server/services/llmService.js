const axios = require('axios');

// Mock LLM service - in production, replace with actual OpenAI API call
const extractPrescriptionData = async (text) => {
  // Simulate API delay for better UX
  await new Promise(resolve => setTimeout(resolve, 500));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, falling back to mock data');
    // Mock data fallback
    return [
      {
        name: 'Paracetamol 500mg',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '5 days',
        confidence: 0.85
      },
      {
        name: 'Amoxicillin 250mg',
        dosage: '250mg',
        frequency: 'Three times daily',
        duration: '7 days',
        confidence: 0.78
      }
    ];
  }

  try {
    const prompt = `
      You are a medical prescription parser. Extract medicine names, dosages, frequencies, and durations from the following prescription text. 
      
      Prescription Text:
      """
      ${text}
      """
      
      Return ONLY a JSON object with a "medicines" key containing an array of objects.
      Each object should have:
      - name: string (medicine name)
      - dosage: string (strength/concentration)
      - frequency: string (how often to take)
      - duration: string (how long to take)
      - confidence: number (0.0 to 1.0)
      
      Do not include markdown formatting (like \`\`\`json). Just the raw JSON.
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    // Clean up markdown if present
    const jsonStr = content.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    console.log("Gemini response", parsed);

    return parsed.medicines || [];

  } catch (error) {
    console.error('Gemini LLM Error:', error.response?.data || error.message);
    // Return empty array or mock data on failure? 
    // Keeping safe fallback to empty array to indicate failure to parse rather than showing fake data
    return [];
  }
};

const calculateConfidence = (medicines) => {
  if (!medicines || medicines.length === 0) return 0;
  const avgConfidence = medicines.reduce((sum, med) => sum + (med.confidence || 0.7), 0) / medicines.length;
  return avgConfidence;
};

module.exports = { extractPrescriptionData, calculateConfidence };

