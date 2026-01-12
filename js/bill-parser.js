// Bill parsing and rendering

import { isStampDate, isAllCapsShort, isSafeUrl, getHeadingId } from './utils.js';

const STAMP_HEADINGS = new Set(["RECEIVED"]);
const STAMP_LINES = new Set(["INITIATIVE COORDINATOR", "ATTORNEY GENERAL'S OFFICE"]);

export function parseBill(text) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const letterBlocks = [];
    const billBlocks = [];
    let paragraph = [];
    let skipStampBlock = false;
    let foundActTitle = false;

    const flushParagraph = (targetBlocks) => {
        if (!paragraph.length) {
            return;
        }
        const joined = paragraph.join(" ").replace(/\s+/g, " ").trim();
        if (joined) {
            targetBlocks.push({ kind: "p", text: joined });
        }
        paragraph = [];
    };

    for (const line of lines) {
        const trimmed = line.trim();
        const currentBlocks = foundActTitle ? billBlocks : letterBlocks;

        if (!trimmed) {
            flushParagraph(currentBlocks);
            continue;
        }

        const headingMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
        if (headingMatch) {
            flushParagraph(currentBlocks);
            const headingText = headingMatch[2].trim();
            const headingKey = headingText.toUpperCase();

            // Check if this is the main act title
            if (headingKey.includes("THE 2026 BILLIONAIRE TAX ACT")) {
                foundActTitle = true;
                billBlocks.push({
                    kind: "heading",
                    level: headingMatch[1].length,
                    text: headingText,
                    isActTitle: true,
                });
                continue;
            }

            if (STAMP_HEADINGS.has(headingKey)) {
                skipStampBlock = true;
                continue;
            }
            if (skipStampBlock && isStampDate(headingText)) {
                continue;
            }
            skipStampBlock = false;
            currentBlocks.push({
                kind: "heading",
                level: headingMatch[1].length,
                text: headingText,
            });
            continue;
        }

        if (skipStampBlock) {
            const stampKey = trimmed.toUpperCase();
            if (STAMP_LINES.has(stampKey) || isStampDate(trimmed) || isAllCapsShort(trimmed)) {
                flushParagraph(currentBlocks);
                continue;
            }
            skipStampBlock = false;
        }

        const imageMatch = /^!\[(.*?)\]\((.*?)\)$/.exec(trimmed);
        if (imageMatch) {
            flushParagraph(currentBlocks);
            currentBlocks.push({
                kind: "image",
                alt: imageMatch[1],
                src: imageMatch[2],
            });
            continue;
        }

        paragraph.push(trimmed);
    }

    flushParagraph(foundActTitle ? billBlocks : letterBlocks);
    return { letter: letterBlocks, bill: billBlocks };
}

function createParagraph(text) {
    const element = document.createElement("p");
    const match = /^\(([a-z0-9]+)\)\s+/i.exec(text);
    if (match) {
        element.classList.add("subsection");
        const label = document.createElement("span");
        label.className = "subsection-label";
        label.textContent = `(${match[1]})`;
        element.appendChild(label);
        element.appendChild(document.createTextNode(text.slice(match[0].length)));
        return element;
    }
    element.textContent = text;
    return element;
}

export function renderBlocks(blocks, container, tocList, slugCounts, nextFallbackId, startOrder = 0) {
    let order = startOrder;

    for (const block of blocks) {
        let element;

        if (block.kind === "heading") {
            const levelMap = { 1: "h2", 2: "h3", 3: "h4" };
            const tag = levelMap[block.level] || "h3";
            element = document.createElement(tag);
            element.textContent = block.text;

            // Apply special styling for the main act title
            if (block.isActTitle) {
                element.classList.add("act-title");
            }

            if (block.level <= 2) {
                const id = getHeadingId(block.text, slugCounts, nextFallbackId);
                element.id = id;
                const tocItem = document.createElement("li");
                const tocLink = document.createElement("a");
                tocLink.href = `#${id}`;
                tocLink.textContent = block.text;
                tocItem.appendChild(tocLink);
                tocList.appendChild(tocItem);
            }
        } else if (block.kind === "image") {
            // Skip images with unsafe URLs to prevent XSS
            if (!isSafeUrl(block.src)) {
                continue;
            }
            element = document.createElement("figure");
            const img = document.createElement("img");
            img.src = block.src;
            img.alt = block.alt || "Document image";
            img.loading = "lazy";
            img.addEventListener("error", () => {
                element.remove();
            });
            const caption = document.createElement("figcaption");
            caption.textContent = block.alt || "Referenced image";
            element.appendChild(img);
            element.appendChild(caption);
        } else {
            element = createParagraph(block.text);
        }

        order += 1;
        element.style.setProperty("--order", order);
        element.classList.add("reveal");
        container.appendChild(element);
    }

    return { order };
}
