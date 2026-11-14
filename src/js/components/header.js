import {
  USER_KEY,
  PAGE_TRAINER,
  PAGE_PROFILE,
  PAGE_LOGIN,
} from "../core/constants.js";

class CodeTypeHeader extends HTMLElement {
  connectedCallback() {
    this.style.display = "block";

    const mode = this.getAttribute("mode") || "trainer";
    const user = localStorage.getItem(USER_KEY) || "anonymous";
    const initial = (user.trim().charAt(0) || "?").toUpperCase();

    if (mode === "profile") {
      this.innerHTML = `
        <header class="header">
          <a class="logo" href="${PAGE_TRAINER}">code<span>type</span></a>
          <div class="header-actions">
            <a class="btn btn-ghost" href="${PAGE_TRAINER}">← trainer</a>
            <button class="btn btn-ghost danger" id="logout">log out</button>
          </div>
        </header>
      `;
      this.querySelector("#logout").addEventListener("click", () => {
        if (!confirm("Log out? Your results stay saved in this browser."))
          return;
        localStorage.removeItem(USER_KEY);
        location.replace(PAGE_LOGIN);
      });
      return;
    }

    this.innerHTML = `
      <header class="header">
        <div class="logo">code<span>type</span></div>
        <div class="stats">
          <div class="stat"><span class="label">wpm</span><span id="wpm" class="value">0</span></div>
          <div class="stat"><span class="label">accuracy</span><span id="acc" class="value">100%</span></div>
          <div class="stat"><span class="label">time</span><span id="time" class="value">0s</span></div>
        </div>
        <a class="user" href="${PAGE_PROFILE}" title="open profile">
          <span class="avatar" id="avatar">${initial}</span>
          <span id="user-name">${user}</span>
        </a>
      </header>
    `;
  }
}

customElements.define("codetype-header", CodeTypeHeader);
