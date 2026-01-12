// Utility functions

export function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
}

export function getHeadingId(text, slugCounts, nextFallbackId) {
    const base = slugify(text);
    if (!base) {
        return `section-${nextFallbackId()}`;
    }
    const count = (slugCounts.get(base) || 0) + 1;
    slugCounts.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
}

export function isStampDate(text) {
    return /^[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}$/.test(text);
}

export function isAllCapsShort(text) {
    return /^[A-Z\s'&-]+$/.test(text) && text.length <= 40;
}

export function isSafeUrl(url) {
    if (!url || typeof url !== "string") return false;
    const trimmed = url.trim().toLowerCase();
    // Block dangerous protocols
    if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) {
        return false;
    }
    // Allow relative URLs, http, https
    return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/") || !trimmed.includes(":");
}
