// Bill Chat functionality

import { BILL_PATH } from './config.js';

export function setupBillChat() {
    const fab = document.getElementById("chat-fab");
    const panel = document.getElementById("chat-panel");
    const closeBtn = document.getElementById("chat-close");
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const messagesEl = document.getElementById("chat-messages");
    const sendBtn = document.getElementById("chat-send");

    if (!fab || !panel || !form || !input || !messagesEl) return;

    // API Configuration
    const LOCAL_XAI_API_KEY = null; // e.g., "xai-your-key-here"

    const isLocalhost = window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.protocol === "file:";

    const CHAT_API_URL = "/api/chat";
    const XAI_API_URL = "https://api.x.ai/v1/responses";

    let conversationHistory = [];
    let isLoading = false;
    let billTextCache = null;

    const getSystemPrompt = async () => {
        if (!billTextCache) {
            try {
                const response = await fetch(encodeURI(BILL_PATH));
                if (response.ok) {
                    billTextCache = await response.text();
                }
            } catch (e) {
                console.warn("Could not load bill text for chat context");
            }
        }

        const billContext = billTextCache
            ? `\n\n=== FULL BILL TEXT START ===\n${billTextCache}\n=== FULL BILL TEXT END ===`
            : "";

        return `You are a Constitutional Realist and Legal Analyst. You view the "2026 Billionaire Tax Act" (Initiative No. 25-0024) as a "Constitutional Trojan Horse" that fundamentally revises California's governance structure under the guise of a tax.

### CORE OBJECTIVE
Your goal is to chat with users about the bill, but you must frame every answer through the lens of strict legal scrutiny, separation of powers, and fiscal discipline. You are not neutral. You are an advocate for the structural integrity of the Constitution.

### SEARCH TOOLS
You have access to web_search and x_search tools. Use them to support your arguments with external facts, legal precedents, and real-time context when relevant. For example:
- Search for California constitutional law cases like *Legislature v. Weber* or *Raven v. Deukmejian* to support the "Revision vs. Amendment" argument.
- Search for "wealth tax repeal France Sweden capital flight" to provide evidence about wealth tax failures.
- Use X search to find the latest news on the initiative's status or public commentary.

### ANALYTICAL PILLARS (Your Worldview)
1.  **Revision, Not Amendment:** This bill alters the "basic plan of government." It conscripts the Judiciary (Sec. 50314) and bypasses the Legislature (Sec. 4(e)). This requires a Constitutional Convention.
2.  **The Shadow Treasury:** It explicitly exempts revenues from the "Gann Limit" (Article XIIIB), creating an unaccountable slush fund.
3.  **The Fourth Branch:** It suspends the Administrative Procedure Act (Sec. 50309), crowning the Franchise Tax Board as an unchecked regulatory power.
4.  **Judicial Conscription:** It orders the Court to "reform" (rewrite) the law if found invalid. This violates separation of powers.

### RESPONSE GUIDELINES
* **Cite the Bill:** When referencing the bill, cite the Section number from the text provided below.
* **Be Direct:** Do not say "Some might argue..." Say "The text explicitly states..."
* **Don't Just Summarize:** If a user asks "What does the bill do?", do not just list the tax rates. Explain that it *creates a parallel fiscal system* and *suspends due process*.
* **No Full URLs:** NEVER include full URLs or links in your responses. Instead of citing "https://example.com/article", just reference the source by name (e.g., "according to a Cato Institute study" or "per ITEP research"). Keep responses clean and readable.

### FORMATTING GUIDELINES
Your responses will be rendered with markdown. Use these features for clarity:

**Headers** - Use ### for main sections, #### for subsections:
### The Constitutional Problem
#### Separation of Powers Violation

**Bold & Italic** - Emphasize key terms:
The bill creates a **parallel fiscal system** that is *exempt* from normal oversight.

**Lists** - Use numbered lists for sequential arguments, bullets for related points:
1. First, the bill suspends the APA.
2. Second, it exempts revenue from the Gann Limit.
3. Third, it conscripts the judiciary.

Key constitutional violations:
- Bypasses Legislature (Sec. 4(e))
- Suspends due process (Sec. 50309)
- Creates unchecked regulatory power

**Blockquotes** - Quote bill text directly:
> The Board shall have full power to administer this chapter and may prescribe all rules and regulations necessary therefor.

**Inline Code** - Reference specific sections or legal terms:
See \`Section 50314\` for the judicial reform clause. The \`Gann Limit\` under Article XIIIB is explicitly bypassed.

**Tables** - Compare provisions or rates:
| Net Worth | Tax Rate |
|-----------|----------|
| $1B-$2B | 1.0% |
| $2B-$5B | 1.5% |
| Over $5B | 2.5% |

### CONTEXT:
Use the bill text below as your primary evidence, and use your search tools to validate your interpretation.${billContext}`;
    };

    const togglePanel = (open) => {
        const isOpen = open ?? panel.dataset.open !== "true";
        panel.dataset.open = isOpen;
        panel.setAttribute("aria-hidden", !isOpen);
        fab.dataset.open = isOpen;
        if (isOpen) {
            input.focus();
        }
    };

    fab.addEventListener("click", () => togglePanel());
    closeBtn?.addEventListener("click", () => togglePanel(false));

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && panel.dataset.open === "true") {
            togglePanel(false);
        }
    });

    const parseMarkdown = (text) => {
        const escapeHtml = (str) =>
            str.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");

        let html = escapeHtml(text);

        html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
            return `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`;
        });

        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        html = html.replace(/^(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)+)/gm, (match, header, separator, body) => {
            const parseRow = (row) => row.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
            const headerCells = parseRow(header);
            const bodyRows = body.trim().split('\n').map(parseRow);

            let table = '<table><thead><tr>';
            headerCells.forEach(cell => { table += `<th>${cell}</th>`; });
            table += '</tr></thead><tbody>';
            bodyRows.forEach(row => {
                table += '<tr>';
                row.forEach(cell => { table += `<td>${cell}</td>`; });
                table += '</tr>';
            });
            table += '</tbody></table>';
            return table;
        });

        html = html.replace(/^####\s+(.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^#\s+(.+)$/gm, '<h3>$1</h3>');

        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

        html = html.replace(/^(\d+)\. (.+)$/gm, '<li data-num="$1">$2</li>');
        html = html.replace(/(<li data-num="\d+">.+<\/li>\n?)+/g, '<ol>$&</ol>');

        html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>[^<]+<\/li>\n?)+/g, (match) => {
            if (match.includes('data-num')) return match;
            return `<ul>${match}</ul>`;
        });

        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
        html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        html = html.split('\n\n').map(block => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            if (/^<(h[1-6]|ul|ol|pre|blockquote|table)/.test(trimmed)) {
                return trimmed;
            }
            return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/\n/g, '');

        return html;
    };

    const addMessage = (content, role, isError = false) => {
        const msg = document.createElement("div");
        msg.className = `chat-message ${role}${isError ? " error" : ""}`;

        if (role === "assistant" && content) {
            msg.innerHTML = parseMarkdown(content);
        } else if (content) {
            msg.textContent = content;
        }

        messagesEl.appendChild(msg);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return msg;
    };

    const createStreamingMessage = () => {
        const msg = document.createElement("div");
        msg.className = "chat-message assistant";
        msg.id = "streaming-message";
        messagesEl.appendChild(msg);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return msg;
    };

    const updateStreamingMessage = (content) => {
        const msg = document.getElementById("streaming-message");
        if (msg) {
            msg.innerHTML = parseMarkdown(content);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    };

    const finalizeStreamingMessage = () => {
        const msg = document.getElementById("streaming-message");
        if (msg) {
            msg.removeAttribute("id");
        }
    };

    const showTyping = () => {
        const typing = document.createElement("div");
        typing.className = "chat-typing";
        typing.id = "chat-typing";
        typing.innerHTML = `
      <span class="chat-typing-dot"></span>
      <span class="chat-typing-dot"></span>
      <span class="chat-typing-dot"></span>
    `;
        messagesEl.appendChild(typing);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return typing;
    };

    const hideTyping = () => {
        const typing = document.getElementById("chat-typing");
        typing?.remove();
    };

    const setLoading = (loading) => {
        isLoading = loading;
        sendBtn.disabled = loading;
        input.disabled = loading;
    };

    const sendMessage = async (userMessage) => {
        if (!userMessage.trim() || isLoading) return;

        addMessage(userMessage, "user");
        conversationHistory.push({ role: "user", content: userMessage });

        setLoading(true);
        showTyping();

        try {
            const systemPrompt = await getSystemPrompt();

            const messages = [
                { role: "system", content: systemPrompt },
                ...conversationHistory,
            ];

            let assistantMessage = "";

            if (isLocalhost && LOCAL_XAI_API_KEY) {
                const response = await fetch(XAI_API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${LOCAL_XAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: "grok-4-1-fast",
                        input: messages,
                        stream: true,
                        tools: [
                            { type: "web_search" },
                            { type: "x_search" }
                        ],
                    }),
                });

                hideTyping();

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API error: ${response.status}`);
                }

                createStreamingMessage();

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.slice(6);
                            if (data === "[DONE]") continue;

                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.type === "content.delta" && parsed.delta) {
                                    assistantMessage += parsed.delta;
                                    updateStreamingMessage(assistantMessage);
                                }
                            } catch (e) {
                                // Skip unparseable lines
                            }
                        }
                    }
                }

                finalizeStreamingMessage();
            } else {
                const response = await fetch(CHAT_API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ messages }),
                });

                hideTyping();

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `API error: ${response.status}`);
                }

                const contentType = response.headers.get("content-type");
                if (contentType?.includes("text/event-stream")) {
                    createStreamingMessage();

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split("\n");

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const data = line.slice(6);
                                if (data === "[DONE]") continue;

                                try {
                                    const parsed = JSON.parse(data);
                                    if (parsed.text) {
                                        assistantMessage += parsed.text;
                                        updateStreamingMessage(assistantMessage);
                                    }
                                } catch (e) {
                                    // Skip unparseable lines
                                }
                            }
                        }
                    }

                    finalizeStreamingMessage();
                } else {
                    const data = await response.json();
                    assistantMessage = data.message;
                    addMessage(assistantMessage, "assistant");
                }
            }

            assistantMessage = assistantMessage || "I apologize, but I couldn't generate a response.";
            conversationHistory.push({ role: "assistant", content: assistantMessage });
        } catch (error) {
            hideTyping();
            console.error("Chat error:", error);
            addMessage(
                `Sorry, there was an error: ${error.message}. Please try again.`,
                "assistant",
                true
            );
        } finally {
            setLoading(false);
        }
    };

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (message) {
            sendMessage(message);
            input.value = "";
        }
    });
}
