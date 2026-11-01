const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'licenses.json');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Load or init database
function getLicenses() {
    if (!fs.existsSync(DB_FILE)) {
        const initial = {
            "MAHMOUD-VIP-123": {
                "owner_name": "العميل التجريبي",
                "status": "active",
                "expires": "2026-12-31"
            }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveLicenses(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// API for the Minecraft Plugin to check license
app.get('/api/check/:key', (req, res) => {
    const key = req.params.key;
    const licenses = getLicenses();

    if (!licenses[key]) {
        return res.json({ status: "not_found" });
    }

    const lic = licenses[key];

    // Check if expired
    const today = new Date().toISOString().split('T')[0];
    if (lic.expires < today && lic.status === 'active') {
        lic.status = 'expired';
        saveLicenses(licenses);
    }

    res.json({
        status: lic.status, // active, off, expired
        owner_name: lic.owner_name,
        expires: lic.expires
    });
});

// API for Dashboard to get all licenses
app.get('/api/licenses', (req, res) => {
    res.json(getLicenses());
});

// API to add or update a license
app.post('/api/licenses', (req, res) => {
    const { key, owner_name, expires, status } = req.body;
    if (!key) return res.status(400).json({ error: "Key is required" });

    const licenses = getLicenses();
    licenses[key] = {
        owner_name: owner_name || "Server Owner",
        expires: expires || "2026-12-31",
        status: status || "active"
    };
    saveLicenses(licenses);
    res.json({ success: true });
});

// API to delete a license
app.delete('/api/licenses/:key', (req, res) => {
    const key = req.params.key;
    const licenses = getLicenses();
    if (licenses[key]) {
        delete licenses[key];
        saveLicenses(licenses);
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Key not found" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
