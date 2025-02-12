import * as fs from 'fs';
import csv from 'csv-parser';


export interface IDmc {
  name: string;
  country: string;
  destinations: string[];
  email: string;
  phone: string;
  website: string;
  lastContacted: Date;
  status: 'Pending' | 'Responded' | 'Failed';
}

export function readCsvFile(filePath: string): Promise<IDmc[]> {
  return new Promise((resolve, reject) => {
    const results: IDmc[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => {
        results.push({
          name: data.name || '',
          country: data.country || '',
          destinations: data.region?.split(',').map((s: any) => s.trim()) || [],
          email: data.email || '',
          phone: data.phone || '',
          website: data.website || '',
          lastContacted: data.lastContacted ? new Date(data.lastContacted) : new Date(0),
          status: ['Responded', 'Failed'].includes(data.status) ? data.status : 'Pending',
        });
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}