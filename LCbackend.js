const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Setup
const db = new Database(path.join(__dirname, 'livity.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT '🎧',
    favorite_genre TEXT DEFAULT 'Roots Reggae',
    vibe_points INTEGER DEFAULT 0,
    role TEXT DEFAULT 'Resident Selecta',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    avatar TEXT DEFAULT '🎧',
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS song_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    stream_id TEXT NOT NULL,
    player_type TEXT DEFAULT 'youtube',
    dj_name TEXT NOT NULL,
    awesomes INTEGER DEFAULT 0,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Curated 24/7 Autopilot Rotation (Diverse, verified playable IDs)
const autoRotation = [
  { title: "Roots & Chalice (Dubplate Special)", artist: "Chronixx", streamId: "kJQP7kiw5Fk", duration: 215 },
  { title: "Toast", artist: "Koffee", streamId: "p8HQXZsS38w", duration: 190 },
  { title: "Who Knows", artist: "Protoje ft. Chronixx", streamId: "hzqFmG4b17U", duration: 230 },
  { title: "Could You Be Loved", artist: "Bob Marley & The Wailers", streamId: "Mm7u59o68gI", duration: 237 },
  { title: "Last Last", artist: "Burna Boy", streamId: "421w1j87f2U", duration: 172 },
  { title: "Welcome to Jamrock", artist: "Damian Marley", streamId: "WnO_Jvxj3wE", duration: 236 },
  { title: "Come Around", artist: "Collie Buddz", streamId: "1W5m0wM7W5M", duration: 218 }
];

let rotationIndex = 0;

// Shared Room State
const roomState = {
  currentDj: { username: "King Jammy AI", avatar: "🎛️", role: "Master Resident" },
  djQueue: [],
  currentTrack: {
    ...autoRotation[0],
    playerType: "youtube",
    startTime: Date.now()
  },
  awesomes: new Set(),
  skipVotes: new Set(),
  listeners: new Map()
};

function advanceTrack(reason = "Track concluded") {
  roomState.skipVotes.clear();
  roomState.awesomes.clear();

  if (roomState.djQueue.length > 0) {
    const nextDj = roomState.djQueue.shift();
    rotationIndex = (rotationIndex + 1) % autoRotation.length;
    const nextPick = autoRotation[rotationIndex];
    roomState.currentDj = nextDj;
    roomState.currentTrack = {
      title: nextPick.title,
      artist: `${nextDj.username} Selector Pick`,
      streamId: nextPick.streamId,
      playerType: "youtube",
      duration: nextPick.duration || 200,
      startTime: Date.now()
    };
  } else {
    rotationIndex = (rotationIndex + 1) % autoRotation.length;
    const nextPick = autoRotation[rotationIndex];
    roomState.currentDj = { username: "King Jammy AI", avatar: "🎛️", role: "Master Resident" };
    roomState.currentTrack = {
      ...nextPick,
      playerType: "youtube",
      startTime: Date.now()
    };
  }

  db.prepare('INSERT INTO chat_messages (username, avatar, message) VALUES (?, ?, ?)')
    .run("LIVITY SOUND", "⚡", `⏭️ ${reason} -> Now playing: "${roomState.currentTrack.title}" by ${roomState.currentTrack.artist}`);
}

// Background poller: Automatically advance track the second duration expires
setInterval(() => {
  const elapsed = (Date.now() - roomState.currentTrack.startTime) / 1000;
  if (elapsed >= (roomState.currentTrack.duration || 200)) {
    advanceTrack("Autopilot rotation advance");
  }
}, 1000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(session({
  name: 'livity_session',
  secret: 'livity_audiophile_social_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'LCWebDesign.html'));
});

// Auth Routes
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.json({ authenticated: false });
  const user = db.prepare('SELECT id, username, email, avatar, favorite_genre, vibe_points, role FROM users WHERE username = ?').get(req.session.user);
  if (!user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user });
});

app.post('/api/register', (req, res) => {
  const { username, email, password, avatar, favorite_genre } = req.body || {};
  if (!username || !password || username.trim().length < 2) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  const clean = username.trim();
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(clean);
  if (existing) return res.status(409).json({ error: 'Handle already registered.' });

  const hash = bcrypt.hashSync(password, 10);
  const selectedAvatar = avatar || '🎧';
  const genre = favorite_genre || 'Roots Reggae';

  db.prepare(`
    INSERT INTO users (username, email, password_hash, avatar, favorite_genre, role)
    VALUES (?, ?, ?, ?, ?, 'Resident Selecta')
  `).run(clean, email ? email.trim() : null, hash, selectedAvatar, genre);

  req.session.user = clean;
  res.json({ success: true, user: { username: clean, avatar: selectedAvatar, role: 'Resident Selecta' } });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username ? username.trim() : '');
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid selector credentials.' });
  }
  req.session.user = user.username;
  res.json({ success: true, user: { username: user.username, avatar: user.avatar, role: user.role } });
});

