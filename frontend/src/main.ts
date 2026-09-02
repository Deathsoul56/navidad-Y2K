import { PARTICIPANTS } from "./participants.js";

const API_URL = "https://v89wgv6tuf.execute-api.us-east-2.amazonaws.com/submit";

const RULES_HTML = `
  <p>Voy a repartir regalos, pero el sistema este año tendrá un componente de estrategia.
  Tendrán que mandar su link de regalo, solo 1 link por persona.</p>
  <p>Hay 2 montos máximos: uno general y otro por persona. ¿Cuánto es? Información clasificada.
  Si tu link pasa el monto por persona te tocará calcetín.</p>
  <p>El truco: el monto por persona es dinámico. Ejemplo: si tengo 100 pesos de presupuesto y 4
  participantes piden un regalo de 10 pesos (40 pesos gastados en total), un quinto participante
  podría pedir un regalo de hasta 60 pesos.</p>
  <p>Si todos piden un monto grande y decido comprarlos, la prioridad será por orden de llegada:
  los primeros links tendrán más posibilidad de ser elegidos.</p>
  <p>Tu única pista: este año estoy un poco más generoso, y quizás regalos que el año pasado
  fueron calcetín, este año sí pueden ser factibles.</p>
  <p><strong>Que comience el juego.</strong></p>
  <h3>Reglas y recomendaciones</h3>
  <ol>
    <li>NO HAY PREGUNTAS</li>
    <li>Preguntas = Calcetín</li>
    <li>Tienes 24 horas para mandar tu link</li>
    <li>1 link no son 2 links</li>
    <li>Más de 1 link = Calcetín</li>
    <li>Esto es una tiranía: si tus comportamientos no son los adecuados, tendrás calcetín</li>
  </ol>
`;

let selectedParticipant: string | null = null;

const stepParticipant = document.getElementById("step-participant") as HTMLElement;
const stepRules = document.getElementById("step-rules") as HTMLElement;
const stepForm = document.getElementById("step-form") as HTMLElement;
const participantList = document.getElementById("participant-list") as HTMLElement;
const rulesContent = document.getElementById("rules-content") as HTMLElement;
const acceptRulesBtn = document.getElementById("accept-rules-btn") as HTMLButtonElement;
const selectedParticipantLabel = document.getElementById(
  "selected-participant-label"
) as HTMLElement;
const linkForm = document.getElementById("link-form") as HTMLFormElement;
const linkInput = document.getElementById("link-input") as HTMLInputElement;
const formStatus = document.getElementById("form-status") as HTMLElement;
const sidebarItems = document.querySelectorAll<HTMLElement>(".sidebar-item");
const visitCounterEl = document.getElementById("visit-counter") as HTMLElement;

type Step = "participant" | "rules" | "form";
const STEP_ORDER: Step[] = ["participant", "rules", "form"];
const stepSections: Record<Step, HTMLElement> = {
  participant: stepParticipant,
  rules: stepRules,
  form: stepForm,
};

let currentStepIndex = 0;

// El sidebar solo permite retroceder a pasos ya recorridos, nunca saltar hacia adelante.
function updateSidebar(): void {
  for (const item of sidebarItems) {
    const idx = STEP_ORDER.indexOf(item.dataset.step as Step);
    const isActive = idx === currentStepIndex;
    const isUnlocked = idx < currentStepIndex;
    item.classList.toggle("active", isActive);
    item.classList.toggle("clickable", isUnlocked);
    item.classList.toggle("locked", !isActive && !isUnlocked);
    item.setAttribute("aria-disabled", String(!isUnlocked));
    item.tabIndex = isUnlocked ? 0 : -1;
    if (isActive) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  }
}

function showStep(step: Step): void {
  currentStepIndex = STEP_ORDER.indexOf(step);
  for (const [key, section] of Object.entries(stepSections) as [Step, HTMLElement][]) {
    section.classList.toggle("hidden", key !== step);
  }
  updateSidebar();
}

for (const item of sidebarItems) {
  item.addEventListener("click", () => {
    if (!item.classList.contains("clickable")) return;
    showStep(item.dataset.step as Step);
  });
  item.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && item.classList.contains("clickable")) {
      event.preventDefault();
      showStep(item.dataset.step as Step);
    }
  });
}

// Contador de visitas "de mentira" (guiño a los sitios de los 2000s), persistido en este navegador.
function renderVisitCounter(): void {
  const stored = Number(localStorage.getItem("visitCount") ?? "41");
  const next = stored + 1;
  localStorage.setItem("visitCount", String(next));
  visitCounterEl.textContent = String(next).padStart(6, "0");
}

function renderParticipants(): void {
  participantList.innerHTML = "";
  for (const name of PARTICIPANTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "participant-btn";
    btn.textContent = name;
    btn.addEventListener("click", () => selectParticipant(name));
    participantList.appendChild(btn);
  }
}

function selectParticipant(name: string): void {
  selectedParticipant = name;
  selectedParticipantLabel.textContent = name;
  rulesContent.innerHTML = RULES_HTML;
  showStep("rules");
}

acceptRulesBtn.addEventListener("click", () => {
  showStep("form");
});

function collectClientMeta(): Record<string, unknown> {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screen: `${screen.width}x${screen.height}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestampClient: new Date().toISOString(),
  };
}

linkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedParticipant) return;

  const link = linkInput.value.trim();
  const submitBtn = linkForm.querySelector("button[type=submit]") as HTMLButtonElement;
  submitBtn.disabled = true;
  formStatus.textContent = "Enviando...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant: selectedParticipant,
        link,
        clientMeta: collectClientMeta(),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}) as { error?: string });
      formStatus.textContent = data.error ?? "Ocurrió un error, intenta de nuevo.";
      submitBtn.disabled = false;
      return;
    }

    formStatus.textContent = "¡Link recibido! Feliz Navidad 🎁";
    linkInput.disabled = true;
  } catch {
    formStatus.textContent = "No se pudo conectar. Revisa tu internet e intenta de nuevo.";
    submitBtn.disabled = false;
  }
});

renderParticipants();
showStep("participant");
renderVisitCounter();
