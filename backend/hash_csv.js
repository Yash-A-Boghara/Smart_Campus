const fs = require('fs');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const path = require('path');

// Configuration
// Change these file names if yours are different
const INPUT_CSV = path.join(__dirname, 'user_test.csv');
const OUTPUT_CSV = path.join(__dirname, 'users_hashed.csv');
const SALT_ROUNDS = 10;

// Which column header contains the password? (Case insensitive)
const PASSWORD_COLUMN_NAMES = ['password', 'pass', 'pwd'];

async function processCSV() {
  if (!fs.existsSync(INPUT_CSV)) {
    console.error(`\n❌ ERROR: Cannot find input file: ${INPUT_CSV}`);
    console.error(`   Please place your CSV file in the same folder as this script and name it 'users.csv'.\n`);
    process.exit(1);
  }

  console.log(`\n⏳ Processing ${INPUT_CSV} ...`);
  console.log(`   This may take a minute for large files because bcrypt hashing is intentionally slow.\n`);

  const fileStream = fs.createReadStream(INPUT_CSV);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const writeStream = fs.createWriteStream(OUTPUT_CSV);

  let isFirstLine = true;
  let headers = [];
  let passwordColumnIndex = -1;
  let processedCount = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      // Parse headers
      headers = line.split(',');
      isFirstLine = false;

      // Find which column is the password column
      passwordColumnIndex = headers.findIndex(h => {
        // Handle potential quotes in CSV headers (e.g., "password")
        const cleanHeader = h.replace(/"/g, '').trim().toLowerCase();
        return PASSWORD_COLUMN_NAMES.includes(cleanHeader);
      });

      if (passwordColumnIndex === -1) {
        console.error(`❌ ERROR: Could not find a password column in the CSV.`);
        console.error(`   Found headers: ${headers.join(', ')}`);
        console.error(`   Expected one of: ${PASSWORD_COLUMN_NAMES.join(', ')}\n`);
        fs.unlinkSync(OUTPUT_CSV); // Clean up empty file
        process.exit(1);
      }

      console.log(`✅ Found password column at index ${passwordColumnIndex} ("${headers[passwordColumnIndex]}")`);
      
      // Write headers to output
      writeStream.write(line + '\n');
      continue;
    }

    if (!line.trim()) continue; // Skip empty lines

    // Parse the CSV row
    // Note: This is a simple split. If your CSV has commas INSIDE quotes (like custom_id, "Name, Jr.", email), 
    // we would need a proper CSV parsing library like 'csv-parser'. Assuming simple data here.
    const columns = line.split(',');

    if (columns.length <= passwordColumnIndex) {
      console.warn(`⚠️ Warning: Skipping malformed row: ${line}`);
      continue;
    }

    // Get the plain text password and remove quotes if any
    let plainPassword = columns[passwordColumnIndex];
    const hasQuotes = plainPassword.startsWith('"') && plainPassword.endsWith('"');
    
    if (hasQuotes) {
      plainPassword = plainPassword.slice(1, -1);
    }

    // Hash the password
    let hashedPassword = plainPassword;
    
    // Check if it's already hashed just in case
    if (!plainPassword.startsWith('$2a$') && !plainPassword.startsWith('$2b$') && plainPassword.length > 0) {
      hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
      processedCount++;
      
      // Log progress every 10 rows
      if (processedCount % 10 === 0) {
        process.stdout.write(`   Hashed ${processedCount} passwords...\r`);
      }
    }

    // Put quotes back if they were there originally
    if (hasQuotes) {
      hashedPassword = `"${hashedPassword}"`;
    }

    // Replace the column with the hashed version
    columns[passwordColumnIndex] = hashedPassword;

    // Write the new row
    writeStream.write(columns.join(',') + '\n');
  }

  writeStream.end();

  console.log(`\n\n🎉 Done! Successfully hashed ${processedCount} passwords.`);
  console.log(`✅ Output saved to: ${OUTPUT_CSV}`);
  console.log(`\n➡️  You can now upload '${path.basename(OUTPUT_CSV)}' to Supabase.\n`);
}

processCSV().catch(err => {
  console.error("\n❌ An unexpected error occurred:", err);
});
