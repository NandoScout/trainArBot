import * as cron from 'node-cron';
import { getAllPassages, sendServicesInfo, setSessionId } from './utils';

// Function to check the website and send a message if content is found
const checkWebsiteAndSendMessage = async () => {
  try {
    const freeFound = await getAllPassages();

    if (freeFound?.disponibilidad) {
      sendServicesInfo(freeFound);
    }
  } catch (error) {
    console.error('Error checking website:', error);
  }
};

// Set default token
const DEFAULT_TOKEN = process.env.DEFAULT_TOKEN;
setSessionId(DEFAULT_TOKEN)

// Schedule the check to run every X seconds (e.g., every 60 seconds)
cron.schedule('*/20 * * * * *', () => {
  checkWebsiteAndSendMessage();
});

console.log('Monitoring website for available passages...');