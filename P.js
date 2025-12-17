// ==UserScript==
// @name         SoundCloud Fullscreen Spotify View
// @namespace    scfs.spotify
// @version      2.0.0
// @match        https://soundcloud.com/*
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
    let ui, audio, state = { open: false }, refs = {};

    const q = s => document.querySelector(s);

    const waitForAudio = () =>
        new Promise(r => {
            const i = setInterval(() => {
                const a = q('audio');
                if (a) {
                    clearInterval(i);
                    r(a);
                }
            }, 300);
        });

    const trackInfo = () => {
        const t = q('a.playbackSoundBadge__titleLink span')?.textContent || '';
        const a = q('a.playbackSoundBadge__lightLink')?.textContent || '';
        const art = q('.playbackSoundBadge__avatar span')?.style.backgroundImage || '';
        return {
            title: t,
            artist: a,
            art: art.startsWith('url') ? art.slice(5, -2) : ''
        };
    };

    const build = () => {
        ui = document.createElement('div');
        ui.style.cssText = `
            position:fixed;inset:0;z-index:999999;
            display:none;background:#000;color:#fff;
            font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif
        `;

        const bg = document.createElement('div');
        bg.style.cssText = `
            position:absolute;inset:0;
            background-size:cover;background-position:center;
            filter:blur(45px) brightness(.45);
            transform:scale(1.15)
        `;

        const wrap = document.createElement('div');
        wrap.style.cssText = `
            position:relative;height:100%;
            display:flex;flex-direction:column;
            align-items:center;justify-content:center;
            gap:22px
        `;

        const art = document.createElement('img');
        art.style.cssText = `
            width:320px;height:320px;
            object-fit:cover;border-radius:6px;
            box-shadow:0 30px 80px rgba(0,0,0,.65)
        `;

        const title = document.createElement('div');
        title.style.cssText = `font-size:26px;font-weight:600;text-align:center`;

        const artist = document.createElement('div');
        artist.style.cssText = `font-size:16px;opacity:.7;text-align:center`;

        const bar = document.createElement('div');
        bar.style.cssText = `
            width:60%;height:6px;
            background:rgba(255,255,255,.25);
            border-radius:3px;cursor:pointer
        `;

        const fill = document.createElement('div');
        fill.style.cssText = `
            height:100%;width:0%;
            background:#fff;border-radius:3px
        `;

        bar.appendChild(fill);

        const ctrls = document.createElement('div');
        ctrls.style.cssText = `
            display:flex;gap:42px;
            align-items:center;margin-top:10px
        `;

        const btn = (txt, fn) => {
            const b = document.createElement('button');
            b.textContent = txt;
            b.style.cssText = `
                background:none;border:none;
                color:#fff;font-size:28px;
                cursor:pointer;opacity:.85
            `;
            b.onclick = fn;
            return b;
        };

        ctrls.append(
            btn('⏮', () => audio.currentTime = Math.max(0, audio.currentTime - 10)),
            btn('⏯', () => audio.paused ? audio.play() : audio.pause()),
            btn('⏭', () => audio.currentTime = Math.min(audio.duration, audio.currentTime + 10))
        );

        wrap.append(art, title, artist, bar, ctrls);
        ui.append(bg, wrap);
        document.body.appendChild(ui);

        refs = { bg, art, title, artist, bar, fill };

        bar.onclick = e => {
            const r = bar.getBoundingClientRect();
            audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
        };
    };

    const open = async autoplay => {
        if (state.open) return;
        audio = audio || await waitForAudio();
        if (!ui) build();

        const t = trackInfo();
        refs.bg.style.backgroundImage = `url(${t.art})`;
        refs.art.src = t.art;
        refs.title.textContent = t.title;
        refs.artist.textContent = t.artist;

        ui.style.display = 'block';
        state.open = true;

        if (autoplay && audio.paused) audio.play();

        ui.requestFullscreen?.().catch(() => {});

        audio.ontimeupdate = () => {
            if (!audio.duration) return;
            refs.fill.style.width = (audio.currentTime / audio.duration) * 100 + '%';
        };
    };

    const close = () => {
        if (!state.open) return;
        ui.style.display = 'none';
        state.open = false;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };

    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'f') {
            state.open ? close() : open(false);
        }
        if (state.open && e.key === 'Escape') close();
    });

    GM_registerMenuCommand('Fullscreen Player', () => open(false));
    GM_registerMenuCommand('Fullscreen Player (Autoplay)', () => open(true));

    const inject = setInterval(() => {
        const host = q('.playControls__elements');
        if (!host || host.querySelector('.scfs-btn')) return;

        const b = document.createElement('button');
        b.textContent = '⛶';
        b.className = 'scfs-btn';
        b.style.cssText = `
            background:none;border:none;
            font-size:18px;color:#999;
            cursor:pointer
        `;
        b.onclick = () => open(false);
        host.appendChild(b);
    }, 1000);
})();
