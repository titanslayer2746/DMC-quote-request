const { google } = require('googleapis');

/**
 * @typedef {Object} DMCData
 * @property {string} country
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 */

/**
 * Google Sheets Service to fetch DMC data
 */
class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.init();
  }

  init() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY
          ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : undefined,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /**
   * Fetches DMC data from Google Sheets.
   * @returns {Promise<DMCData[]>} Parsed DMC data.
   */
  async getDMCData() {
    if (!this.sheets) {
      throw new Error('Google Sheets not initialized');
    }

    try {
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
      if (!spreadsheetId) {
        throw new Error('Missing GOOGLE_SHEETS_ID environment variable');
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'DMCs!A2:D', // Updated range (removing continent)
      });

      const rows = response.data.values || [];
      return rows.map((row) => ({
        country: row[0] || '',
        name: row[1] || '',
        email: row[2] || '',
        phone: row[3] || '',
      }));
    } catch (error) {
      console.error('Error fetching DMC data:', error);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();
