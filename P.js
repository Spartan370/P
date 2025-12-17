// ==UserScript==
// @name         SoundCloud Spotify-Style Fullscreen
// @namespace    sc-spotify-fs
// @version      1.1.0
// @description  Spotify-like fullscreen SoundCloud player (stable & defensive)
// @match        https://soundcloud.com/*
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    let overlay, audio, progressFill;
    let visible = false;

    function getAudio() {
        return document.querySelector('audio');
    }

    function getTrack() {
        const title =
            document.querySelector('.playbackSoundBadge__titleLink span')?.textContent ||
            'Unknown Track';
        const artist =
            document.querySelector('.playbackSoundBadge__lightLink')?.textContent ||
            'Unknown Artist';
        const artwork =
            document.querySelector('.playbackSoundBadge__avatar span')?.style
                .backgroundImage?.slice(5, -2);

        return { title, artist, artwork };
    }

    function buildUI() {
        overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: #000;
            display: none;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            color: white;
        `;

        const bg = document.createElement('div');
        bg.id = 'sc-bg';
        bg.style.cssText = `
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center;
            filter: blur(40px) brightness(0.45);
            transform: scale(1.1);
        `;

        const center = document.createElement('div');
        center.style.cssText = `
            position: relative;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 24px;
        `;

        const art = document.createElement('img');
        art.id = 'sc-art';
        art.style.cssText = `
            width: 320px;
            height: 320px;
            object-fit: cover;
            border-radius: 6px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        `;

        const title = document.createElement('div');
        title.id = 'sc-title';
        title.style.cssText = `
            font-size: 26px;
            font-weight: 600;
            text-align: center;
        `;

        const artist = document.createElement('div');
        artist.id = 'sc-artist';
        artist.style.cssText = `
            font-size: 16px;
            opacity: 0.7;
            text-align: center;
        `;

        const progress = document.createElement('div');
        progress.style.cssText = `
            width: 60%;
            height: 6px;
            background: rgba(255,255,255,0.25);
            border-radius: 3px;
            cursor: pointer;
        `;

        progressFill = document.createElement('div');
        progressFill.style.cssText = `
            height: 100%;
            width: 0%;
            background: white;
            border-radius: 3px;
        `;

        progress.appendChild(progressFill);

        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            gap: 40px;
            align-items: center;
            margin-top: 10px;
        `;

        function btn(label, fn) {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = `
                background: none;
                border: none;
                color: white;
                font-size: 28px;
                cursor: pointer;
                opacity: 0.85;
            `;
            b.onclick = fn;
            return b;
        }

        controls.append(
            btn('⏮', () => audio.currentTime = Math.max(0, audio.currentTime - 10)),
            btn('⏯', () => audio.paused ? audio.play() : audio.pause()),
            btn('⏭', () => audio.currentTime = Math.min(audio.duration, audio.currentTime + 10))
        );

        center.append(art, title, artist, progress, controls);
        overlay.append(bg, center);
        document.body.appendChild(overlay);

        progress.onclick = e => {
            const r = progress.getBoundingClientRect();
            audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
        };
    }

    function openFS(autoplay = false) {
        audio = getAudio();
        if (!audio) return;

        if (!overlay) buildUI();

        const t = getTrack();
        overlay.querySelector('#sc-bg').style.backgroundImage = `url(${t.artwork})`;
        overlay.querySelector('#sc-art').src = t.artwork;
        overlay.querySelector('#sc-title').textContent = t.title;
        overlay.querySelector('#sc-artist').textContent = t.artist;

        overlay.style.display = 'block';
        overlay.requestFullscreen?.();
        visible = true;

        if (autoplay && audio.paused) audio.play();

        audio.ontimeupdate = () => {
            if (!audio.duration) return;
            progressFill.style.width =
                (audio.currentTime / audio.duration) * 100 + '%';
        };
    }

    function closeFS() {
        overlay.style.display = 'none';
        document.fullscreenElement && document.exitFullscreen();
        visible = false;
    }

    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'f') {
            visible ? closeFS() : openFS();
        }
    });

    GM_registerMenuCommand('Spotify-Style Fullscreen', () => openFS());
    GM_registerMenuCommand('Spotify-Style Fullscreen (Autoplay)', () => openFS(true));

    setInterval(() => {
        const bar = document.querySelector('.playControls__elements');
        if (!bar || bar.querySelector('.sc-spotify-btn')) return;

        const b = document.createElement('button');
        b.textContent = '⛶';
        b.className = 'sc-spotify-btn';
        b.style.cssText = `
            background: none;
            border: none;
            font-size: 18px;
            color: #999;
            cursor: pointer;
        `;
        b.onclick = () => openFS();
        bar.appendChild(b);
    }, 2000);
})();
