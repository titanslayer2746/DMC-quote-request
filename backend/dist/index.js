"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const csvService_1 = require("./services/csvService");
const nodemailer_1 = __importDefault(require("nodemailer"));
const emailTemplate_1 = require("./emailTemplate");
dotenv_1.default.config({ path: './.env' });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const csvFilePath = path_1.default.join(__dirname, 'data', 'dmc_data.csv');
const transporter = nodemailer_1.default.createTransport({
    host: 'smtp.resend.com',
    secure: true,
    port: 465,
    auth: {
        user: 'resend', // Store credentials in .env
        pass: process.env.RESEND_PASS,
    },
});
// GET /api/countries – Return unique countries from the CSV file.
app.get('/api/countries', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dmcData = yield (0, csvService_1.readCsvFile)(csvFilePath);
        const countries = Array.from(new Set(dmcData.map((d) => d.country))).sort();
        res.json(countries);
    }
    catch (error) {
        console.error('Error in :', error);
        res.status(500).json({ error: 'Failed to load countries' });
    }
}));
app.post('/api/send-mails', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { country, message } = req.body;
        if (!country || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const allDmcData = yield (0, csvService_1.readCsvFile)(csvFilePath);
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
        const results = [];
        // Send email to each DMC
        yield Promise.all(docData.map((dmc) => __awaiter(void 0, void 0, void 0, function* () {
            if (!dmc.email) {
                failedCount++;
                results.push({ email: 'No email provided', status: 'failed', error: 'Missing email' });
                return;
            }
            const itinerary = message;
            try {
                yield transporter.sendMail({
                    from: 'Team Fursat ❤ <dmc@fursat.ai>',
                    to: dmc.email,
                    subject: `Inquiry from Fursat.ai`,
                    text: emailTemplate_1.EmailTemplate.generateQuoteRequest(dmc.name, itinerary, country),
                });
                successCount++;
                results.push({ email: dmc.email, status: 'success' });
            }
            catch (error) {
                failedCount++;
                results.push({ email: dmc.email, status: 'failed', error: error.message });
            }
        })));
        res.status(200).json({ successCount, failedCount, results });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
