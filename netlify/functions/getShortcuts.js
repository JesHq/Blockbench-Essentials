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
    // GET request - just return shortcuts (no auth needed for reading)
    if (event.httpMethod === 'GET') {
      const rawData = fs.readFileSync(SHORTCUTS_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      
      let shortcuts = [];
      if (Array.isArray(parsedData)) {
        shortcuts = parsedData;
      } else if (parsedData.shortcuts && Array.isArray(parsedData.shortcuts)) {
        shortcuts = parsedData.shortcuts;
      }

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

      // For add/delete, verify admin code first
      if (adminCode !== process.env.ADMIN_CODE) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid admin code' })
        };
      }

      // Read shortcuts for modification
      const rawData = fs.readFileSync(SHORTCUTS_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      let shortcuts = [];
      if (Array.isArray(parsedData)) {
        shortcuts = parsedData;
      } else if (parsedData.shortcuts && Array.isArray(parsedData.shortcuts)) {
        shortcuts = parsedData.shortcuts;
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
      body: JSON.stringify({ error: error.message })
    };
  }
};
