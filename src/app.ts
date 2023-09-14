import * as cron from 'node-cron';
import { findFreeSites, formatObject, getAllPassages, sendTelegramMessage } from './utils';

// Function to check the website and send a message if content is found
const checkWebsiteAndSendMessage = async () => {
  try {
    const freeFound = await getAllPassages();

    // Check if the response HTML contains the desired content
    if (freeFound?.disponibilidad) {
        const message = `Hay ${freeFound?.disponibilidad} pasajes disponibles!`;
        console.log(message);
        sendTelegramMessage(message);
        Object.entries(freeFound.data).forEach(([k,v]:any[]) => { 
          if (k !== 'disponibilidad') {
            const key = k;
            v.forEach(v1 => {
              if (v1.disponibilidad) {
                sendTelegramMessage(`${formatObject({[key]:v1})}`); 
              }
            });
          }
        })
        // Object.entries(freeFound).forEach(s => sendTelegramMessage(`${s[0]}:\n${JSON.stringify(s[1])}`.replace(/fecha_estacion":|hora_estacion":|"/g,'').replace(/,/g,'\n')))
    }
  } catch (error) {
    console.error('Error checking website:', error);
  }
};

// Schedule the check to run every X seconds (e.g., every 60 seconds)
cron.schedule('*/20 * * * * *', () => {
  checkWebsiteAndSendMessage();
});

console.log('Monitoring website for available passages...');