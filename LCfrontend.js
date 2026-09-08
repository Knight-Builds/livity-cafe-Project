let ytPlayer = null;
let ytReady = false;
let currentActiveVideoId = "";
let hasUserUnmuted = false;

window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player('ytPlayer', {
    height: '100%',
    width: '100%',
    videoId: 'kJQP7kiw5Fk',
    playerVars: {
      autoplay: 1,
      controls: 1,
      enablejsapi: 1,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      origin: window.location.origin
    },
    events: {
      onReady: (event) => {
        ytReady = true;
        const playPromise = event.target.playVideo();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            event.target.mute();
            event.target.playVideo();
            const banner = document.getElementById('audioUnlockBanner');
            if (banner) banner.classList.add('active');
          });
        }
      },
      onStateChange: (event) => {
        // Automatically request next track when video ends (State 0)
        if (event.data === YT.PlayerState.ENDED) {
          fetch('/api/room/track-ended', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ streamId: currentActiveVideoId })
          }).then(() => {
            if (window.syncRoom) window.syncRoom();
          });
        }
      },
      onError: (e) => {
        console.warn("YouTube Player error:", e.data);
        // Instantly bypass broken videos
        fetch('/api/room/track-ended', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamId: currentActiveVideoId })
        }).then(() => {
          if (window.syncRoom) window.syncRoom();
        });
      }
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;
  let isRegister = true;
  let isPlaying = true;
  const recentBubbles = new Map();

  const audioBanner = document.getElementById('audioUnlockBanner');
  const authZone = document.getElementById('authZone');
  const navTrackDisplay = document.getElementById('navTrackDisplay');
  const stageTrackTitle = document.getElementById('stageTrackTitle');
  const stageTrackArtist = document.getElementById('stageTrackArtist');
  const currentDjName = document.getElementById('currentDjName');
  const currentDjAvatar = document.getElementById('currentDjAvatar');
  const currentDjRole = document.getElementById('currentDjRole');
  const vibeCount = document.getElementById('vibeCount');
  const awesomeBtn = document.getElementById('awesomeBtn');
  const voteSkipBtn = document.getElementById('voteSkipBtn');
  const skipCountBadge = document.getElementById('skipCountBadge');
  const hopOnDeckBtn = document.getElementById('hopOnDeckBtn');
  const crowdGrid = document.getElementById('crowdGrid');
  const listenerCount = document.getElementById('listenerCount');
  const hypeDisplay = document.getElementById('hypeDisplay');
  const chatFeed = document.getElementById('chatFeed');
  const chatForm = document.getElementById('chatForm');
  const chatMessageInput = document.getElementById('chatMessageInput');
  const vinylRecord = document.getElementById('vinylRecord');
  const toneArm = document.getElementById('toneArm');
  const turntableDeck = document.getElementById('turntableDeck');
  const queueStatusDisplay = document.getElementById('queueStatusDisplay');

  const quickSearchForm = document.getElementById('quickSearchForm');
  const quickSearchInput = document.getElementById('quickSearchInput');
  const searchResultsBox = document.getElementById('searchResultsBox');

  const authModal = document.getElementById('authModal');
  const closeModal = document.getElementById('closeModal');
  const authForm = document.getElementById('authForm');
  const toggleAuthBtn = document.getElementById('toggleAuthBtn');
  const modalTitle = document.getElementById('modalTitle');
  const modalSub = document.querySelector('.modal-sub');
  const modalTogglePrompt = document.getElementById('modalTogglePrompt');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const avatarPickerGroup = document.getElementById('avatarPickerGroup');
  const emailGroup = document.getElementById('emailGroup');

  const fxHorn = document.getElementById('fxHorn');
  const fxSiren = document.getElementById('fxSiren');
  const fxLaser = document.getElementById('fxLaser');
  const fxRewind = document.getElementById('fxRewind');

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function unlockAudioGlobally() {
    getAudioContext();
    if (ytPlayer && ytReady) {
      ytPlayer.unMute();
      ytPlayer.setVolume(100);
      if (ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
        ytPlayer.playVideo();
      }
    }
    hasUserUnmuted = true;
    if (audioBanner) audioBanner.classList.remove('active');
  }

  if (audioBanner) audioBanner.addEventListener('click', unlockAudioGlobally);
  document.body.addEventListener('click', () => {
    if (!hasUserUnmuted) unlockAudioGlobally();
  }, { once: true });

  // Serato Airhorn
  function playSeratoAirHorn() {
    const ctx = getAudioContext();
    const startTime = ctx.currentTime;
    const bursts = [0, 0.12, 0.26];
    bursts.forEach((offset, idx) => {
      const isLong = idx === bursts.length - 1;
      const duration = isLong ? 0.45 : 0.09;
      const t = startTime + offset;
      const freqs = [369.99, 466.16, 554.37];
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 1.04, t);
        osc.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duration);
      });
    });
  }

  // Dub Siren
  function playDubSiren() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const mainGain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(620, now);
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(4.5, now);
    lfoGain.gain.setValueAtTime(180, now);
    lfo.connect(osc.frequency);
    mainGain.gain.setValueAtTime(0.2, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(mainGain);
    mainGain.connect(ctx.destination);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 1.2);
    osc.stop(now + 1.2);
  }

  // Laser
  function playLaser() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.22);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Tape Rewind
  function playRewind() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.linearRampToValueAtTime(1400, now + 0.3);
    osc.frequency.linearRampToValueAtTime(80, now + 0.55);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  fxHorn.addEventListener('click', playSeratoAirHorn);
  fxSiren.addEventListener('click', playDubSiren);
  fxLaser.addEventListener('click', playLaser);
  fxRewind.addEventListener('click', () => {
    playRewind();
    scratchTurntable();
  });

  function scratchTurntable() {
    isPlaying = !isPlaying;
    if (!isPlaying) {
      vinylRecord.classList.add('paused');
      toneArm.classList.add('lifted');
      if (ytPlayer && ytReady) ytPlayer.pauseVideo();
    } else {
      vinylRecord.classList.remove('paused');
      toneArm.classList.remove('lifted');
      if (ytPlayer && ytReady) ytPlayer.playVideo();
    }
  }

  turntableDeck.addEventListener('click', () => {
    playRewind();
    scratchTurntable();
  });

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.authenticated) {
        currentUser = data.user;
        renderLoggedIn();
      } else {
        currentUser = null;
        renderLoggedOut();
      }
    } catch (e) {
      renderLoggedOut();
    }
  }

  function renderLoggedIn() {
    authZone.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span style="font-size:1.3rem;">${currentUser.avatar}</span>
        <strong style="color:var(--accent-gold); font-size:0.88rem;">${escapeHtml(currentUser.username)}</strong>
        <button id="logoutBtn" class="stage-action-btn" style="padding:0.35rem 0.7rem; font-size:0.75rem;">Leave</button>
      </div>
    `;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      checkAuth();
    });
  }

  function renderLoggedOut() {
    authZone.innerHTML = `<button id="openAuthModalBtn" class="primary-btn">Join Lounge</button>`;
    document.getElementById('openAuthModalBtn').addEventListener('click', () => openModal(true));
  }

  window.syncRoom = async function() {
    try {
      const res = await fetch('/api/room/sync');
      const data = await res.json();
      const track = data.currentTrack;

      navTrackDisplay.textContent = `DJ ${data.currentDj.username} broadcasting "${track.title}" by ${track.artist}`;
      stageTrackTitle.textContent = track.title;
      stageTrackArtist.textContent = track.artist;

      currentDjName.textContent = data.currentDj.username;
      currentDjAvatar.textContent = data.currentDj.avatar;
      currentDjRole.textContent = data.currentDj.role ? data.currentDj.role.toUpperCase() : 'RESIDENT';
      vibeCount.textContent = data.awesomesCount;

      skipCountBadge.textContent = `${data.skipVotesCount}/${data.requiredSkips}`;
      if (data.hasVotedSkip) voteSkipBtn.classList.add('voted');
      else voteSkipBtn.classList.remove('voted');

      queueStatusDisplay.textContent = data.djQueue.length > 0
        ? `Up Next: ${data.djQueue[0].username}`
        : `Deck Queue: Autopilot`;

      if (ytReady && ytPlayer && track.streamId) {
        if (currentActiveVideoId !== track.streamId) {
          currentActiveVideoId = track.streamId;
          ytPlayer.loadVideoById({
            videoId: track.streamId,
            startSeconds: 0
          });
          if (hasUserUnmuted) {
            ytPlayer.unMute();
            ytPlayer.playVideo();
          }
        }
      }

      if (data.hasAwesomed) awesomeBtn.classList.add('awesomed');
      else awesomeBtn.classList.remove('awesomed');

      listenerCount.textContent = data.listeners.length;
      renderCrowd(data.listeners, data.awesomesCount);
      renderChat(data.chat);
    } catch (e) {
      console.error("Room sync tick error:", e);
    }
  };

  function renderCrowd(listeners, awesomes) {
    const isFast = awesomes > 1;
    hypeDisplay.textContent = awesomes > 2 ? "VIBE: ELECTRIC SOUNDCLASH!" : "VIBE: MELLOW DUB";

    crowdGrid.innerHTML = listeners.map(l => {
      const bubbleText = recentBubbles.get(l.username);
      return `
        <div class="crowd-avatar-unit ${isFast ? 'fast-bounce' : ''}" data-user="${escapeHtml(l.username)}">
          ${bubbleText ? `<div class="chat-speech-bubble">${escapeHtml(bubbleText)}</div>` : ''}
          <div class="avatar-bubble">${l.avatar}</div>
          <span class="crowd-name">${escapeHtml(l.username)}</span>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.crowd-avatar-unit').forEach(unit => {
      unit.addEventListener('click', () => {
        playLaser();
        unit.classList.add('fast-bounce');
        triggerSpeechBubble(unit.dataset.user, "BOOM! 🔥");
      });
    });
  }

  function triggerSpeechBubble(username, text) {
    recentBubbles.set(username, text.slice(0, 26));
    window.syncRoom();
    setTimeout(() => {
      recentBubbles.delete(username);
      window.syncRoom();
    }, 4500);
  }

  function renderChat(messages) {
    const isScrolledToBottom = chatFeed.scrollHeight - chatFeed.clientHeight <= chatFeed.scrollTop + 60;
    chatFeed.innerHTML = messages.map(m => `
      <div class="chat-msg">
        <span class="chat-avatar">${m.avatar}</span>
        <div>
          <span class="chat-user">${escapeHtml(m.username)}:</span>
          <span class="chat-text">${escapeHtml(m.message)}</span>
        </div>
        <span class="chat-time">${m.time}</span>
      </div>
    `).join('');

    if (isScrolledToBottom) {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    }
  }

  document.querySelectorAll('.genre-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      quickSearchInput.value = tag.dataset.query;
      executeCrateSearch(tag.dataset.query);
    });
  });

  quickSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = quickSearchInput.value.trim();
    if (query) executeCrateSearch(query);
  });

  async function executeCrateSearch(query) {
    searchResultsBox.innerHTML = `<div class="empty-crate-box">Searching YouTube for "${escapeHtml(query)}"...</div>`;

    try {
      const res = await fetch(`/api/music/search-instant?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!data.tracks || data.tracks.length === 0) {
        searchResultsBox.innerHTML = `<div class="empty-crate-box">No matching records found.</div>`;
        return;
      }

      searchResultsBox.innerHTML = data.tracks.map(t => `
        <div class="modern-track-card">
          <div class="card-track-info">
            <img src="${t.thumbnail}" class="card-thumb" alt="${escapeHtml(t.title)}">
            <div class="card-titles">
              <strong>${escapeHtml(t.title)}</strong>
              <span>${escapeHtml(t.artist)}</span>
            </div>
          </div>
          <button class="instant-spin-btn" data-id="${t.videoId}" data-title="${escapeHtml(t.title)}" data-artist="${escapeHtml(t.artist)}">
            Spin on Deck 🎚️
          </button>
        </div>
      `).join('');

      document.querySelectorAll('.instant-spin-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!currentUser) return openModal(false);

          unlockAudioGlobally();
          playRewind();

          const res = await fetch('/api/room/drop-track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: btn.dataset.title,
              artist: btn.dataset.artist,
              trackUrl: btn.dataset.id
            })
          });

          if (res.ok) {
            quickSearchInput.value = '';
            searchResultsBox.innerHTML = '<div class="empty-crate-box">Record locked and spinning live!</div>';
            window.syncRoom();
          }
        });
      });

    } catch (err) {
      searchResultsBox.innerHTML = `<div class="empty-crate-box">Error fetching catalog.</div>`;
    }
  }

  awesomeBtn.addEventListener('click', async () => {
    if (!currentUser) return openModal(false);
    playDubSiren();
    await fetch('/api/room/awesome', { method: 'POST' });
    window.syncRoom();
  });

  voteSkipBtn.addEventListener('click', async () => {
    if (!currentUser) return openModal(false);
    playRewind();

    const res = await fetch('/api/room/vote-skip', { method: 'POST' });
    const data = await res.json();

    if (data.skipped) {
      triggerSpeechBubble(currentUser.username, "SKIPPED! ⏭️");
    }
    window.syncRoom();
  });

  hopOnDeckBtn.addEventListener('click', async () => {
    if (!currentUser) return openModal(false);
    const res = await fetch('/api/room/queue-up', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else alert("You're locked in line on deck!");
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return openModal(false);
    const text = chatMessageInput.value.trim();
    if (!text) return;
    chatMessageInput.value = '';

    triggerSpeechBubble(currentUser.username, text);

    await fetch('/api/room/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    window.syncRoom();
  });

  function openModal(register = true) {
    isRegister = register;

    if (isRegister) {
      modalTitle.textContent = 'Register Selector Pass';
      if (modalSub) modalSub.textContent = 'Create your membership card to broadcast records and join the crowd.';
      authSubmitBtn.textContent = 'Step Into Lounge';
      avatarPickerGroup.style.display = 'block';
      emailGroup.style.display = 'block';
      if (modalTogglePrompt) modalTogglePrompt.textContent = 'Already have a selector pass? ';
      toggleAuthBtn.textContent = 'Sign In';
    } else {
      modalTitle.textContent = 'Selector Sign In';
      if (modalSub) modalSub.textContent = 'Authenticate your card to access the decks and chat.';
      authSubmitBtn.textContent = 'Authenticate';
      avatarPickerGroup.style.display = 'none';
      emailGroup.style.display = 'none';
      if (modalTogglePrompt) modalTogglePrompt.textContent = 'Need a selector membership pass? ';
      toggleAuthBtn.textContent = 'Sign Up';
    }

    authModal.classList.remove('hidden');
  }

  closeModal.addEventListener('click', () => authModal.classList.add('hidden'));
  toggleAuthBtn.addEventListener('click', () => openModal(!isRegister));

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = isRegister ? '/api/register' : '/api/login';
    const avatar = document.querySelector('input[name="avatarSelect"]:checked')?.value || '🎧';

    const payload = {
      username: document.getElementById('authUsername').value,
      email: isRegister ? document.getElementById('authEmail').value : undefined,
      password: document.getElementById('authPassword').value,
      avatar: isRegister ? avatar : undefined
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Authentication error.');

    authModal.classList.add('hidden');
    authForm.reset();
    checkAuth();
    window.syncRoom();
  });

  function escapeHtml(s) {
    return (s || '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c));
  }

  checkAuth();
  window.syncRoom();
  setInterval(window.syncRoom, 2000);
});
