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
    const rawData = fs.readFileSync(SHORTCUTS_FILE, 'utf8');
    let shortcuts = JSON.parse(rawData);

    if (!Array.isArray(shortcuts)) {
      shortcuts = shortcuts.shortcuts || [];
    }

    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ shortcuts: shortcuts })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action, adminCode } = body;

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

      if (adminCode !== process.env.ADMIN_CODE) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid admin code' })
        };
      }

      if (action === 'add') {
        const newShortcut = {
          name: body.name,
          keys: body.keys.split('+').map(k => k.trim()),
          category: body.category,
          desc: body.desc,
          icon: 'command'
        };
        shortcuts.push(newShortcut);
        fs.writeFileSync(SHORTCUTS_FILE, JSON.stringify(shortcuts, null, 2));
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }

      if (action === 'delete') {
        const filtered = shortcuts.filter(s => s.name !== body.name);
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
