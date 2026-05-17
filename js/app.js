import { calculatePreCane } from "./calculator.js";

function formatInches(n) {
  return `${n.toFixed(2)} inches`;
}

/** @param {HTMLFormElement} form */
function readForm(form) {
  const heightRaw = form.querySelector("#height-value")?.value ?? "";
  const weightRaw = form.querySelector("#weight-value")?.value ?? "";
  /** @type {HTMLInputElement | null} */
  const heightUnitEl = form.querySelector(
    'input[name="height_unit"]:checked',
  );
  /** @type {HTMLInputElement | null} */
  const weightUnitEl = form.querySelector(
    'input[name="weight_unit"]:checked',
  );
  const gripEl = form.querySelector("#grip-size");

  const totalHeight = Number(heightRaw);
  const weight = Number(weightRaw);
  const heightUnit =
    /** @type {'in' | 'cm'} */ (heightUnitEl?.value === "cm" ? "cm" : "in");
  const weightUnit =
    /** @type {'lbs' | 'kg'} */ (weightUnitEl?.value === "kg" ? "kg" : "lbs");
  const gripRaw = gripEl instanceof HTMLSelectElement ? gripEl.value : "";
  /** @type {'small' | 'medium' | 'large' | ''} */
  const gripSize =
    gripRaw === "small" || gripRaw === "medium" || gripRaw === "large"
      ? gripRaw
      : "";

  return {
    totalHeight,
    weight,
    heightUnit,
    weightUnit,
    gripSize,
  };
}

/** @param {string} message */
function setFormStatus(message) {
  const el = document.getElementById("form-status");
  if (!(el instanceof HTMLElement)) return;
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

/**
 * @param {ReturnType<typeof calculatePreCane>} result
 * @param {{ heightUnit: string; weightUnit: string }} units
 */
function renderResults(result, units) {
  const live = document.getElementById("results-live");
  const instructions = document.getElementById("results-instructions");
  const section = document.getElementById("results-section");

  if (!(live instanceof HTMLElement)) return;
  if (instructions instanceof HTMLElement) {
    instructions.hidden = true;
  }
  if (section instanceof HTMLElement) {
    section.setAttribute("aria-busy", "false");
  }

  const gripNote =
    result.gripSize === ""
      ? "Not specified"
      : result.gripSize.charAt(0).toUpperCase() + result.gripSize.slice(1);

  const reasonsList = result.pvcReasons
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join("");

  live.innerHTML = `
    <dl>
      <dt>Normalized height</dt><dd>${formatInches(result.heightIn)} (from ${units.heightUnit === "cm" ? "centimeters" : "inches"} input)</dd>
      <dt>Normalized weight</dt><dd>${result.weightLb.toFixed(2)} lb (from ${units.weightUnit === "kg" ? "kilograms" : "pounds"} input)</dd>
      <dt>Handle height (Leg A)</dt><dd>${formatInches(result.legAIn)}</dd>
      <dt>Preview distance (Leg B)</dt><dd>${formatInches(result.legBIn)}</dd>
      <dt>Shaft length (hypotenuse C)</dt><dd>${formatInches(result.shaftCIn)}</dd>
      <dt>Recommended PVC</dt><dd>Schedule 40, ${escapeHtml(result.pvcNominalInches)} inch nominal</dd>
      <dt>Grip size</dt><dd>${escapeHtml(gripNote)}</dd>
    </dl>
    <p class="sr-only">
      Frame legs: handle height ${result.legAIn.toFixed(2)} inches, preview distance
      ${result.legBIn.toFixed(2)} inches, main pipe hypotenuse
      ${result.shaftCIn.toFixed(2)} inches. Recommended Schedule 40 PVC nominal diameter
      ${result.pvcNominalInches} inches. ${result.pvcReasons.join(" ")}
    </p>
    <ul class="pvc-reasons" aria-label="PVC selection notes">
      ${reasonsList}
    </ul>
  `;
}

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initTheme() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    let currentTheme = document.documentElement.getAttribute("data-theme");
    if (!currentTheme) {
      currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("precane-theme", newTheme);
  });
}

function initModals() {
  const privacyModal = document.getElementById("privacy-modal");
  const legalModal = document.getElementById("legal-modal");
  const acceptPrivacy = document.getElementById("accept-privacy");
  const acceptLegal = document.getElementById("accept-legal");
  const openPrivacyBtn = document.getElementById("open-privacy");
  const openLegalBtn = document.getElementById("open-legal");

  if (!(privacyModal instanceof HTMLDialogElement) || !(legalModal instanceof HTMLDialogElement)) return;

  const hasAccepted = localStorage.getItem("precane-policies-accepted");

  if (!hasAccepted) {
    privacyModal.showModal();
  }

  acceptPrivacy?.addEventListener("click", () => {
    privacyModal.close();
    if (!hasAccepted) {
      legalModal.showModal();
    }
  });

  acceptLegal?.addEventListener("click", () => {
    legalModal.close();
    if (!hasAccepted) {
      localStorage.setItem("precane-policies-accepted", "true");
    }
  });

  openPrivacyBtn?.addEventListener("click", () => {
    privacyModal.showModal();
  });

  openLegalBtn?.addEventListener("click", () => {
    legalModal.showModal();
  });
}

function main() {
  initTheme();
  initModals();
  
  const form = document.getElementById("precane-form");
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setFormStatus("");

    const section = document.getElementById("results-section");
    if (section instanceof HTMLElement) {
      section.setAttribute("aria-busy", "true");
    }

    const data = readForm(form);
    if (!Number.isFinite(data.totalHeight) || data.totalHeight <= 0) {
      setFormStatus("Enter a valid height greater than zero.");
      if (section instanceof HTMLElement) {
        section.setAttribute("aria-busy", "false");
      }
      return;
    }
    if (!Number.isFinite(data.weight) || data.weight <= 0) {
      setFormStatus("Enter a valid weight greater than zero.");
      if (section instanceof HTMLElement) {
        section.setAttribute("aria-busy", "false");
      }
      return;
    }

    const result = calculatePreCane({
      totalHeight: data.totalHeight,
      heightUnit: data.heightUnit,
      weight: data.weight,
      weightUnit: data.weightUnit,
      gripSize: data.gripSize,
    });

    renderResults(result, {
      heightUnit: data.heightUnit,
      weightUnit: data.weightUnit,
    });
  });
}

main();
