const fs = require('fs');
const path = require('path');

const SHORTCUTS_FILE = path.join(__dirname, '..', '..', 'data', 'shortcuts.json');

exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Read and parse the file
    const rawData = fs.readFileSync(SHORTCUTS_FILE, 'utf8');
    const parsedData = JSON.parse(rawData);
    
    // Extract shortcuts array - handle both formats:
    // { "shortcuts": [...] } OR [...]
    let shortcuts = [];
    if (Array.isArray(parsedData)) {
      shortcuts = parsedData;
    } else if (parsedData.shortcuts && Array.isArray(parsedData.shortcuts)) {
      shortcuts = parsedData.shortcuts;
    }

    // GET request - return shortcuts
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ shortcuts: shortcuts })
      };
    }

    // POST request - handle admin actions
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action, adminCode } = body;

      // VERIFY ADMIN CODE
      if (action === 'verify') {
        if (adminCode === process.env.ADMIN_CODE) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
          };
        } else {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: false, error: 'Invalid admin code' })
          };
        }
      }

      // Verify admin code for protected actions
      if (adminCode !== process.env.ADMIN_CODE) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid admin code' })
        };
      }

      // ADD shortcut
      if (action === 'add') {
        const newShortcut = {
          name: body.name,
          keys: body.keys.split('+').map(k => k.trim()),
          category: body.category,
          desc: body.desc,
          icon: 'command'
        };
        shortcuts.push(newShortcut);
        
        // Save back in the same format: { shortcuts: [...] }
        fs.writeFileSync(SHORTCUTS_FILE, JSON.stringify({ shortcuts: shortcuts }, null, 2));
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      // DELETE shortcut
      if (action === 'delete') {
        const filtered = shortcuts.filter(s => s.name !== body.name);
        fs.writeFileSync(SHORTCUTS_FILE, JSON.stringify({ shortcuts: filtered }, null, 2));
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, error: 'Unknown action' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
  }
};
