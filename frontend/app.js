"use strict";


const state = {
    selectedTime: 30,
    quest: null,
    mode: "gemma"
};


const elements = {
    home: document.getElementById("home"),
    quest: document.getElementById("quest"),
    adventure: document.getElementById("adventure"),
    found: document.getElementById("found"),
    complete: document.getElementById("complete"),

    gemmaButton: document.getElementById("gemmaButton"),
    offlineButton: document.getElementById("offlineButton"),

    timePicker: document.getElementById("timePicker"),

    questTitle: document.getElementById("questTitle"),
    questTime: document.getElementById("questTime"),
    steps: document.getElementById("steps"),

    modeBadge: document.getElementById("modeBadge"),

    backButton: document.getElementById("backButton"),
    startAdventureButton:
        document.getElementById("startAdventureButton"),

    foundSomethingButton:
        document.getElementById("foundSomethingButton"),

    finishButton:
        document.getElementById("finishButton"),

    backToAdventureButton:
        document.getElementById("backToAdventureButton"),

    newQuestButton:
        document.getElementById("newQuestButton"),

    toast: document.getElementById("toast")
};


function showScreen(screen) {

    const screens = [
        elements.home,
        elements.quest,
        elements.adventure,
        elements.found,
        elements.complete
    ];

    screens.forEach(item => {
        item.hidden = item !== screen;
    });

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}


function showToast(message) {

    elements.toast.textContent = message;
    elements.toast.classList.add("visible");

    window.clearTimeout(showToast.timeout);

    showToast.timeout = window.setTimeout(() => {
        elements.toast.classList.remove("visible");
    }, 3000);
}


function setMode(mode) {

    state.mode = mode;

    if (mode === "offline-demo") {

        elements.modeBadge.textContent =
            "📱 OFFLINE DEMO";

        elements.modeBadge.className =
            "mode-badge offline";

    } else {

        elements.modeBadge.textContent =
            "✨ GEMMA";

        elements.modeBadge.className =
            "mode-badge gemma";
    }
}


function selectTime(minutes) {

    state.selectedTime = minutes;

    const buttons =
        elements.timePicker.querySelectorAll("button");

    buttons.forEach(button => {

        const value =
            Number(button.dataset.time);

        button.classList.toggle(
            "selected",
            value === minutes
        );
    });
}


function getOfflineQuest() {

    return (
        DEMO_QUESTS[state.selectedTime] ||
        DEMO_QUESTS[30]
    );
}


function saveQuest(quest, mode) {

    localStorage.setItem(
        "touchGrass.quest",
        JSON.stringify(quest)
    );

    localStorage.setItem(
        "touchGrass.mode",
        mode
    );

    localStorage.setItem(
        "touchGrass.savedAt",
        new Date().toISOString()
    );
}


function loadSavedQuest() {

    try {

        const raw =
            localStorage.getItem("touchGrass.quest");

        if (!raw) {
            return null;
        }

        return JSON.parse(raw);

    } catch (error) {

        console.warn(
            "Saved quest could not be loaded.",
            error
        );

        return null;
    }
}


function renderQuest(quest, mode) {

    state.quest = quest;

    setMode(mode);

    elements.questTitle.textContent =
        quest.title;

    elements.questTime.textContent =
        `${quest.total_minutes} MINUTES`;

    elements.steps.innerHTML = "";

    quest.steps.forEach((step, index) => {

        const card =
            document.createElement("article");

        card.className = "quest-step";

        const iconMap = {
            walk: "🚶",
            discover: "🌿",
            pause: "🧘",
            observe: "👀",
            return: "↩️"
        };

        const icon =
            iconMap[step.type] || "🌱";

        card.innerHTML = `
            <div class="step-icon">
                ${icon}
            </div>

            <div class="step-number">
                ${index + 1}
            </div>

            <div class="step-content">

                <div class="step-minutes">
                    ${step.minutes} min
                </div>

                <div class="step-instruction">
                    ${escapeHtml(step.instruction)}
                </div>

            </div>
        `;

        elements.steps.appendChild(card);
    });

    showScreen(elements.quest);
}


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent = String(value);

    return div.innerHTML;
}


