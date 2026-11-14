import { $ } from "../core/dom.js";
import {
  USER_KEY,
  NAME_KEY,
  SINCE_KEY,
  PAGE_TRAINER,
} from "../core/constants.js";

const existing = localStorage.getItem(USER_KEY);
const legacy = localStorage.getItem(NAME_KEY);

if (existing) {
  $("session-name").textContent = existing;
  $("session").classList.remove("hidden");
  $("form").classList.add("hidden");
} else if (legacy) {
  $("name").value = legacy;
}

$("switch").addEventListener("click", () => {
  $("session").classList.add("hidden");
  $("form").classList.remove("hidden");
  $("name").value = existing || "";
  $("name").focus();
  $("name").select();
});

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = $("name").value.trim().replace(/\s+/g, " ");
  if (raw.length < 1) {
    $("err").textContent = "nickname cannot be empty";
    return;
  }
  if (raw.length > 20) {
    $("err").textContent = "max 20 characters";
    return;
  }

  localStorage.setItem(USER_KEY, raw);
  localStorage.setItem(NAME_KEY, raw);
  if (!localStorage.getItem(SINCE_KEY)) {
    localStorage.setItem(SINCE_KEY, new Date().toISOString());
  }
  location.href = PAGE_TRAINER;
});