app.post('/api/logout', (req, res) => {
  if (req.session.user) roomState.listeners.delete(req.session.user);
  req.session.destroy(() => res.json({ success: true }));
});

// Room Sync Engine
app.get('/api/room/sync', (req, res) => {
  const user = req.session.user;
  if (user) {
    const u = db.prepare('SELECT avatar, role FROM users WHERE username = ?').get(user);
    roomState.listeners.set(user, {
      username: user,
      avatar: u ? u.avatar : '🎧',
      role: u ? u.role : 'Selecta',
      lastSeen: Date.now()
    });
  }

  const now = Date.now();
  for (const [uname, data] of roomState.listeners.entries()) {
    if (now - data.lastSeen > 25000) {
      roomState.listeners.delete(uname);
      roomState.skipVotes.delete(uname);
    }
  }

  const listenerTotal = Math.max(1, roomState.listeners.size);
  const requiredSkips = Math.ceil(listenerTotal / 2);
  const elapsedSeconds = Math.max(0, Math.floor((now - roomState.currentTrack.startTime) / 1000));

  const chats = db.prepare(`
    SELECT username, avatar, message, strftime('%H:%M', created_at) as time 
    FROM chat_messages ORDER BY id DESC LIMIT 40
  `).all().reverse();

  res.json({
    currentDj: roomState.currentDj,
    djQueue: roomState.djQueue,
    currentTrack: { ...roomState.currentTrack, elapsedSeconds },
    awesomesCount: roomState.awesomes.size,
    hasAwesomed: user ? roomState.awesomes.has(user) : false,
    skipVotesCount: roomState.skipVotes.size,
    requiredSkips,
    hasVotedSkip: user ? roomState.skipVotes.has(user) : false,
    listeners: Array.from(roomState.listeners.values()),
    chat: chats
  });
});

// Manual trigger from client or event
app.post('/api/room/track-ended', (req, res) => {
  advanceTrack("Track concluded");
  res.json({ success: true, currentTrack: roomState.currentTrack });
});

// Skip Vote Endpoint
app.post('/api/room/vote-skip', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Sign in to vote to skip.' });
  const user = req.session.user;

  if (roomState.skipVotes.has(user)) {
    roomState.skipVotes.delete(user);
  } else {
    roomState.skipVotes.add(user);
  }

  const listenerTotal = Math.max(1, roomState.listeners.size);
  const requiredSkips = Math.ceil(listenerTotal / 2);

  let skipped = false;
  if (roomState.skipVotes.size >= requiredSkips) {
    advanceTrack("Majority vote reached");
    skipped = true;
  }

  res.json({ success: true, skipped, votes: roomState.skipVotes.size, requiredSkips });
});

