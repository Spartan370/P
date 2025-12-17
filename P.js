// ==UserScript==
// @name         SoundCloud Full-Screen Viewer (Advanced Pro)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  A highly resilient, advanced, and feature-rich full-screen viewer activated by menu command.
// @author       ConnorM
// @match        https://soundcloud.com/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const SC_PLAYER_SELECTOR = '.playControls__player'; 
    const SC_TRACK_TITLE_SELECTOR = '.playbackSoundBadge__titleLink';
    const SC_ARTIST_NAME_SELECTOR = '.playbackSoundBadge__titleContext';
    const SC_ALBUM_ART_SELECTOR = '.image__full';
    const SC_PROGRESS_BAR_WRAPPER_SELECTOR = '.playbackTimeline__progressWrapper';
    const SC_PROGRESS_BAR_CONTAINER_SELECTOR = '.playbackTimeline__progressContainer'; 
    const SC_CONTROL_GROUP_SELECTOR = '.playControls__panel .playControls__controlGroup:nth-child(2)'; 
    const SC_VOLUME_CONTROL_SELECTOR = '.volume__sliderWrapper';
    const SC_TIME_CURRENT_SELECTOR = '.playbackTimeline__timePassed span:first-child';
    const SC_TIME_DURATION_SELECTOR = '.playbackTimeline__timeTotal span:last-child';

    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                return resolve(element);
            }

            const observer = new MutationObserver((mutationsList, observer) => {
                const target = document.querySelector(selector);
                if (target) {
                    observer.disconnect();
                    resolve(target);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                const finalTarget = document.querySelector(selector);
                if (finalTarget) {
                    resolve(finalTarget);
                } else {
                    reject(new Error(`Element not found within timeout: ${selector}`));
                }
            }, timeout);
        });
    }

    class SCPlayerApp {
        constructor() {
            this.playerElement = null;
            this.isShowing = false;
            this.isMenuActivated = false;
            this.animationFrameId = null;
            this.isInitializing = true;

            this.injectStyles();
            this.initApplication();
        }

        async initApplication() {
            try {
                this.playerElement = await waitForElement(SC_PLAYER_SELECTOR);
                this.createUI();
                this.setupMenuCommands();
                this.observePlayerChanges();
                this.isInitializing = false;
            } catch (error) {
            }
        }

        createUI() {
            this.fsContainer = document.createElement('div');
            this.fsContainer.id = 'sc-fullscreen-viewer';
            this.fsContainer.innerHTML = `
                <div id="sc-fs-background"></div>
                <div id="sc-fs-content">
                    <button id="sc-fs-close-btn" title="Exit Full Screen">✕</button>
                    
                    <div id="sc-fs-visuals">
                        <div id="sc-fs-art-loader"></div>
                        <img id="sc-fs-album-art" alt="Album Art">
                    </div>
                    
                    <div id="sc-fs-info">
                        <h1 id="sc-fs-track-title"></h1>
                        <h2 id="sc-fs-track-artist"></h2>
                    </div>
                    
                    <div id="sc-fs-track-times">
                        <span id="sc-fs-time-current">0:00</span>
                        <span id="sc-fs-time-total">0:00</span>
                    </div>

                    <div id="sc-fs-progress">
                        <div id="sc-fs-progress-bar"></div>
                    </div>
                    
                    <div id="sc-fs-controls">
                    </div>
                    
                    <div id="sc-fs-volume">
                    </div>
                </div>
            `;
            document.body.appendChild(this.fsContainer);

            this.closeButton = document.getElementById('sc-fs-close-btn');
            this.albumArt = document.getElementById('sc-fs-album-art');
            this.artLoader = document.getElementById('sc-fs-art-loader');
            this.trackTitle = document.getElementById('sc-fs-track-title');
            this.trackArtist = document.getElementById('sc-fs-track-artist');
            this.fsBackground = document.getElementById('sc-fs-background');
            this.fsControls = document.getElementById('sc-fs-controls');
            this.fsVolume = document.getElementById('sc-fs-volume');
            this.fsProgress = document.getElementById('sc-fs-progress');
            this.fsProgressBar = document.getElementById('sc-fs-progress-bar');
            this.fsTimeCurrent = document.getElementById('sc-fs-time-current');
            this.fsTimeTotal = document.getElementById('sc-fs-time-total');
            
            this.closeButton.addEventListener('click', () => {
                if (this.isMenuActivated) {
                    this.hide(); 
                } else {
                    this.hideAndDeactivateMenu();
                }
            });
            
            this.fsProgress.addEventListener('click', (e) => this.handleProgressClick(e));
        }
        
        setupMenuCommands() {
            GM_registerMenuCommand('Activate Full-Screen Viewer', () => this.showAndActivateMenu());
            GM_registerMenuCommand('Deactivate Full-Screen Viewer', () => this.hideAndDeactivateMenu());
        }

        observePlayerChanges() {
            const config = { childList: true, subtree: true, attributes: true, characterData: true };
            this.observer = new MutationObserver(() => {
                this.updateUI();
                if (this.isMenuActivated && !this.isShowing) {
                    this.show();
                }
            });
            this.observer.observe(this.playerElement, config);
            this.updateUI(); 
        }

        updateUI() {
            const artElement = this.playerElement.querySelector(SC_ALBUM_ART_SELECTOR);
            const titleElement = this.playerElement.querySelector(SC_TRACK_TITLE_SELECTOR);
            const artistElement = this.playerElement.querySelector(SC_ARTIST_NAME_SELECTOR);

            this.artLoader.classList.add('is-loading');
            this.albumArt.classList.remove('is-loaded');

            this.trackTitle.textContent = titleElement ? titleElement.textContent.trim() : 'Unknown Track';
            this.trackArtist.textContent = artistElement ? artistElement.textContent.trim() : 'Unknown Artist';
            this.fsTimeCurrent.textContent = this.playerElement.querySelector(SC_TIME_CURRENT_SELECTOR)?.textContent || '0:00';
            this.fsTimeTotal.textContent = this.playerElement.querySelector(SC_TIME_DURATION_SELECTOR)?.textContent || '0:00';

            let artUrl = ''; 
            if (artElement) {
                const originalUrl = artElement.style.backgroundImage || artElement.src;
                artUrl = originalUrl.replace('120x120', '500x500').replace('50x50', '500x500');
            }
            
            this.albumArt.onload = () => {
                this.artLoader.classList.remove('is-loading');
                this.albumArt.classList.add('is-loaded');
            };
            this.albumArt.src = artUrl;
            this.fsBackground.style.backgroundImage = `url(${artUrl})`;

            this.mirrorControls(SC_CONTROL_GROUP_SELECTOR, this.fsControls, 'sc-fs-main-controls');
            this.mirrorControls(SC_VOLUME_CONTROL_SELECTOR, this.fsVolume, 'sc-fs-volume-control');
        }

        handleProgressClick(e) {
            const scProgressContainer = this.playerElement.querySelector(SC_PROGRESS_BAR_CONTAINER_SELECTOR);
            if (!scProgressContainer) return;

            const progressRect = this.fsProgress.getBoundingClientRect();
            const originalRect = scProgressContainer.getBoundingClientRect();

            const clickX = e.clientX;
            const percentage = (clickX - progressRect.left) / progressRect.width;

            const originalClickX = originalRect.left + (percentage * originalRect.width);
            const originalClickY = originalRect.top + (originalRect.height / 2);

            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: originalClickX,
                clientY: originalClickY,
            });

            scProgressContainer.dispatchEvent(clickEvent);
        }


        mirrorControls(sourceSelector, targetElement, customClass) {
            const sourceElement = this.playerElement.querySelector(sourceSelector);
            if (sourceElement) {
                targetElement.innerHTML = '';
                const clonedControls = sourceElement.cloneNode(true);
                clonedControls.classList.add(customClass);
                
                clonedControls.classList.remove('volume', 'volume__sliderWrapper', 'playControls__controlGroup');
                
                targetElement.appendChild(clonedControls);
            }
        }

        show() {
            if (this.isShowing || this.isInitializing) return;
            this.updateUI(); 
            this.fsContainer.classList.add('is-active');
            this.isShowing = true;
            document.body.style.overflow = 'hidden'; 
            this.startProgressSync();
        }

        hide() {
            if (!this.isShowing) return;
            this.fsContainer.classList.remove('is-active');
            this.isShowing = false;
            document.body.style.overflow = ''; 
            this.stopProgressSync();
        }
        
        showAndActivateMenu() {
            this.isMenuActivated = true;
            this.show();
        }

        hideAndDeactivateMenu() {
            this.isMenuActivated = false;
            this.hide();
        }

        startProgressSync = () => {
            const progressWrapper = this.playerElement.querySelector(SC_PROGRESS_BAR_WRAPPER_SELECTOR);

            if (progressWrapper) {
                const scProgressElement = progressWrapper.querySelector('.playbackTimeline__progressWrapper span:nth-child(2)');

                if (scProgressElement) {
                    const scProgressWidth = scProgressElement.style.width;
                    this.fsProgressBar.style.width = scProgressWidth;

                    this.fsTimeCurrent.textContent = this.playerElement.querySelector(SC_TIME_CURRENT_SELECTOR)?.textContent || '0:00';
                }
            }

            this.animationFrameId = window.requestAnimationFrame(this.startProgressSync);
        }

        stopProgressSync() {
            if (this.animationFrameId) {
                window.cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }

        injectStyles() {
            const css = `
                :root {
                    --sc-orange: #ff5500;
                    --fs-bg-overlay: rgba(0, 0, 0, 0.4);
                    --fs-max-width: 700px;
                }

                #sc-fullscreen-viewer {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    z-index: 99999; 
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.5s ease-in-out, visibility 0.5s;
                    color: #fff;
                    font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(10px);
                }

                #sc-fullscreen-viewer.is-active {
                    opacity: 1;
                    visibility: visible;
                }

                #sc-fs-background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-size: cover;
                    background-position: center;
                    filter: blur(80px) brightness(0.4); 
                    transform: scale(1.1); 
                    transition: all 0.8s ease-in-out;
                    background-color: var(--fs-bg-overlay);
                }

                #sc-fs-content {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    background-color: rgba(0, 0, 0, 0.3); 
                    box-sizing: border-box;
                    max-width: 100vw;
                }
                
                #sc-fs-close-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: none;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    color: #fff;
                    font-size: 20px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    line-height: 1;
                    transition: all 0.2s ease-in-out;
                    z-index: 100;
                    outline: none;
                }
                #sc-fs-close-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    border-color: #fff;
                }

                #sc-fs-visuals {
                    position: relative;
                    width: 40vh; 
                    max-width: 400px;
                    min-width: 200px;
                    height: auto;
                    aspect-ratio: 1 / 1;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    border-radius: 8px; 
                    margin-bottom: 5vh;
                    transition: transform 0.3s ease-in-out;
                    overflow: hidden;
                }
                #sc-fs-visuals:hover {
                    transform: scale(1.02);
                }
                
                #sc-fs-art-loader {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.1); 
                    animation: pulse 1.5s infinite ease-in-out;
                    z-index: 5;
                    opacity: 0;
                    transition: opacity 0.5s;
                }
                #sc-fs-art-loader.is-loading {
                    opacity: 1;
                }

                #sc-fs-album-art {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 8px;
                    display: block;
                    opacity: 0;
                    transition: opacity 0.5s;
                }
                #sc-fs-album-art.is-loaded {
                    opacity: 1;
                }

                @keyframes pulse {
                    0% { opacity: 0.1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 0.1; }
                }

                #sc-fs-info {
                    text-align: center;
                    max-width: var(--fs-max-width);
                    width: 100%;
                }
                #sc-fs-track-title {
                    font-size: clamp(2rem, 5vw, 3.5rem); 
                    font-weight: 900;
                    margin: 0;
                    line-height: 1.2;
                }
                #sc-fs-track-artist {
                    font-size: clamp(1.2rem, 3vw, 2rem);
                    font-weight: 300;
                    margin: 0.5vh 0 0 0;
                    color: rgba(255, 255, 255, 0.7);
                }
                
                #sc-fs-track-times {
                    width: 100%;
                    max-width: var(--fs-max-width);
                    display: flex;
                    justify-content: space-between;
                    font-size: 1rem;
                    color: rgba(255, 255, 255, 0.8);
                    margin-top: 10px;
                }

                #sc-fs-progress {
                    width: 100%;
                    max-width: var(--fs-max-width);
                    height: 6px; 
                    background-color: rgba(255, 255, 255, 0.3);
                    border-radius: 3px;
                    cursor: pointer;
                    margin-bottom: 4vh;
                    transition: height 0.1s;
                }
                #sc-fs-progress:hover {
                    height: 12px;
                }

                #sc-fs-progress-bar {
                    height: 100%;
                    width: 0%; 
                    background-color: var(--sc-orange); 
                    border-radius: 3px;
                    transition: width 0.1s linear; 
                }

                #sc-fs-controls {
                    width: 100%;
                    max-width: var(--fs-max-width);
                    margin-bottom: 4vh;
                }

                .sc-fs-main-controls {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 50px; 
                }
                .sc-fs-main-controls button {
                    transform: scale(2.8); 
                    transition: transform 0.15s ease-in-out;
                    opacity: 0.9;
                }
                .sc-fs-main-controls button:hover {
                    transform: scale(3.2);
                    opacity: 1;
                }
                
                #sc-fs-volume {
                    width: 100%;
                    max-width: var(--fs-max-width);
                    display: flex;
                    justify-content: center;
                }
                .sc-fs-volume-control {
                    width: 40%;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    transform: scale(1.5); 
                    opacity: 0.7;
                    padding-left: 20px;
                }
                .sc-fs-volume-control:hover {
                     opacity: 1;
                }

                @media (max-width: 768px) {
                    #sc-fs-content {
                        justify-content: flex-start;
                        padding-top: 60px;
                    }
                    #sc-fs-visuals {
                        width: 50vw;
                        max-width: 300px;
                        margin-bottom: 3vh;
                    }
                    #sc-fs-controls .sc-fs-main-controls button {
                        transform: scale(2.0);
                    }
                    .sc-fs-volume-control {
                        transform: scale(1.2);
                    }
                }
            `;
            GM_addStyle(css);
        }
    }

    new SCPlayerApp();

})();
