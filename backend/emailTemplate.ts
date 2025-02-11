export class EmailTemplate {
    static generateQuoteRequest(dmcName: string, itinerary: string, country: string): string {
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
  