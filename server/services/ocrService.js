const Tesseract = require('tesseract.js');
const fs = require('fs').promises;

const extractTextFromImage = async (imagePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log(m)
    });
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
};

module.exports = { extractTextFromImage };

