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

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // GET request - just return shortcuts (for the main page)
    if (event.httpMethod === 'GET') {
      const data = fs.readFileSync(SHORTCUTS_FILE, 'utf8');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ shortcuts: JSON.parse(data) })
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
            statusCode: 200, // Return 200 but success: false
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

      // ADD shortcut
      if (action === 'add') {
        const data = JSON.parse(fs.readFileSync(SHORTCUTS_FILE, 'utf8'));
        const newShortcut = {
          name: body.name,
          keys: body.keys.split('+').map(k => k.trim()),
          category: body.category,
          desc: body.desc,
          icon: 'command'
        };
        data.push(newShortcut);
        fs.writeFileSync(SHORTCUTS_FILE, JSON.stringify(data, null, 2));
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      // DELETE shortcut
      if (action === 'delete') {
        const data = JSON.parse(fs.readFileSync(SHORTCUTS_FILE, 'utf8'));
        const filtered = data.filter(s => s.name !== body.name);
        fs.writeFileSync(SHORTCUTS_FILE, JSON.stringify(filtered, null, 2));
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
