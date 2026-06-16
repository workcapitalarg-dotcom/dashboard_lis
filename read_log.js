const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Vidya Ganesh\\.gemini\\antigravity\\brain\\a2fbbe94-a11b-4f54-888b-926b884297ae\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log('Log file does not exist at:', logPath);
  process.exit(1);
}

const fileContent = fs.readFileSync(logPath, 'utf8');
const lines = fileContent.split('\n');

let found = false;
for (const line of lines) {
  if (line.includes('b8085670a2659d33ad3ad853f701ddb0b3fbdd2c')) {
    console.log('Found line matching private key ID!');
    // Parse the JSON line to extract the user input
    try {
      const stepObj = JSON.parse(line);
      console.log('Step Type:', stepObj.type);
      
      // Look for the JSON inside the content
      const content = stepObj.content;
      console.log('--- RAW USER INPUT ---');
      console.log(content);
      
      // Save it to a temporary credentials.json file so we can read it easily
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = content.substring(jsonStart, jsonEnd);
        fs.writeFileSync(path.resolve(__dirname, 'temp_credentials.json'), jsonStr, 'utf8');
        console.log('Successfully saved JSON to temp_credentials.json!');
      }
      
      found = true;
      break;
    } catch (e) {
      console.log('Error parsing line as JSON:', e.message);
    }
  }
}

if (!found) {
  console.log('Could not find matching credentials in the log file.');
}
