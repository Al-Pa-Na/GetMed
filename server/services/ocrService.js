const fs = require('fs').promises;
const axios = require('axios');
const { log } = require('console');
const Tesseract = require('tesseract.js');

const GEMINI_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second, exponential backoff

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate confidence from Gemini response
 * Uses multiple heuristics: content length, punctuation presence, medical terms
 */
const calculateGeminiConfidence = (text) => {
  if (!text || text.length === 0) return 0;

  let confidence = 0.5; // base confidence

  // Reward text length (more text = likely better OCR)
  const lengthScore = Math.min(text.length / 1000, 0.3);
  confidence += lengthScore;

  // Reward presence of medical/prescription terms
  const medicalTerms = /\b(mg|ml|dose|tablet|capsule|prescription|patient|doctor|frequency|daily|hourly|every|before|after|meal|medicine|drug|symptom)\b/gi;
  const medicalMatches = text.match(medicalTerms) || [];
  const medicalScore = Math.min(medicalMatches.length / 10, 0.2);
  confidence += medicalScore;

  // Reward proper sentence structure (periods, commas)
  const punctuation = (text.match(/[.,!?]/g) || []).length;
  const punctuationScore = Math.min(punctuation / 5, 0.15);
  confidence += punctuationScore;

  // Penalty for excessive special characters
  const specialChars = (text.match(/[^a-zA-Z0-9\s.,!?-]/g) || []).length;
  const specialCharPenalty = Math.min(specialChars / 50, 0.15);
  confidence -= specialCharPenalty;

  return Math.max(0, Math.min(confidence, 1));
};

/**
 * Call Gemini Vision API with retry logic and timeout
 */
const callGeminiAPI = async (base64Image, mediaType, retryCount = 0) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("ApiKey", apiKey);

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT);

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: 'Extract all text from this prescription image. Focus on: medicine names, dosages, frequency, duration, and patient instructions. Provide only the extracted text without any additional commentary.'
                },
                {
                  inlineData: {
                    mimeType: mediaType,
                    data: base64Image
                  }
                }
              ]
            }
          ]
        },
        {
          timeout: GEMINI_TIMEOUT,
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      // Extract text from response
      const extractedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!extractedText) {
        throw new Error('No text extracted from image');
      }

      // Calculate confidence using advanced heuristics
      const confidence = calculateGeminiConfidence(extractedText);

      console.log(`[OCR] Gemini extraction successful | confidence: ${confidence.toFixed(2)} | text_length: ${extractedText.length}`);
      console.log("Gemini response", extractedText);

      return {
        text: extractedText,
        confidence: parseFloat(confidence.toFixed(2)),
        provider: 'gemini'
      };
    } catch (error) {
      console.log("there was this error during ocr :", error);

      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    // Retry logic with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      console.warn(`[OCR] Gemini API error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms: ${error.message}`);
      await sleep(delay);
      return callGeminiAPI(base64Image, mediaType, retryCount + 1);
    }

    // All retries exhausted
    console.error(`[OCR] Gemini API failed after ${MAX_RETRIES} retries: ${error.message}`);
    throw error;
  }
};

/**
 * Fallback OCR using Tesseract
 */
const callTesseractOCR = async (imagePath) => {
  try {
    console.log('[OCR] Falling back to Tesseract OCR');
    const { data: { text, confidence } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: () => { } // silent logger
    });

    const tesseractConfidence = Math.min(confidence / 100, 1); // normalize to 0-1
    console.log(`[OCR] Tesseract extraction successful | confidence: ${tesseractConfidence.toFixed(2)} | text_length: ${text.length}`);

    return {
      text: text || '',
      confidence: parseFloat(tesseractConfidence.toFixed(2)),
      provider: 'tesseract'
    };
  } catch (error) {
    console.error(`[OCR] Tesseract fallback failed: ${error.message}`);
    throw new Error(`Tesseract OCR failed: ${error.message}`);
  }
};

/**
 * Main OCR function with Gemini primary + Tesseract fallback
 */
const extractTextFromImage = async (imagePath) => {
  console.log('Extracting text from image');
  try {
    // Read image file
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Determine media type from file extension
    const extension = imagePath.toLowerCase().split('.').pop();
    const mediaTypeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    console.log(mediaTypeMap[extension]);
    const mediaType = mediaTypeMap[extension] || 'image/jpeg';
    console.log(mediaType);

    // Try Gemini first
    try {
      console.log('Gemini OCR');
      return await callGeminiAPI(base64Image, mediaType);
    } catch (geminiError) {
      console.warn(`[OCR] Gemini primary provider failed, attempting fallback`);

      // Fallback to Tesseract
      try {
        return await callTesseractOCR(imagePath);
      } catch (tesseractError) {
        // Both providers failed
        throw new Error(
          `OCR extraction failed with both providers. Gemini: ${geminiError.message}, Tesseract: ${tesseractError.message}`
        );
      }
    }
  } catch (error) {
    console.error(`[OCR] Fatal error in extractTextFromImage: ${error.message}`);
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
};

module.exports = { extractTextFromImage };

