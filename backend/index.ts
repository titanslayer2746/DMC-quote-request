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

const csvFilePath = path.join(__dirname, 'data', 'dmcdb.csv');
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


app.post('/api/send-mails', async (req: Request, res: Response): Promise<any> => {
  try {
    const { country, regions, message } = req.body;

    if (!regions || !Array.isArray(regions) || regions.length === 0 || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const allDmcData = await readCsvFile(csvFilePath);
    if (!allDmcData || allDmcData.length === 0) {
      return res.status(404).json({ error: 'No DMC data available' });
    }

    // Filter DMCs based on selected regions (ignoring country)
    const filteredDmcData = allDmcData.filter(
      (dmc) =>
        dmc.destinations &&
        Array.isArray(dmc.destinations) &&
        dmc.destinations.some((region: string) => regions.includes(region))
    );

    if (filteredDmcData.length === 0) {
      return res.status(404).json({ error: 'No DMC data found for the selected regions' });
    }

    // Store unique emails to avoid duplicates
    const uniqueEmails = new Map<string, string>(); // Map<email, name>
    filteredDmcData.forEach((dmc) => {
      if (dmc.email) {
        uniqueEmails.set(dmc.email, dmc.name);
      }
    });

    let successCount = 0;
    let failedCount = 0;
    const results: { email: string; status: string; error?: string }[] = [];

    // Send emails only once per unique email
    await Promise.all(
      Array.from(uniqueEmails.entries()).map(async ([email, name]) => {
        try {
          await transporter.sendMail({
            from: 'Team Fursat ❤ <dmc@fursat.ai>',
            to: email,
            subject: `Inquiry from Fursat.ai`,
            text: EmailTemplate.generateQuoteRequest(name, message,country ),
          });

          successCount++;
          results.push({ email, status: 'success' });
        } catch (error) {
          failedCount++;
          results.push({ email, status: 'failed', error: (error as Error).message });
        }
      })
    );

    res.status(200).json({ successCount, failedCount, results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/regions', async (req: Request, res: Response): Promise<any> => {
  try {
    const { country } = req.query;
    if (!country || typeof country !== 'string') {
      return res.status(400).json({ error: 'Country parameter is required' });
    }

    console.log(`Fetching destinations for country: ${country}`);

    const dmcData = await readCsvFile(csvFilePath);

    // Filter records by country
    const filteredData = dmcData.filter((d: any) => d.country?.toLowerCase().trim() === country.toLowerCase().trim());

    if (filteredData.length === 0) {
      return res.status(404).json({ error: 'No data found for the given country' });
    }

    const destinations: string[] = filteredData
  .flatMap((d: any) => Array.isArray(d.destinations) ? d.destinations : []) // Ensure it's an array
  .map(dest => dest.trim()) // Trim each value
  .filter(dest => dest.length > 0); // Remove empty values

    // Remove duplicates and sort
    const uniqueDestinations = Array.from(new Set(destinations)).sort();

    if (uniqueDestinations.length === 0) {
      return res.status(404).json({ error: 'No destinations found for the given country' });
    }

    res.json(uniqueDestinations);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ error: 'Failed to load destinations' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
