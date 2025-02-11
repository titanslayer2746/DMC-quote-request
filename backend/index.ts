import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import path from "path";
import { readCsvFile } from './services/csvService';
import nodemailer from 'nodemailer'
import { EmailTemplate } from './emailTemplate';

dotenv.config({ path: './.env' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const csvFilePath = path.join(__dirname, 'data', 'dmc_data.csv');
const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  secure: true,
  port: 465,
  auth: {
    user: 'resend',  // Store credentials in .env
    pass: process.env.RESEND_PASS,
  },
});
// GET /api/countries – Return unique countries from the CSV file.
app.get('/api/countries', async (req, res) => {
  try {
    const dmcData = await readCsvFile(csvFilePath);
    const countries = Array.from(new Set(dmcData.map((d: any) => d.country))).sort();
    res.json(countries);
  } catch (error) {
    console.error('Error in :', error);
    res.status(500).json({ error: 'Failed to load countries' });
  }
});


app.post('/api/send-mails', async (req : Request, res : Response) : Promise<any> => {
  try {

    const { country, message } = req.body;

    if (!country || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const allDmcData = await readCsvFile(csvFilePath);
    if (!allDmcData || allDmcData.length === 0) {
      return res.status(404).json({ error: 'No DMC data available' });
    }

    // Filter only those DMCs that match the provided country
    const docData = allDmcData.filter(dmc => dmc.country.toLowerCase() === country.toLowerCase());
    if (docData.length === 0) {
      return res.status(404).json({ error: 'No DMC data found for the given country' });
    }


    let successCount = 0;
    let failedCount = 0;
    const results: { email: string; status: string; error?: string }[] = [];

    // Send email to each DMC
    await Promise.all(
      docData.map(async (dmc) => {
        if (!dmc.email) {
          failedCount++;
          results.push({ email: 'No email provided', status: 'failed', error: 'Missing email' });
          return;
        }
        const itinerary = message;
        try {
          await transporter.sendMail({
            from: 'Team Fursat ❤ <dmc@fursat.ai>',
            to: dmc.email,
            subject: `Inquiry from Fursat.ai`,
            text: EmailTemplate.generateQuoteRequest(dmc.name, itinerary, country),
          });

          successCount++;
          results.push({ email: dmc.email, status: 'success' });
        } catch (error) {
          failedCount++;
          results.push({ email: dmc.email, status: 'failed', error: (error as Error).message });
        }
      })
    );

    res.status(200).json({ successCount, failedCount, results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
