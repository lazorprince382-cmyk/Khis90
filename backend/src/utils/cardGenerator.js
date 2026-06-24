const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

async function generateCardId() {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(10000 + Math.random() * 90000);
  return `KIS${year}${random}`;
}

async function generateQRCode(cardId, learnerId, learner = {}) {
  const data = JSON.stringify({
    learnerId,
    school: 'KIS',
  });
  return QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });
}

function generateBarcode(cardId) {
  return cardId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

module.exports = { generateCardId, generateQRCode, generateBarcode, uuidv4 };