// YouTube Search API
app.get('/api/music/search-instant', (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Search term required' });

  const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  };

  https.get(ytUrl, options, (apiRes) => {
    let html = '';
    apiRes.on('data', chunk => html += chunk);
    apiRes.on('end', () => {
      try {
        const tracks = [];
        const videoRegex = /"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})","thumbnail":\{"thumbnails":\[.*?"url":"(https:\/\/i\.ytimg\.com\/[^"]+)".*?"title":\{"runs":\[\{"text":"([^"]+)"\}\].*?"ownerText":\{"runs":\[\{"text":"([^"]+)"\}/g;

        let match;
        while ((match = videoRegex.exec(html)) !== null && tracks.length < 8) {
          const videoId = match[1];
          const rawTitle = match[3];
          const channel = match[4];

          if (!tracks.some(t => t.videoId === videoId)) {
            tracks.push({
              videoId,
              title: rawTitle.replace(/\\u0026/g, '&'),
              artist: channel.replace(/\\u0026/g, '&'),
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            });
          }
        }

        if (tracks.length > 0) {
          return res.json({ tracks });
        }

        const simpleIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const fallbackIds = [];
        let idMatch;
        while ((idMatch = simpleIdRegex.exec(html)) !== null && fallbackIds.length < 6) {
          if (!fallbackIds.includes(idMatch[1])) fallbackIds.push(idMatch[1]);
        }

        if (fallbackIds.length > 0) {
          const simpleTracks = fallbackIds.map((id, idx) => ({
            videoId: id,
            title: `${query} (Audio Mix ${idx + 1})`,
            artist: "YouTube Official Audio",
            thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
          }));
          return res.json({ tracks: simpleTracks });
        }

        res.json({ tracks: autoRotation.map(c => ({ ...c, videoId: c.streamId, thumbnail: `https://i.ytimg.com/vi/${c.streamId}/hqdefault.jpg` })) });
      } catch (err) {
        res.json({ tracks: autoRotation.map(c => ({ ...c, videoId: c.streamId, thumbnail: `https://i.ytimg.com/vi/${c.streamId}/hqdefault.jpg` })) });
      }
    });
  }).on('error', () => {
    res.json({ tracks: autoRotation.map(c => ({ ...c, videoId: c.streamId, thumbnail: `https://i.ytimg.com/vi/${c.streamId}/hqdefault.jpg` })) });
  });
});

// Drop Track Route
app.post('/api/room/drop-track', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Sign in required.' });
  const { title, artist, trackUrl } = req.body || {};

  if (!title || !trackUrl) {
    return res.status(400).json({ error: 'Track title and playable ID are required.' });
  }

  let videoId = trackUrl.trim();
  if (videoId.includes('v=')) videoId = videoId.split('v=')[1].split('&')[0];
  else if (videoId.includes('youtu.be/')) videoId = videoId.split('youtu.be/')[1].split('?')[0];

  const u = db.prepare('SELECT avatar, role FROM users WHERE username = ?').get(req.session.user);
  roomState.currentDj = { username: req.session.user, avatar: u ? u.avatar : '🎛️', role: u ? u.role : 'Master Resident' };
  roomState.currentTrack = {
    title: title.trim(),
    artist: (artist || 'Unknown Artist').trim(),
    playerType: 'youtube',
    streamId: videoId,
    duration: 200,
    startTime: Date.now()
  };
  roomState.awesomes.clear();
  roomState.skipVotes.clear();
  roomState.djQueue = roomState.djQueue.filter(q => q.username !== req.session.user);

  db.prepare('INSERT INTO song_history (title, artist, stream_id, player_type, dj_name) VALUES (?, ?, ?, ?, ?)')
    .run(title.trim(), artist || 'Unknown', videoId, 'youtube', req.session.user);

  res.json({ success: true, currentTrack: roomState.currentTrack });
});

app.post('/api/room/queue-up', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Sign in to line up for deck.' });
  const user = req.session.user;
  const u = db.prepare('SELECT avatar, role FROM users WHERE username = ?').get(user);

  if (roomState.currentDj.username === user || roomState.djQueue.some(q => q.username === user)) {
    return res.status(400).json({ error: 'You are already spinning or lined up!' });
  }

  roomState.djQueue.push({ username: user, avatar: u ? u.avatar : '🎧', role: u ? u.role : 'Selecta' });
  res.json({ success: true, queue: roomState.djQueue });
});

app.post('/api/room/awesome', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Sign in to vote!' });
  const user = req.session.user;

  if (roomState.awesomes.has(user)) {
    roomState.awesomes.delete(user);
  } else {
    roomState.awesomes.add(user);
    db.prepare('UPDATE users SET vibe_points = vibe_points + 2 WHERE username = ?').run(user);
  }
  res.json({ success: true, awesomes: roomState.awesomes.size });
});

app.post('/api/room/chat', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Sign in to chat.' });
  const { message } = req.body || {};
  if (!message || message.trim().length === 0) return res.status(400).json({ error: 'Empty message' });

  const u = db.prepare('SELECT avatar FROM users WHERE username = ?').get(req.session.user);
  db.prepare('INSERT INTO chat_messages (username, avatar, message) VALUES (?, ?, ?)')
    .run(req.session.user, u ? u.avatar : '🎧', message.trim());

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🎛️ Livity Pro Live Audio Hub running on http://localhost:${PORT}`);
});
