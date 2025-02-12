"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplate = void 0;
class EmailTemplate {
    static generateQuoteRequest(dmcName, itinerary, country) {
        return `
        Dear ${dmcName},
  
        I hope this email finds you well. We are looking for a quote for a travel itinerary to ${country}. 
        
        Here are the details:
        ${itinerary}
  
        Please provide your best offer at your earliest convenience.
  
        Best regards,
        Team Fursat ❤
      `;
    }
}
exports.EmailTemplate = EmailTemplate;
