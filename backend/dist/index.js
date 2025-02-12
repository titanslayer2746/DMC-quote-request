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
const csvFilePath = path_1.default.join(__dirname, 'data', 'dmcdb.csv');
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
        const { country, regions, message } = req.body;
        if (!regions || !Array.isArray(regions) || regions.length === 0 || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const allDmcData = yield (0, csvService_1.readCsvFile)(csvFilePath);
        if (!allDmcData || allDmcData.length === 0) {
            return res.status(404).json({ error: 'No DMC data available' });
        }
        // Filter DMCs based on selected regions (ignoring country)
        const filteredDmcData = allDmcData.filter((dmc) => dmc.destinations &&
            Array.isArray(dmc.destinations) &&
            dmc.destinations.some((region) => regions.includes(region)));
        if (filteredDmcData.length === 0) {
            return res.status(404).json({ error: 'No DMC data found for the selected regions' });
        }
        // Store unique emails to avoid duplicates
        const uniqueEmails = new Map(); // Map<email, name>
        filteredDmcData.forEach((dmc) => {
            if (dmc.email) {
                uniqueEmails.set(dmc.email, dmc.name);
            }
        });
        let successCount = 0;
        let failedCount = 0;
        const results = [];
        // Send emails only once per unique email
        yield Promise.all(Array.from(uniqueEmails.entries()).map((_a) => __awaiter(void 0, [_a], void 0, function* ([email, name]) {
            try {
                yield transporter.sendMail({
                    from: 'Team Fursat ❤ <dmc@fursat.ai>',
                    to: email,
                    subject: `Inquiry from Fursat.ai`,
                    text: emailTemplate_1.EmailTemplate.generateQuoteRequest(name, message, country),
                });
                successCount++;
                results.push({ email, status: 'success' });
            }
            catch (error) {
                failedCount++;
                results.push({ email, status: 'failed', error: error.message });
            }
        })));
        res.status(200).json({ successCount, failedCount, results });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.get('/api/regions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { country } = req.query;
        if (!country || typeof country !== 'string') {
            return res.status(400).json({ error: 'Country parameter is required' });
        }
        console.log(`Fetching destinations for country: ${country}`);
        const dmcData = yield (0, csvService_1.readCsvFile)(csvFilePath);
        // Filter records by country
        const filteredData = dmcData.filter((d) => { var _a; return ((_a = d.country) === null || _a === void 0 ? void 0 : _a.toLowerCase().trim()) === country.toLowerCase().trim(); });
        if (filteredData.length === 0) {
            return res.status(404).json({ error: 'No data found for the given country' });
        }
        const destinations = filteredData
            .flatMap((d) => Array.isArray(d.destinations) ? d.destinations : []) // Ensure it's an array
            .map(dest => dest.trim()) // Trim each value
            .filter(dest => dest.length > 0); // Remove empty values
        // Remove duplicates and sort
        const uniqueDestinations = Array.from(new Set(destinations)).sort();
        if (uniqueDestinations.length === 0) {
            return res.status(404).json({ error: 'No destinations found for the given country' });
        }
        res.json(uniqueDestinations);
    }
    catch (error) {
        console.error('Error fetching destinations:', error);
        res.status(500).json({ error: 'Failed to load destinations' });
    }
}));
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