function startOfflineDemo() {

    const quest = getOfflineQuest();

    saveQuest(
        quest,
        "offline-demo"
    );

    renderQuest(
        quest,
        "offline-demo"
    );

    showToast(
        "Offline mode: no model or internet used."
    );
}


async function startGemmaQuest() {

    elements.gemmaButton.disabled = true;

    elements.gemmaButton.innerHTML =
        "<span>🧠</span> CREATING QUEST...";

    try {

        const location =
            await getLocation();

        const response =
            await fetch(
                "/api/quest",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        time_minutes:
                        state.selectedTime,

                        location: {
                            lat: location.latitude,
                            lng: location.longitude
                        },

                        mood: "curious",
                        difficulty: "easy"
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                "Gemma service unavailable."
            );
        }

        const data =
            await response.json();

        if (
            !data.success ||
            !data.quest
        ) {
            throw new Error(
                "Invalid quest response."
            );
        }

        saveQuest(
            data.quest,
            "gemma"
        );

        renderQuest(
            data.quest,
            "gemma"
        );

    } catch (error) {

        console.warn(
            "Gemma mode failed:",
            error
        );

        showToast(
            "Gemma is unavailable. Loading offline demo."
        );

        window.setTimeout(() => {

            startOfflineDemo();

        }, 500);

    } finally {

        elements.gemmaButton.disabled = false;

        elements.gemmaButton.innerHTML =
            "<span>✨</span> CREATE WITH GEMMA";
    }
}


function getLocation() {

    return new Promise(
        (resolve, reject) => {

            if (!navigator.geolocation) {

                reject(
                    new Error(
                        "Geolocation is not supported."
                    )
                );

                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {

                    resolve({
                        latitude:
                        position.coords.latitude,

                        longitude:
                        position.coords.longitude
                    });

                },

                error => {

                    reject(error);
                },

                {
                    enableHighAccuracy: false,
                    timeout: 8000,
                    maximumAge: 300000
                }
            );
        }
    );
}


function beginAdventure() {

    showScreen(
        elements.adventure
    );

    showToast(
        "Quest started. Put your phone away."
    );
}


function showFoundSomething() {

    showScreen(
        elements.found
    );
}


function returnToAdventure() {

    showScreen(
        elements.adventure
    );
}


function finishQuest() {

    localStorage.removeItem(
        "touchGrass.quest"
    );

    localStorage.removeItem(
        "touchGrass.mode"
    );

    showScreen(
        elements.complete
    );
}


function newQuest() {

    state.quest = null;

    showScreen(
        elements.home
    );
}


function backToHome() {

    showScreen(
        elements.home
    );
}


function registerServiceWorker() {

    if (!("serviceWorker" in navigator)) {
        return;
    }

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("/sw.js")
                .then(() => {
                    console.log(
                        "Touch Grass offline shell ready."
                    );
                })
                .catch(error => {
                    console.warn(
                        "Service worker registration failed:",
                        error
                    );
                });
        }
    );
}


/*
 * Event listeners
 */

elements.timePicker
    .querySelectorAll("button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                selectTime(
                    Number(button.dataset.time)
                );
            }
        );
    });


elements.gemmaButton
    .addEventListener(
        "click",
        startGemmaQuest
    );


elements.offlineButton
    .addEventListener(
        "click",
        startOfflineDemo
    );


elements.backButton
    .addEventListener(
        "click",
        backToHome
    );


elements.startAdventureButton
    .addEventListener(
        "click",
        beginAdventure
    );


elements.foundSomethingButton
    .addEventListener(
        "click",
        showFoundSomething
    );


elements.backToAdventureButton
    .addEventListener(
        "click",
        returnToAdventure
    );


elements.finishButton
    .addEventListener(
        "click",
        finishQuest
    );


elements.newQuestButton
    .addEventListener(
        "click",
        newQuest
    );


/*
 * Restore a saved quest when the app opens.
 */

const savedQuest = loadSavedQuest();

if (savedQuest) {

    const savedMode =
        localStorage.getItem(
            "touchGrass.mode"
        ) || "offline-demo";

    state.quest = savedQuest;

    console.log(
        "Saved quest available:",
        savedMode
    );
}


/*
 * Start PWA functionality.
 */

registerServiceWorker();
