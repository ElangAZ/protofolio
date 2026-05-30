import React, { useEffect, useState, useRef } from 'react';

/* ==========================================================================
   Helper: Fetch Query Parameters from URL
   ========================================================================== */
const getQueryParam = (name, fallback) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || fallback;
};

/* ==========================================================================
   Sakura Petal Physics Engine Class
   ========================================================================== */
class SakuraPetal {
    constructor(canvasWidth, canvasHeight) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * -canvasHeight - 20;
        this.size = Math.random() * 8 + 6;
        this.speedY = Math.random() * 1.2 + 0.8;
        this.speedX = Math.random() * 1.5 - 0.5;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 1.5 - 0.75;
        this.opacity = Math.random() * 0.4 + 0.5;
    }

    update(canvasWidth, canvasHeight, windSpeed) {
        this.y += this.speedY;
        this.x += this.speedX + windSpeed;
        this.rotation += this.rotationSpeed;

        if (this.y > canvasHeight || this.x < -20 || this.x > canvasWidth + 20) {
            this.x = Math.random() * canvasWidth;
            this.y = -20;
            this.size = Math.random() * 8 + 6;
            this.speedY = Math.random() * 1.2 + 0.8;
            this.speedX = Math.random() * 1.5 - 0.5;
            this.opacity = Math.random() * 0.4 + 0.5;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 183, 197, ${this.opacity})`;
        ctx.shadowColor = 'rgba(255, 150, 170, 0.3)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
    }
}

export default function App() {
    const canvasRef = useRef(null);
    const ytPlayerRef = useRef(null);

    // --- Dynamic Parameters (Read from Query URL -> LocalStorage -> Fallback Defaults) ---
    const [discordId, setDiscordId] = useState(() => 
        getQueryParam('discord', localStorage.getItem('discord_cached_id') || '1322201350754271283')
    );
    const [ytVideoId, setYtVideoId] = useState(() => 
        getQueryParam('yt', localStorage.getItem('discord_cached_yt_id') || 'a-wzhcBo6gM')
    );
    const [ytStartSeconds, setYtStartSeconds] = useState(() => 
        parseInt(getQueryParam('start', localStorage.getItem('discord_cached_start_seconds') || '11'), 10)
    );
    const [bgUrl, setBgUrl] = useState(() => 
        getQueryParam('bg', localStorage.getItem('discord_cached_bg_url') || '/assets/background.png')
    );
    const [showSakura, setShowSakura] = useState(() => {
        const param = getQueryParam('sakura', localStorage.getItem('discord_cached_show_sakura'));
        return param === null ? true : param === 'true';
    });

    // --- Core States ---
    const [viewsCount, setViewsCount] = useState('--');
    const [isPlaying, setIsPlaying] = useState(false);
    const [ytPlayerReady, setYtPlayerReady] = useState(false);
    const [ytTrackTitle, setYtTrackTitle] = useState("imase - NIGHT DANCER");

    // --- Visual Builder Drawer Panel States ---
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editDiscordId, setEditDiscordId] = useState(discordId);
    const [editYtId, setEditYtId] = useState(ytVideoId);
    const [editStart, setEditStart] = useState(ytStartSeconds);
    const [editBgUrl, setEditBgUrl] = useState(bgUrl);
    const [editShowSakura, setEditShowSakura] = useState(showSakura);
    const [toast, setToast] = useState({ show: false, message: '' });

    // --- Discord Lanyard Integration States ---
    const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('discord_cached_avatar') || '/assets/avatar.png');
    const [statusAvatarUrl, setStatusAvatarUrl] = useState(localStorage.getItem('discord_cached_avatar') || '/assets/status_avatar.png');
    const [decoUrl, setDecoUrl] = useState(localStorage.getItem('discord_cached_deco') || null);
    const [discordUsername, setDiscordUsername] = useState(localStorage.getItem('discord_cached_username') || 'senux');
    const [displayName, setDisplayName] = useState(localStorage.getItem('discord_cached_display_name') || 'senux8thrill');
    const [discordStatus, setDiscordStatus] = useState('offline');
    const [customStatus, setCustomStatus] = useState({ text: 'currently doing nothing', emojiHtml: '' });
    
    // --- Spotify Presence State ---
    const [spotify, setSpotify] = useState({
        active: false,
        song: '',
        artist: '',
        albumArt: ''
    });

    // Helper: Show dynamic notification toast
    const showToast = (message) => {
        setToast({ show: true, message });
        setTimeout(() => {
            setToast({ show: false, message: '' });
        }, 3000);
    };

    /* ==========================================================================
       Volume Fade-In Utility for cinematic audio entrance
       ========================================================================== */
    const fadeInVolume = (player) => {
        if (!player || typeof player.setVolume !== 'function') return;
        player.setVolume(0);
        let vol = 0;
        const fadeTimer = setInterval(() => {
            if (vol >= 80) {
                player.setVolume(80);
                clearInterval(fadeTimer);
            } else {
                vol += 4;
                player.setVolume(vol);
            }
        }, 80);
    };

    /* ==========================================================================
       Play with Mute Skiping to resolve initial 0s buffering audio glitch
       ========================================================================== */
    const playWithGlitchPrevention = (player) => {
        if (!player || typeof player.playVideo !== 'function') return;
        player.mute();
        player.seekTo(ytStartSeconds, true);
        player.playVideo();
        
        // Let it seek in complete silence for 250ms, then unmute and fade in!
        setTimeout(() => {
            player.unMute();
            fadeInVolume(player);
        }, 280);
    };

    /* ==========================================================================
       Effect: Dynamic Background Image Sync
       ========================================================================== */
    useEffect(() => {
        if (bgUrl) {
            document.body.style.backgroundImage = `url('${bgUrl}')`;
        }
    }, [bgUrl]);

    /* ==========================================================================
       Effect: Sakura Petals Falling Animation (Canvas)
       ========================================================================== */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!showSakura) return;

        let petals = [];
        let windSpeed = 0.2;
        let targetWindSpeed = 0.2;
        let animationFrameId;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const maxPetals = Math.min(80, Math.floor((canvas.width * canvas.height) / 12000));
        for (let i = 0; i < maxPetals; i++) {
            petals.push(new SakuraPetal(canvas.width, canvas.height));
            petals[i].y = Math.random() * canvas.height;
        }

        const windInterval = setInterval(() => {
            targetWindSpeed = Math.random() * 0.8 - 0.2;
        }, 8000);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            windSpeed += (targetWindSpeed - windSpeed) * 0.01;

            petals.forEach(petal => {
                petal.update(canvas.width, canvas.height, windSpeed);
                petal.draw(ctx);
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            clearInterval(windInterval);
            cancelAnimationFrame(animationFrameId);
        };
    }, [showSakura]);

    /* ==========================================================================
       Effect: Views Counter Timer
       ========================================================================== */
    useEffect(() => {
        const baseline = 20;
        let localViews = localStorage.getItem('senux_portfolio_views');

        if (localViews === null) {
            localViews = baseline;
        } else {
            localViews = parseInt(localViews, 10) + 1;
        }

        localStorage.setItem('senux_portfolio_views', localViews);
        
        let currentView = baseline > localViews ? localViews : Math.max(0, localViews - 10);
        const counterTimer = setInterval(() => {
            if (currentView >= localViews) {
                setViewsCount(localViews);
                clearInterval(counterTimer);
            } else {
                currentView++;
                setViewsCount(currentView);
            }
        }, 60);

        return () => clearInterval(counterTimer);
    }, []);

    /* ==========================================================================
       Effect: YouTube Iframe Player API Loader
       ========================================================================== */
    useEffect(() => {
        // Force reload iframe API if needed
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        const setupPlayer = () => {
            if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
                try {
                    ytPlayerRef.current.destroy();
                } catch (e) {}
            }

            ytPlayerRef.current = new window.YT.Player('yt-player', {
                height: '0',
                width: '0',
                videoId: ytVideoId,
                playerVars: {
                    'playsinline': 1,
                    'loop': 1,
                    'playlist': ytVideoId,
                    'controls': 0,
                    'disablekb': 1,
                    'start': ytStartSeconds
                },
                events: {
                    'onReady': () => {
                        setYtPlayerReady(true);
                        // Fetch the video title dynamically
                        if (ytPlayerRef.current && typeof ytPlayerRef.current.getVideoData === 'function') {
                            const data = ytPlayerRef.current.getVideoData();
                            if (data && data.title) {
                                setYtTrackTitle(data.title);
                            }
                        }
                        // Securely cue and seek to the target start time on load without autoplay policy violations
                        if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
                            ytPlayerRef.current.mute();
                            ytPlayerRef.current.seekTo(ytStartSeconds, true);
                        }
                    },
                    'onStateChange': (event) => {
                        if (event.data === 1) { // playing
                            // Double check title matches
                            if (ytPlayerRef.current && typeof ytPlayerRef.current.getVideoData === 'function') {
                                const data = ytPlayerRef.current.getVideoData();
                                if (data && data.title) {
                                    setYtTrackTitle(data.title);
                                }
                            }
                        }
                    }
                }
            });
        };

        window.onYouTubeIframeAPIReady = setupPlayer;

        if (window.YT && window.YT.Player) {
            setupPlayer();
        }

        const autoplayOnGesture = () => {
            if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
                playWithGlitchPrevention(ytPlayerRef.current);
                setIsPlaying(true);
            }
            document.removeEventListener('click', autoplayOnGesture);
        };
        document.addEventListener('click', autoplayOnGesture);

        return () => {
            document.removeEventListener('click', autoplayOnGesture);
        };
    }, []);

    const togglePlayback = () => {
        if (!ytPlayerReady || !ytPlayerRef.current || typeof ytPlayerRef.current.getPlayerState !== 'function') return;

        const state = ytPlayerRef.current.getPlayerState();
        if (state === 1) { // playing
            ytPlayerRef.current.pauseVideo();
            setIsPlaying(false);
        } else {
            playWithGlitchPrevention(ytPlayerRef.current);
            setIsPlaying(true);
        }
    };

    /* ==========================================================================
       Effect: Discord Live Sync (Lanyard API Polling)
       ========================================================================== */
    useEffect(() => {
        if (!discordId || discordId === "YOUR_DISCORD_ID_HERE") return;

        const updatePresence = async () => {
            try {
                const response = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`);
                if (!response.ok) throw new Error("Lanyard presence query failed");
                const { data } = await response.json();

                // 1. Sync Profile & Status Avatars
                if (data.discord_user.avatar) {
                    const isAnimated = data.discord_user.avatar.startsWith('a_');
                    const format = isAnimated ? 'gif' : 'png';
                    const newAvatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${data.discord_user.avatar}.${format}?size=256`;
                    
                    setAvatarUrl(newAvatarUrl);
                    setStatusAvatarUrl(newAvatarUrl);
                    localStorage.setItem('discord_cached_avatar', newAvatarUrl);
                }

                // 2. Sync Avatar Decorations (Borders)
                if (data.discord_user.avatar_decoration_data) {
                    const decoAsset = data.discord_user.avatar_decoration_data.asset;
                    const newDecoUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${decoAsset}.png`;
                    setDecoUrl(newDecoUrl);
                    localStorage.setItem('discord_cached_deco', newDecoUrl);
                } else {
                    setDecoUrl(null);
                    localStorage.removeItem('discord_cached_deco');
                }

                // 3. Sync Usernames
                const dName = data.discord_user.global_name || data.discord_user.username;
                setDiscordUsername(data.discord_user.username);
                setDisplayName(dName);
                localStorage.setItem('discord_cached_username', data.discord_user.username);
                localStorage.setItem('discord_cached_display_name', dName);

                // 4. Sync Discord Status
                setDiscordStatus(data.discord_status);

                // 5. Sync Custom Status Details
                let text = "currently doing nothing";
                let emojiHtml = '';
                const customAct = data.activities.find(act => act.type === 4);
                if (customAct) {
                    text = customAct.state || '';
                    if (customAct.emoji) {
                        if (customAct.emoji.id) {
                            const ext = customAct.emoji.animated ? 'gif' : 'png';
                            emojiHtml = `<img src="https://cdn.discordapp.com/emojis/${customAct.emoji.id}.${ext}?size=44" style="height: 1.2em; vertical-align: middle; margin-right: 4px;" alt="" />`;
                        } else {
                            emojiHtml = `${customAct.emoji.name} `;
                        }
                    }
                } else {
                    const playingAct = data.activities.find(act => act.type === 0);
                    if (playingAct) {
                        text = `playing ${playingAct.name}`;
                    }
                }
                setCustomStatus({ text, emojiHtml });

                // 6. Sync Spotify Listen Stream
                if (data.listening_to_spotify && data.spotify) {
                    setSpotify({
                        active: true,
                        song: data.spotify.song,
                        artist: data.spotify.artist,
                        albumArt: data.spotify.album_art_url
                    });
                    localStorage.setItem('discord_cached_spotify_active', 'true');
                    
                    // Automatically pause YouTube player if playing to prevent music clashing
                    if (ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function' && ytPlayerRef.current.getPlayerState() === 1) {
                        ytPlayerRef.current.pauseVideo();
                        setIsPlaying(false);
                    }
                } else {
                    setSpotify({
                        active: false,
                        song: '',
                        artist: '',
                        albumArt: ''
                    });
                    localStorage.removeItem('discord_cached_spotify_active');
                }

            } catch (err) {
                console.error("Lanyard status sync error:", err);
            }
        };

        updatePresence();
        const intervalId = setInterval(updatePresence, 8000);
        return () => clearInterval(intervalId);
    }, [discordId]);

    // Compute status indicators shadow color
    const getStatusShadow = () => {
        if (discordStatus === 'online') return 'rgba(46, 204, 113, 0.6)';
        if (discordStatus === 'idle') return 'rgba(241, 196, 15, 0.6)';
        if (discordStatus === 'dnd') return 'rgba(231, 76, 60, 0.6)';
        return 'rgba(116, 125, 140, 0.4)';
    };

    /* ==========================================================================
       Visual Profile Builder Events
       ========================================================================== */
    const handleSaveLocally = (e) => {
        e.preventDefault();
        
        // Extract YT ID if user put in a full YouTube URL
        let finalYtId = editYtId.trim();
        if (finalYtId.includes('youtube.com/watch') || finalYtId.includes('youtu.be/')) {
            const urlObj = new URL(finalYtId.includes('http') ? finalYtId : `https://${finalYtId}`);
            if (urlObj.hostname.includes('youtu.be')) {
                finalYtId = urlObj.pathname.substring(1);
            } else {
                finalYtId = urlObj.searchParams.get('v') || finalYtId;
            }
        }

        setDiscordId(editDiscordId.trim());
        setYtVideoId(finalYtId);
        setYtStartSeconds(parseInt(editStart, 10) || 0);
        setBgUrl(editBgUrl.trim());
        setShowSakura(editShowSakura);

        localStorage.setItem('discord_cached_id', editDiscordId.trim());
        localStorage.setItem('discord_cached_yt_id', finalYtId);
        localStorage.setItem('discord_cached_start_seconds', editStart);
        localStorage.setItem('discord_cached_bg_url', editBgUrl.trim());
        localStorage.setItem('discord_cached_show_sakura', String(editShowSakura));

        showToast("Config saved locally! Refreshing...");
        setTimeout(() => window.location.reload(), 1000);
    };

    const handleCopyBioLink = () => {
        // Extract YT ID if full URL
        let finalYtId = editYtId.trim();
        if (finalYtId.includes('youtube.com') || finalYtId.includes('youtu.be')) {
            try {
                const urlObj = new URL(finalYtId.includes('http') ? finalYtId : `https://${finalYtId}`);
                if (urlObj.hostname.includes('youtu.be')) {
                    finalYtId = urlObj.pathname.substring(1);
                } else {
                    finalYtId = urlObj.searchParams.get('v') || finalYtId;
                }
            } catch(e) {}
        }

        const baseUrl = window.location.origin + window.location.pathname;
        const customUrl = `${baseUrl}?discord=${encodeURIComponent(editDiscordId.trim())}&yt=${encodeURIComponent(finalYtId)}&start=${encodeURIComponent(editStart)}&bg=${encodeURIComponent(editBgUrl.trim())}&sakura=${editShowSakura}`;
        
        navigator.clipboard.writeText(customUrl).then(() => {
            showToast("Copied bio share link to clipboard! 📋");
        }).catch(err => {
            console.error("Failed to copy link:", err);
            showToast("Failed to copy link.");
        });
    };

    return (
        <>
            {/* Visual Builder Gear Toggle Button */}
            <button 
                className="settings-toggle" 
                title="Open Visual Builder"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>

            {/* Glowing Drawer Visual Editor Panel */}
            <aside className={`editor-drawer ${isDrawerOpen ? 'open' : ''}`}>
                <div className="drawer-header">
                    <h2>Visual Profile Builder</h2>
                    <button className="close-drawer" onClick={() => setIsDrawerOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form className="editor-form" onSubmit={handleSaveLocally}>
                    <div className="form-group">
                        <label>Discord Account ID</label>
                        <input 
                            type="text" 
                            value={editDiscordId} 
                            onChange={(e) => setEditDiscordId(e.target.value)} 
                            placeholder="e.g. 1322201350754271283"
                        />
                        <small>Numeric Discord ID. Syncs real-time avatars, status dots, and live Spotify.</small>
                    </div>

                    <div className="form-group">
                        <label>YouTube Track Link / ID</label>
                        <input 
                            type="text" 
                            value={editYtId} 
                            onChange={(e) => setEditYtId(e.target.value)} 
                            placeholder="e.g. a-wzhcBo6gM"
                        />
                        <small>Paste any YouTube watch link, share link, or raw Video ID.</small>
                    </div>

                    <div className="form-group">
                        <label>Start Playback Time (Seconds)</label>
                        <input 
                            type="number" 
                            value={editStart} 
                            onChange={(e) => setEditStart(e.target.value)} 
                            placeholder="11" 
                            min="0"
                        />
                        <small>Target time in seconds where audio playback begins (e.g. 11).</small>
                    </div>

                    <div className="form-group">
                        <label>Custom Background Image URL</label>
                        <input 
                            type="text" 
                            value={editBgUrl} 
                            onChange={(e) => setEditBgUrl(e.target.value)} 
                            placeholder="e.g. /assets/background.png"
                        />
                        <small>Paste any image link (PNG/JPG/GIF/WebP) or keep local default.</small>
                    </div>

                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <input 
                            type="checkbox" 
                            id="sakura-toggle"
                            checked={editShowSakura} 
                            onChange={(e) => setEditShowSakura(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="sakura-toggle" style={{ textTransform: 'none', cursor: 'pointer', marginBottom: 0, userSelect: 'none', fontSize: '13px' }}>Enable Sakura Petals Effect</label>
                    </div>

                    <div className="editor-actions">
                        <button type="submit" className="btn-primary">
                            Save Locally & Reload
                        </button>
                        <button type="button" className="btn-secondary" onClick={handleCopyBioLink}>
                            Copy Shareable Bio URL
                        </button>
                    </div>
                </form>
            </aside>

            {/* Glowing toast notification messages */}
            <div className={`toast-msg ${toast.show ? 'show' : ''}`}>
                <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width: '18px', height: '18px'}}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <span>{toast.message}</span>
            </div>

            {/* Falling Sakura Canvas Background */}
            <canvas id="sakura-canvas" ref={canvasRef}></canvas>

            {/* Custom Background Overlay for Dark/Vibe Blend */}
            <div className="background-overlay"></div>

            {/* Main Container */}
            <div className="main-container">
                
                {/* Premium Glassmorphic Card */}
                <main className="glass-card" id="profile-card">
                    
                    {/* Avatar Section with Badges */}
                    <div className="avatar-wrapper">
                        <div className={`avatar-container ${decoUrl ? 'has-deco' : ''}`}>
                            <img src={avatarUrl} alt="Avatar" className="avatar-img" />
                            
                            {/* Dynamic Discord Avatar Decoration (Borders) */}
                            {decoUrl && (
                                <img src={decoUrl} alt="Border Decoration" className="avatar-decoration-img" />
                            )}
                            
                            {/* Anime Anger Symbol Badge (Top Right) */}
                            <div className={`badge badge-anger ${decoUrl ? 'hidden' : ''}`} title="Vibing">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 12C4 7.58172 7.58172 4 12 4M20 12C20 16.4183 16.4183 20 12 20" stroke="#ff3838" strokeWidth="2.5" strokeLinecap="round"/>
                                    <path d="M7 17C9.5 14.5 14.5 14.5 17 17" stroke="#ff3838" strokeWidth="2.5" strokeLinecap="round"/>
                                    <path d="M7 7C9.5 9.5 14.5 9.5 17 7" stroke="#ff3838" strokeWidth="2.5" strokeLinecap="round"/>
                                    <path d="M17 7C14.5 9.5 14.5 14.5 17 17" stroke="#ff3838" stroke-width="2.5" strokeLinecap="round"/>
                                    <path d="M7 7C9.5 9.5 9.5 14.5 7 17" stroke="#ff3838" strokeWidth="2.5" strokeLinecap="round"/>
                                </svg>
                            </div>
                            
                            {/* Info Exclamation Warning Badge (Bottom Left) */}
                            <div className={`badge badge-warning ${decoUrl ? 'hidden' : ''}`} title="Warning: Vibe Zone">
                                <span className="exclamation-mark">!</span>
                            </div>
                        </div>
                    </div>

                    {/* Profile Info (Username, Bio, Location) */}
                    <section className="profile-info">
                        <h1 className="username">{discordUsername}</h1>
                        <p className="bio">i am here ♡</p>
                        <div className="location-badge">
                            {/* Pin Icon */}
                            <svg className="location-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span>Indonesia</span>
                        </div>
                    </section>

                    {/* Status Card (Discord / Spotify style) */}
                    <section className="status-widget">
                        <div className="status-avatar-wrapper">
                            <img src={statusAvatarUrl} alt="Discord Avatar" className="status-avatar-img" />
                            <div 
                                className={`status-indicator ${discordStatus}`}
                                style={{ boxShadow: `0 0 10px ${getStatusShadow()}` }}
                            ></div>
                        </div>
                        <div className="status-details">
                            <div className="status-header">
                                <span className="status-name">{displayName}</span>
                                {/* Red Verified Check Badge */}
                                <span className="verified-badge" title="Verified Vibe User">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="verified-icon">
                                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                </span>
                            </div>
                            <p 
                                className="status-desc"
                                dangerouslySetInnerHTML={{ __html: customStatus.emojiHtml + customStatus.text }}
                            ></p>
                        </div>
                    </section>

                    {/* Embedded Lofi Music Player Widget */}
                    <section className="music-player-widget">
                        <div className="music-info">
                            <div className={`music-icon-spin ${isPlaying && !spotify.active ? 'spinning' : ''}`} id="music-disc">
                                {spotify.active && spotify.albumArt ? (
                                    <img 
                                        src={spotify.albumArt} 
                                        alt="Album Art" 
                                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                                    />
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.5 2 12 2zm0 14.5c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                                    </svg>
                                )}
                            </div>
                            <div className="music-details">
                                <span className="song-title">
                                    {spotify.active 
                                        ? `🟢 Spotify: ${spotify.song} - ${spotify.artist}` 
                                        : (isPlaying ? ytTrackTitle : "Music Paused")
                                    }
                                </span>
                                <div className="visualizer" id="audio-visualizer">
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                </div>
                            </div>
                        </div>
                        <button 
                            className="play-btn" 
                            id="play-button" 
                            aria-label="Play Music" 
                            onClick={togglePlayback}
                            disabled={spotify.active}
                        >
                            {!isPlaying || spotify.active ? (
                                <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            ) : (
                                <svg className="pause-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                </svg>
                            )}
                        </button>
                    </section>

                    {/* Social Links Grid */}
                    <footer className="social-links">
                        {/* TikTok Link */}
                        <a href="https://www.tiktok.com/@snuqxcepele" target="_blank" rel="noopener noreferrer" className="social-btn tiktok" aria-label="TikTok">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.07-2.89-.54-4.06-1.42-.45-.34-.85-.75-1.21-1.2v7.92c-.08 2.44-1.22 4.88-3.41 6.01-2.19 1.13-4.99.98-7.03-.39-2.04-1.37-3.08-3.99-2.58-6.43.51-2.44 2.65-4.44 5.11-4.66 1.29-.11 2.58.21 3.63.95v-10.7c.07-.12.07-.27.07-.4z"/>
                            </svg>
                        </a>
                        {/* YouTube Link */}
                        <a href="https://www.youtube.com/@snuqxcepele" target="_blank" rel="noopener noreferrer" className="social-btn youtube" aria-label="YouTube">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.163c-.272-1.016-1.074-1.819-2.09-2.09C19.56 3.5 12 3.5 12 3.5s-7.56 0-9.408.573c-1.016.271-1.819 1.074-2.09 2.09C0 8.01 0 12 0 12s0 3.99.572 5.837c.272 1.016 1.074 1.819 2.09 2.09C4.44 20.5 12 20.5 12 20.5s7.56 0 9.408-.573c1.016-.272 1.819-1.074 2.09-2.09C24 15.99 24 12 24 12s0-3.99-.572-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                        </a>
                        {/* Instagram Link */}
                        <a href="https://www.instagram.com/snuqxbaik?igsh=MWZmcGcxYW40Zm9sMA==" target="_blank" rel="noopener noreferrer" className="social-btn instagram" aria-label="Instagram">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                            </svg>
                        </a>
                    </footer>

                    {/* Views Counter (Bottom Left) */}
                    <div className="views-counter">
                        {/* Eye Icon */}
                        <svg className="eye-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                        <span id="views-count">{viewsCount}</span>
                    </div>

                </main>
                
            </div>

            {/* Hidden YouTube Audio Player Container */}
            <div id="yt-player" style={{ display: 'none' }}></div>
        </>
    );
}
