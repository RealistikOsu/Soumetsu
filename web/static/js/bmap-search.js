// The RealistikOsu beatmap search!
// Credits to Kaimi for this rewrite!
const beatmapAudios = [];
const searchSettings = {
    mode: 0,
    status: 1,
    offset: 0,
    amount: 20
};

let beatmapTimer;

const mirror_api = "https://osu.direct/api"; // we rlly do need our own

function buttons() {
    const modes = document.querySelectorAll("#mode-button");
    const status = document.querySelectorAll("#status-button");
    let typeTimer;

    for (const elm of modes) {
        elm.addEventListener("click", function () {
            for (const others of modes) {
                others.classList.remove("bg-primary", "border-primary", "text-white", "shadow-lg", "shadow-primary/25");
                others.classList.add("bg-dark-bg", "border-dark-border", "text-gray-300");
            };

            this.classList.remove("bg-dark-bg", "border-dark-border", "text-gray-300");
            this.classList.add("bg-primary", "border-primary", "text-white", "shadow-lg", "shadow-primary/25");
            searchSettings.mode = this.dataset.modeosu;

            search(searchSettings, 0, false);
        });
    };

    for (const elm of status) {
        elm.addEventListener("click", function () {
            for (const others of status) {
                others.classList.remove("bg-primary", "border-primary", "text-white", "shadow-lg", "shadow-primary/25");
                others.classList.add("bg-dark-bg", "border-dark-border", "text-gray-300");
            };

            this.classList.remove("bg-dark-bg", "border-dark-border", "text-gray-300");
            this.classList.add("bg-primary", "border-primary", "text-white", "shadow-lg", "shadow-primary/25");
            searchSettings.status = this.dataset.rankstatus;

            search(searchSettings, 0, false);
        });
    };

    document.querySelector("#searchTerms").addEventListener("keyup", () => {
        clearTimeout(typeTimer);
        typeTimer = setTimeout(() => {
            search(searchSettings, 0, false);
        }, 1000);
    });

    document.querySelector("#searchTerms").addEventListener("keydown", () => {
        clearTimeout(typeTimer);
    });

    document.querySelector("a[data-modeosu='0']").classList.remove("bg-dark-bg", "border-dark-border", "text-gray-300");
    document.querySelector("a[data-modeosu='0']").classList.add("bg-primary", "border-primary", "text-white", "shadow-lg", "shadow-primary/25");
    document.querySelector("a[data-rankstatus='1']").classList.remove("bg-dark-bg", "border-dark-border", "text-gray-300");
    document.querySelector("a[data-rankstatus='1']").classList.add("bg-primary", "border-primary", "text-white", "shadow-lg", "shadow-primary/25");
};

function toggleBeatmap(id, elm) {
    // Stop all other playing beatmaps
    for (const map of document.querySelectorAll(".beatmapPlay")) {
        map.innerHTML = '<i class="fas fa-play text-white text-5xl"></i>';
    }
    for (const map of document.querySelectorAll(".card")) {
        map.classList.remove("musicPlaying");
    }

    if (beatmapTimer) {clearInterval(beatmapTimer);}

    for (const item of beatmapAudios) {
        if (item.id == id) {
            if (!item.playing) {
                item.audio.volume = 0.2;
                item.audio.currentTime = 0;
                item.audio.play();

                elm.innerHTML = '<i class="fas fa-stop text-white text-5xl"></i>';
                elm.closest(".card").classList.add("musicPlaying");

                const audio = item.audio;
                beatmapTimer = setInterval(() => {
                    const played = 100 * audio.currentTime / audio.duration;

                    document.querySelector("#progressCSS").innerHTML = `
                        .musicPlaying::after {
                            width: ${played.toFixed(2)}%;
                        }
                    `;
                    if (audio.currentTime == audio.duration) {
                        // Beatmap has finished playing.
                        audio.currentTime = 0;
                        item.playing = false;
                        elm.innerHTML = '<i class="fas fa-play text-white text-5xl"></i>';
                        elm.closest(".card").classList.remove("musicPlaying");
                    }
                }, 1);
            } else {
                item.audio.pause();

                elm.innerHTML = '<i class="fas fa-play text-white text-5xl"></i>';
                elm.closest(".card").classList.remove("musicPlaying");
            }

            item.playing = !item.playing;
        } else {
            item.audio.currentTime = 0;
            item.audio.pause();
            item.playing = false;
        }
    }
};

