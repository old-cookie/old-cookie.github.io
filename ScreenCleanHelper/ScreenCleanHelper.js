const cleanBtn = document.getElementById("cleanBtn");
let isCleanMode = false;

function exitCleanMode() {
    if (!isCleanMode) return;

    isCleanMode = false;
    document.body.classList.remove("clean-mode");

    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
    }

    if (cleanBtn) {
        cleanBtn.textContent = "Turn on Screen Clean";
    }
}

async function enterCleanMode() {
    if (isCleanMode) return;

    isCleanMode = true;
    document.body.classList.add("clean-mode");

    if (cleanBtn) {
        cleanBtn.textContent = "Screen Clean Active";
    }

    try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
    } catch (err) {
        console.warn("Fullscreen request failed:", err);
    }
}

cleanBtn?.addEventListener("click", async () => {
    if (isCleanMode) {
        exitCleanMode();
        return;
    }

    await enterCleanMode();
});

document.addEventListener("keydown", exitCleanMode, { passive: true });
document.addEventListener("pointerdown", exitCleanMode, { passive: true });
document.addEventListener("touchstart", exitCleanMode, { passive: true });


document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && isCleanMode) {
        exitCleanMode();
    }
});