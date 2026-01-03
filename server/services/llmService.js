const axios = require('axios');

// Mock LLM service - in production, replace with actual OpenAI API call
const extractPrescriptionData = async (text) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock extraction - in production, use OpenAI API
  const medicines = [
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

  // If OpenAI API key is provided, use it
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a medical prescription parser. Extract medicine names, dosages, frequencies, and durations from prescription text. Return JSON format with array of medicines.'
            },
            {
              role: 'user',
              content: `Extract prescription data from this text:\n\n${text}\n\nReturn JSON with structure: {medicines: [{name, dosage, frequency, duration}]}`
            }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);
      return parsed.medicines || medicines;
    } catch (error) {
      console.error('OpenAI API Error:', error.message);
      // Fall back to mock data
    }
  }

  return medicines;
};

const calculateConfidence = (medicines) => {
  if (!medicines || medicines.length === 0) return 0;
  const avgConfidence = medicines.reduce((sum, med) => sum + (med.confidence || 0.7), 0) / medicines.length;
  return avgConfidence;
};

module.exports = { extractPrescriptionData, calculateConfidence };