async function search(options, offset = 0, r = false) {
    //console.log(`searching mode ${options.mode} with a status of ${options.status} and query ${options.terms}`);

    const querys = encodeURI(document.querySelector("#searchTerms").value) || "";
    const Mode = ["osu", "taiko", "fruits", "mania"];
    const Status = {
        "-2": "Graveyard",
        "-1": "WIP",
        "0": "Pending",
        "1": "Ranked",
        "3": "Qualified",
        "4": "Loved"
    };

    const Colours = {
        "138, 174, 23": [0.0, 1.99],
        "154, 212, 223": [2.0, 2.69],
        "222, 179, 42": [2.7, 3.99],
        "235, 105, 164": [4.0, 5.29],
        "114, 100, 181": [5.3, 6.49],
        "5, 5, 5": [6.5, Infinity],
    };

    const sources = [
        { name: "RealistikOsu", mirror: "https://ussr.pl/d/" },
        { name: "Beatconnect", mirror: "https://beatconnect.io/b/" },
        { name: "Mino", mirror: "https://catboy.best/d/" },
        { name: "osu.direct", mirror: "https://osu.direct/d/" },
    ];

    options.offset = (r ? options.offset + offset : 0);
    if (!r) {
        document.querySelector("#maps").innerHTML = "";
        document.querySelector("#loading-state").classList.remove("hidden");
        document.querySelector("#empty-state").classList.add("hidden");
    }

    /*
        Green Easy: 0.0*–1.99* up 0.5
        color: rgb(138, 174, 23);

        Blue Normal: 2.0*–2.69* up 0.45
        color: rgb(154, 212, 223);

        Yellow Hard: 2.7*–3.99* up 0.25
        color: rgb(222, 179, 42);

        Pink Insane: 4.0*–5.29* up 0.05
        color: rgb(235, 105, 164);

        Purple Expert: 5.3*–6.49* up 0.05
        color: rgb(114, 100, 181);

        Black Expert+: >6.5*
        color: rgb(5, 5, 5);
    */

    let link = `${mirror_api}/search?offset=${options.offset || 0}&amount=${options.amount || 20}&query=${querys}`
    if (options.mode != "NaN" && options.mode == "") {
        link += `&mode=`
    } else if (options.mode != "NaN") {
        link += `&mode=${options.mode || 0}`
    }

    if (options.status != "NaN") {
        link += `&status=${options.status || 0}`
    }

    let res;
    try {
        res = await fetch(link).then(o => o.json());
    }
    catch {
        document.querySelector("#loading-state").classList.add("hidden");
        if (typeof showMessage !== "undefined") {
            showMessage("error", "There has been an error while searching for beatmaps! Please notify a RealistikOsu developer!");
        }
        return;
    }

    document.querySelector("#loading-state").classList.add("hidden");

    if (res.length === 0 && !r) {
        document.querySelector("#empty-state").classList.remove("hidden");
        return;
    }

    document.querySelector("#empty-state").classList.add("hidden");


    // adding time :(
    //console.log(querys);
    //console.log(res);

    for (const beatmap of res) {
        const diffsHTML = [];
        // Bubble sort to sort diffs.
        const diffs = beatmap.ChildrenBeatmaps;
        diffs.sort(function (a, b) { return a.DifficultyRating - b.DifficultyRating });
        const date = new Date(beatmap.LastUpdate).toUTCString
        let mapSection = "";


        if (beatmapAudios.filter(o => o.id == beatmap.SetID).length == 0) {
            beatmapAudios.push({
                id: beatmap.SetID,
                audio: new Audio(`https://b.ppy.sh/preview/${beatmap.SetID}.mp3`),
                playing: false
            });
        };

        // Get status colour
        const statusColors = {
            "1": "bg-green-500/20 border-green-500/50 text-green-400",
            "3": "bg-blue-500/20 border-blue-500/50 text-blue-400",
            "4": "bg-pink-500/20 border-pink-500/50 text-pink-400",
            "0": "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
            "-1": "bg-orange-500/20 border-orange-500/50 text-orange-400",
            "-2": "bg-gray-500/20 border-gray-500/50 text-gray-400"
        };
        const statusColor = statusColors[beatmap.RankedStatus] || "bg-gray-500/20 border-gray-500/50 text-gray-400";

        mapSection += `
            <div class="card group relative overflow-hidden hover:scale-[1.02] transition-all cursor-pointer">
                <!-- Cover Image -->
                <div class="relative h-48 overflow-hidden bg-dark-bg">
                    <a href="/beatmaps/${beatmap.ChildrenBeatmaps[0].BeatmapID}">
                        <img src="https://assets.ppy.sh/beatmaps/${beatmap.SetID}/covers/cover.jpg"
                             alt="${beatmap.Title}"
                             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110">
                    </a>
                    <!-- Play Button Overlay -->
                    <button class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity beatmapPlay"
                            onclick="toggleBeatmap(${beatmap.SetID}, this)">
                        <i class="fas fa-play text-white text-5xl"></i>
                    </button>
                    <!-- Status Badge -->
                    <div class="absolute top-3 left-3">
                        <span class="px-3 py-1 rounded-full text-xs font-medium border ${statusColor}">
                            ${Status[beatmap.RankedStatus]}
                        </span>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-4">
                    <!-- Title & Artist -->
                    <div class="mb-3">
                        <a href="/beatmaps/${beatmap.ChildrenBeatmaps[0].BeatmapID}" class="block">
                            <h3 class="font-bold text-white text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                                ${beatmap.Title}
                            </h3>
                            <p class="text-gray-400 text-sm line-clamp-1">${beatmap.Artist}</p>
                        </a>
                    </div>

                    <!-- Creator -->
                    <div class="mb-3">
                        <p class="text-xs text-gray-500 mb-1">Mapped by</p>
                        <a href="https://osu.ppy.sh/u/${encodeURI(beatmap.Creator)}"
                           class="text-sm text-primary hover:underline font-medium">
                            ${beatmap.Creator}
                        </a>
                    </div>

                    <!-- Difficulties -->
                    <div class="mb-3">
                        <p class="text-xs text-gray-500 mb-2">Difficulties</p>
                        <div class="flex flex-wrap gap-1">
        `;

        for (const diff of diffs) {
            const sr = diff.DifficultyRating.toFixed(2);
            let colourOfChoice;

            for (const i in Colours) {
                if (sr >= Colours[i][0] && sr <= Colours[i][1]) {
                    colourOfChoice = i;
                };
            };

            diffsHTML.push(`
                <div class="relative group/diff">
                    <div class="faa fal fa-extra-mode-${Mode[beatmap.ChildrenBeatmaps[0].Mode]}"
                         style="color: rgb(${colourOfChoice}); font-size: 1.25rem; cursor: pointer;">
                    </div>
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-dark-card border border-dark-border rounded text-xs text-white opacity-0 group-hover/diff:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        ${diff.DiffName} - ${sr}★
                    </div>
                </div>
            `);
        };

        mapSection += `
                            ${diffsHTML.reverse().join("\n")}
                        </div>
                    </div>

                    <!-- Download Buttons -->
                    <div class="flex flex-wrap gap-2 pt-3 border-t border-dark-border">
        `;

        for (const source of sources) {
            mapSection += `
                        <a href="${source.mirror + String(beatmap.SetID)}"
                           title="Download from ${source.name}"
                           class="flex-1 px-3 py-2 bg-dark-bg hover:bg-primary/20 border border-dark-border hover:border-primary rounded-lg text-center text-xs text-gray-300 hover:text-white transition-all">
                            <i class="fas fa-download mr-1"></i>
                            <span class="hidden sm:inline">${source.name}</span>
                        </a>
            `;
        };

        mapSection += `
                    </div>
                </div>
            </div>
        `;

        document.querySelector("#maps").innerHTML += mapSection;
    };
};

window.onscroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight && document.querySelectorAll(".map").length > 0) {
        search(searchSettings, 20, true);
    };
};

window.onload = () => {
    buttons();

    search(searchSettings, 0, false);
};
